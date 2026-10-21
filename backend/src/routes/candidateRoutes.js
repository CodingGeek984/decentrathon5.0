const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { generateCompositeScore, rankCandidates } = require('../scoring/compositeScoring');

const router = express.Router();

// GET /api/candidates - list all candidates with optional filters
router.get('/', (req, res) => {
  const { status, search, sort, order } = req.query;

  let query = 'SELECT c.*, cs.total_score, cs.recommendation, cs.rank FROM candidates c LEFT JOIN composite_scores cs ON c.id = cs.candidate_id WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (c.full_name LIKE ? OR c.city LIKE ? OR c.school LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const validSorts = ['total_score', 'full_name', 'created_at', 'rank', 'age', 'gpa'];
  const sortField = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortField === 'total_score' || sortField === 'rank' ? 'cs.' + sortField : 'c.' + sortField} ${sortOrder}`;

  const candidates = db.prepare(query).all(...params);
  res.json(candidates);
});

// GET /api/candidates/stats - dashboard statistics
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM candidates GROUP BY status').all();
  const avgScore = db.prepare('SELECT AVG(total_score) as avg, MIN(total_score) as min, MAX(total_score) as max FROM composite_scores').get();
  const byRecommendation = db.prepare('SELECT recommendation, COUNT(*) as count FROM composite_scores GROUP BY recommendation').all();
  const scoreDistribution = db.prepare(`
    SELECT
      CASE
        WHEN total_score >= 80 THEN '80-100'
        WHEN total_score >= 60 THEN '60-79'
        WHEN total_score >= 40 THEN '40-59'
        WHEN total_score >= 20 THEN '20-39'
        ELSE '0-19'
      END as range,
      COUNT(*) as count
    FROM composite_scores GROUP BY range ORDER BY range DESC
  `).all();

  res.json({
    total: total.count,
    byStatus,
    avgScore: avgScore.avg ? Math.round(avgScore.avg * 10) / 10 : 0,
    minScore: avgScore.min || 0,
    maxScore: avgScore.max || 0,
    byRecommendation,
    scoreDistribution,
  });
});

// GET /api/candidates/ranking - ranked list
router.get('/ranking', (req, res) => {
  const candidates = db.prepare(`
    SELECT c.*, cs.total_score, cs.recommendation, cs.rank, cs.summary,
           cs.leadership_potential, cs.growth_trajectory, cs.motivation_score,
           cs.authenticity_score, cs.ai_detection_flag
    FROM candidates c
    JOIN composite_scores cs ON c.id = cs.candidate_id
    ORDER BY cs.total_score DESC
  `).all();
  res.json(candidates);
});

// GET /api/candidates/:id - single candidate with full score breakdown
router.get('/:id', (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Кандидат не найден' });

  const scores = db.prepare('SELECT * FROM scores WHERE candidate_id = ? ORDER BY dimension').all(req.params.id);
  const composite = db.prepare('SELECT * FROM composite_scores WHERE candidate_id = ?').get(req.params.id);
  const reviews = db.prepare('SELECT * FROM committee_reviews WHERE candidate_id = ? ORDER BY created_at DESC').all(req.params.id);
  const analyses = db.prepare('SELECT type, result, created_at FROM ai_analyses WHERE candidate_id = ? ORDER BY created_at DESC').all(req.params.id);
  const videoInterview = db.prepare('SELECT * FROM video_interviews WHERE candidate_id = ?').get(req.params.id);

  // Re-generate live analysis for detailed view
  const liveAnalysis = generateCompositeScore(candidate);

  res.json({
    ...candidate,
    achievements: safeParseJSON(candidate.achievements),
    extracurriculars: safeParseJSON(candidate.extracurriculars),
    leadership_roles: safeParseJSON(candidate.leadership_roles),
    scores,
    composite,
    reviews,
    liveAnalysis,
    analyses: analyses.reduce((acc, item) => {
      acc[item.type] = { ...safeParseObject(item.result), analyzed_at: item.created_at };
      return acc;
    }, {}),
    videoInterview: videoInterview ? {
      status: videoInterview.status,
      questions: safeParseJSON(videoInterview.question_set),
      transcript: safeParseJSON(videoInterview.transcript),
      emotionSummary: safeParseObject(videoInterview.emotion_summary),
      sessionMetrics: safeParseObject(videoInterview.session_metrics),
      result: safeParseObject(videoInterview.result),
      startedAt: videoInterview.started_at,
      completedAt: videoInterview.completed_at,
    } : null,
  });
});

// POST /api/candidates - create new candidate and auto-score
router.post('/', (req, res) => {
  const id = uuidv4();
  const {
    full_name, age, city, school, grade, email, phone, gpa,
    achievements, extracurriculars, leadership_roles,
    essay_motivation, essay_leadership, essay_goals, interview_notes
  } = req.body;

  if (!full_name) return res.status(400).json({ error: 'Имя обязательно' });

  const stmt = db.prepare(`
    INSERT INTO candidates (id, full_name, age, city, school, grade, email, phone, gpa,
      achievements, extracurriculars, leadership_roles,
      essay_motivation, essay_leadership, essay_goals, interview_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, full_name, age || null, city || null, school || null, grade || null,
    email || null, phone || null, gpa || null,
    JSON.stringify(achievements || []),
    JSON.stringify(extracurriculars || []),
    JSON.stringify(leadership_roles || []),
    essay_motivation || null, essay_leadership || null, essay_goals || null,
    interview_notes || null
  );

  // Auto-score
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
  const result = generateCompositeScore(candidate);
  saveCompositeScore(id, result);
  saveDimensionScores(id, result);

  res.status(201).json({ id, ...result });
});

