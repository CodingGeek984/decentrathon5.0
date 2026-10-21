const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { generateCompositeScore } = require('../scoring/compositeScoring');

const router = express.Router();

// POST /api/student/apply — submit application
router.post('/apply', (req, res) => {
  const id = uuidv4();
  const {
    full_name, age, city, school, grade, email, phone, gpa,
    achievements, extracurriculars, leadership_roles,
    essay_motivation, essay_leadership, essay_goals,
  } = req.body;

  if (!full_name) return res.status(400).json({ error: 'Имя обязательно' });
  if (!email) return res.status(400).json({ error: 'Email обязателен' });
  if (!essay_motivation) return res.status(400).json({ error: 'Эссе о мотивации обязательно' });

  // Check duplicate email
  const existing = db.prepare('SELECT id FROM candidates WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Заявка с этим email уже существует', candidateId: existing.id });

  db.prepare(`
    INSERT INTO candidates (id, full_name, age, city, school, grade, email, phone, gpa,
      achievements, extracurriculars, leadership_roles,
      essay_motivation, essay_leadership, essay_goals)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, full_name, age || null, city || null, school || null, grade || null,
    email, phone || null, gpa || null,
    JSON.stringify(achievements || []),
    JSON.stringify(extracurriculars || []),
    JSON.stringify(leadership_roles || []),
    essay_motivation, essay_leadership || null, essay_goals || null
  );

  // Auto-score
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
  const result = generateCompositeScore(candidate);
  saveCompositeScore(id, result);

  res.status(201).json({ candidateId: id, message: 'Заявка принята!' });
});

// GET /api/student/status/:email — check application status by email
router.get('/status/:email', (req, res) => {
  const candidate = db.prepare(
    'SELECT c.id, c.full_name, c.status, c.created_at, cs.total_score FROM candidates c LEFT JOIN composite_scores cs ON c.id = cs.candidate_id WHERE c.email = ?'
  ).get(req.params.email);

  if (!candidate) return res.status(404).json({ error: 'Заявка не найдена' });

  const statusLabels = {
    pending: 'Заявка принята и ожидает рассмотрения',
    reviewed: 'Заявка рассмотрена комиссией',
    shortlisted: 'Вы в шорт-листе! Ожидайте приглашение',
    accepted: 'Поздравляем! Вы приняты в inVision U',
    rejected: 'К сожалению, ваша заявка отклонена',
  };

  const interviewStats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM interview_messages WHERE candidate_id = ?) AS text_message_count,
      (SELECT COUNT(*) FROM ai_analyses WHERE candidate_id = ? AND type = 'interview_summary') AS has_text_summary,
      (SELECT status FROM video_interviews WHERE candidate_id = ?) AS video_status
  `).get(candidate.id, candidate.id, candidate.id);

  res.json({
    id: candidate.id,
    name: candidate.full_name,
    status: candidate.status,
    statusLabel: statusLabels[candidate.status] || candidate.status,
    appliedAt: candidate.created_at,
    interview: {
      textStarted: interviewStats.text_message_count > 0,
      textCompleted: interviewStats.has_text_summary > 0,
      videoStatus: interviewStats.video_status || 'not_started',
      canStartVideo: interviewStats.has_text_summary > 0,
    },
  });
});

// GET /api/student/profile/:id — candidate's own profile view (limited)
router.get('/profile/:id', (req, res) => {
  const candidate = db.prepare(
    'SELECT id, full_name, age, city, school, grade, status, created_at FROM candidates WHERE id = ?'
  ).get(req.params.id);

  if (!candidate) return res.status(404).json({ error: 'Кандидат не найден' });

  const hasInterview = db.prepare(
    'SELECT COUNT(*) as count FROM interview_messages WHERE candidate_id = ?'
  ).get(req.params.id);

  const textSummary = db.prepare(
    "SELECT result, created_at FROM ai_analyses WHERE candidate_id = ? AND type = 'interview_summary'"
  ).get(req.params.id);

  const videoInterview = db.prepare(
    'SELECT status, completed_at FROM video_interviews WHERE candidate_id = ?'
  ).get(req.params.id);

  res.json({
    ...candidate,
    interviewStarted: hasInterview.count > 0,
    interviewMessageCount: hasInterview.count,
    interviewCompleted: !!textSummary,
    interviewSummary: textSummary ? JSON.parse(textSummary.result) : null,
    videoInterviewStatus: videoInterview?.status || 'not_started',
    videoInterviewCompleted: videoInterview?.status === 'completed',
    videoInterviewResult: null,
  });
});

function saveCompositeScore(candidateId, result) {
  db.prepare(`
    INSERT INTO composite_scores (candidate_id, total_score, recommendation, summary,
      ai_detection_flag, growth_trajectory, leadership_potential, motivation_score, authenticity_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(candidate_id) DO UPDATE SET
      total_score = excluded.total_score, recommendation = excluded.recommendation,
      summary = excluded.summary, ai_detection_flag = excluded.ai_detection_flag,
      growth_trajectory = excluded.growth_trajectory, leadership_potential = excluded.leadership_potential,
      motivation_score = excluded.motivation_score, authenticity_score = excluded.authenticity_score,
      updated_at = datetime('now')
  `).run(
    candidateId, result.totalScore, result.recommendation, result.summary,
    result.aiDetection?.score || 0, result.growthTrajectory || 0,
    result.leadershipPotential || 0, result.motivationScore || 0,
    result.authenticityScore || 0
  );
}

module.exports = router;