// PUT /api/candidates/:id - update candidate
router.put('/:id', (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Кандидат не найден' });

  const fields = ['full_name', 'age', 'city', 'school', 'grade', 'email', 'phone', 'gpa',
    'essay_motivation', 'essay_leadership', 'essay_goals', 'interview_notes', 'status'];
  const arrayFields = ['achievements', 'extracurriculars', 'leadership_roles'];

  const updates = [];
  const values = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }
  for (const field of arrayFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(JSON.stringify(req.body[field]));
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });

  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);

  db.prepare(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  // Re-score
  const updated = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  const result = generateCompositeScore(updated);
  saveCompositeScore(req.params.id, result);
  saveDimensionScores(req.params.id, result);

  res.json({ id: req.params.id, ...result });
});

// POST /api/candidates/:id/review - add committee review
router.post('/:id/review', (req, res) => {
  const { reviewer_name, decision, comment } = req.body;
  if (!reviewer_name || !decision) {
    return res.status(400).json({ error: 'Имя ревьюера и решение обязательны' });
  }

  db.prepare(`
    INSERT INTO committee_reviews (candidate_id, reviewer_name, decision, comment)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, reviewer_name, decision, comment || null);

  res.status(201).json({ success: true });
});

// POST /api/candidates/:id/rescore - force rescore
router.post('/:id/rescore', (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Кандидат не найден' });

  const result = generateCompositeScore(candidate);
  saveCompositeScore(req.params.id, result);
  saveDimensionScores(req.params.id, result);

  res.json(result);
});

// POST /api/candidates/batch-score - rescore all candidates and update ranks
router.post('/batch-score', (req, res) => {
  const candidates = db.prepare('SELECT * FROM candidates').all();
  const ranked = rankCandidates(candidates);

  const updateRank = db.prepare('UPDATE composite_scores SET rank = ? WHERE candidate_id = ?');

  for (const item of ranked) {
    saveCompositeScore(item.candidate.id, item);
    saveDimensionScores(item.candidate.id, item);
    updateRank.run(item.rank, item.candidate.id);
  }

  res.json({ scored: ranked.length, ranking: ranked.map(r => ({
    id: r.candidate.id,
    name: r.candidate.full_name,
    score: r.totalScore,
    rank: r.rank,
    recommendation: r.recommendation,
  }))});
});

// DELETE /api/candidates/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Кандидат не найден' });
  res.json({ success: true });
});

// ---- Helpers ----

function saveCompositeScore(candidateId, result) {
  db.prepare(`
    INSERT INTO composite_scores (candidate_id, total_score, recommendation, summary,
      ai_detection_flag, growth_trajectory, leadership_potential, motivation_score, authenticity_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(candidate_id) DO UPDATE SET
      total_score = excluded.total_score,
      recommendation = excluded.recommendation,
      summary = excluded.summary,
      ai_detection_flag = excluded.ai_detection_flag,
      growth_trajectory = excluded.growth_trajectory,
      leadership_potential = excluded.leadership_potential,
      motivation_score = excluded.motivation_score,
      authenticity_score = excluded.authenticity_score,
      updated_at = datetime('now')
  `).run(
    candidateId, result.totalScore, result.recommendation, result.summary,
    result.aiDetection?.score || 0, result.growthTrajectory || 0,
    result.leadershipPotential || 0, result.motivationScore || 0,
    result.authenticityScore || 0
  );
}

function saveDimensionScores(candidateId, result) {
  db.prepare('DELETE FROM scores WHERE candidate_id = ?').run(candidateId);
  const insert = db.prepare(`
    INSERT INTO scores (candidate_id, dimension, score, max_score, explanation, factors)
    VALUES (?, ?, ?, 100, ?, ?)
  `);

  if (result.dimensions) {
    for (const [key, dim] of Object.entries(result.dimensions)) {
      insert.run(candidateId, key, dim.score, dim.label, JSON.stringify(dim.factors));
    }
  }
}

function safeParseJSON(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

function safeParseObject(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

module.exports = router;
