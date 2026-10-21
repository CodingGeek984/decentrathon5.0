/**
 * History, Progress & Leaderboard Routes
 * История интервью, лидерборд, достижения, сертификаты
 */
const express = require("express");
const router = express.Router();
const db = require("../database");
const { CertificateGenerator, AchievementSystem, LeaderboardSystem } = require("../utils/utilities");

// === INTERVIEW HISTORY ===

// GET /api/progress/history/:candidateId — полная история интервью
router.get("/history/:candidateId", (req, res) => {
  try {
    const history = db
      .prepare("SELECT * FROM interview_history WHERE candidate_id = ? ORDER BY completed_at DESC")
      .all(req.params.candidateId);

    if (history.length === 0) {
      return res.json({
        total_interviews: 0,
        history: [],
        trends: {},
      });
    }

    // Вычисляем тренды
    const trends = {};
    const metrics = [
      "overall_score",
      "leadership_score",
      "communication_score",
      "initiative_score",
      "empathy_score",
      "creativity_score",
    ];

    metrics.forEach((metric) => {
      const scores = history.map((h) => h[metric]).filter((s) => s !== null);
      if (scores.length >= 2) {
        const change = scores[0] - scores[scores.length - 1];
        trends[metric] = {
          current: scores[0],
          change,
          percentage_change: Math.round((change / scores[scores.length - 1]) * 100),
        };
      }
    });

    res.json({
      total_interviews: history.length,
      history,
      trends,
      average_overall_score:
        Math.round(
          history.reduce((sum, h) => sum + (h.overall_score || 0), 0) / history.length,
        ) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/record-interview — сохранить результаты интервью
router.post("/record-interview", (req, res) => {
  try {
    const {
      candidateId,
      interview_type,
      overall_score,
      leadership_score,
      communication_score,
      initiative_score,
      empathy_score,
      creativity_score,
      summary,
      recommendations,
    } = req.body;

    const interviewId = require("uuid").v4();

    db.prepare(
      `INSERT INTO interview_history (id, candidate_id, interview_type, overall_score, leadership_score, communication_score, initiative_score, empathy_score, creativity_score, summary, recommendations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      interviewId,
      candidateId,
      interview_type,
      overall_score,
      leadership_score,
      communication_score,
      initiative_score,
      empathy_score,
      creativity_score,
      summary,
      recommendations,
    );

    res.json({ interview_id: interviewId, recorded: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === ACHIEVEMENTS & BADGES ===

// GET /api/progress/achievements/:candidateId — получить достижения
router.get("/achievements/:candidateId", (req, res) => {
  try {
    const achievements = AchievementSystem.getUserAchievements(req.params.candidateId);
    const totalAchievements = db
      .prepare("SELECT COUNT(*) as count FROM achievements")
      .get().count;

    res.json({
      unlocked: achievements,
      total_available: totalAchievements,
      progress_percentage: Math.round((achievements.length / totalAchievements) * 100),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/check-achievements/:candidateId — проверить новые достижения
router.post("/check-achievements/:candidateId", async (req, res) => {
  try {
    const stats = req.body;

    const newAchievements = await AchievementSystem.checkAndUnlockAchievements(
      req.params.candidateId,
      stats,
    );

    res.json({
      new_achievements: newAchievements,
      count: newAchievements.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === LEADERBOARD ===

// GET /api/progress/leaderboard — получить лидерборд
router.get("/leaderboard", (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    LeaderboardSystem.updateLeaderboard();

    const leaderboard = LeaderboardSystem.getLeaderboard(
      parseInt(limit),
      parseInt(offset),
    );
    const stats = LeaderboardSystem.getLeaderboardStats();

    res.json({
      leaderboard,
      total_candidates: stats.total_candidates,
      average_score: Math.round(stats.average_score),
      top_score: Math.round(stats.top_score),
      stats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/leaderboard/:candidateId — получить позицию кандидата
router.get("/leaderboard/:candidateId", (req, res) => {
  try {
    LeaderboardSystem.updateLeaderboard();

    const rank = LeaderboardSystem.getCandidateRank(req.params.candidateId);

    if (!rank) {
      return res.status(404).json({ error: "Candidate not in leaderboard" });
    }

    res.json(rank);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/skills-trend/:candidateId - тренд навыков по soft_skills
router.get("/skills-trend/:candidateId", (req, res) => {
  try {
    const { candidateId } = req.params;
    const days = parseInt(req.query.days, 10) || 30;

    const trend = db
      .prepare(
        `SELECT DATE(created_at) as date,
          AVG(communication_score) as communication,
          AVG(leadership_score) as leadership,
          AVG(problem_solving_score) as problem_solving,
          AVG(empathy_score) as empathy,
          AVG(adaptability_score) as adaptability,
          AVG(teamwork_score) as teamwork
        FROM soft_skills
        WHERE candidate_id = ?
          AND DATE(created_at) >= DATE('now', ? || ' days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC`,
      )
      .all(candidateId, `-${days}`);

    res.json({ success: true, trend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/peer-comparison/:candidateId - сравнение с коллегами
router.get("/peer-comparison/:candidateId", (req, res) => {
  try {
    const { candidateId } = req.params;

    const userStats = db
      .prepare(
        `SELECT AVG(overall_score) as avg_overall, AVG(leadership_score) as avg_leadership,
                AVG(communication_score) as avg_communication
         FROM interview_history
         WHERE candidate_id = ?`,
      )
      .get(candidateId);

    const globalStats = db
      .prepare(
        `SELECT AVG(overall_score) as avg_overall, AVG(leadership_score) as avg_leadership,
                AVG(communication_score) as avg_communication
         FROM interview_history`,
      )
      .get();

    const candidateCount = db
      .prepare('SELECT COUNT(DISTINCT candidate_id) as cnt FROM interview_history')
      .get().cnt;

    const userRank = LeaderboardSystem.getCandidateRank(candidateId) || { rank: null, total: candidateCount };

    res.json({
      success: true,
      comparison: {
        user_stats: {
          ...userStats,
          avg_overall_score: userStats.avg_overall || 0,
          avg_leadership_score: userStats.avg_leadership || 0,
          avg_communication_score: userStats.avg_communication || 0,
        },
        community_stats: {
          avg_overall_score: globalStats.avg_overall || 0,
          avg_leadership_score: globalStats.avg_leadership || 0,
          avg_communication_score: globalStats.avg_communication || 0,
          candidate_count: candidateCount,
        },
        ranking: userRank,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === CERTIFICATES ===

// POST /api/progress/certificate/:candidateId — генерировать сертификат
router.post("/certificate/:candidateId", async (req, res) => {
  try {
    const analysisResults = req.body;

    const certificate = await CertificateGenerator.generateCertificate(
      req.params.candidateId,
      analysisResults,
    );

    res.json(certificate);
  } catch (err) {
    console.error("Certificate generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/certificate/:candidateId — получить сертификат
router.get("/certificate/:candidateId", (req, res) => {
  try {
    const certificate = CertificateGenerator.getCertificate(req.params.candidateId);

    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    res.json(certificate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === OVERALL PROGRESS ===

// GET /api/progress/dashboard/:candidateId — полный дашборд прогресса
router.get("/dashboard/:candidateId", (req, res) => {
  try {
    // История интервью
    const interviews = db
      .prepare(
        "SELECT COUNT(*) as count, AVG(overall_score) as avg_score FROM interview_history WHERE candidate_id = ?",
      )
      .get(req.params.candidateId);

    // Достижения
    const achievements = AchievementSystem.getUserAchievements(req.params.candidateId);

    // Позиция в лидерборде
    LeaderboardSystem.updateLeaderboard();
    const leaderboardRank = LeaderboardSystem.getCandidateRank(req.params.candidateId);

    // Soft skills
    const softSkills = db
      .prepare(
        "SELECT skill_name, MAX(score) as best_score FROM soft_skills WHERE candidate_id = ? GROUP BY skill_name",
      )
      .all(req.params.candidateId);

    // Кейсы
    const cases = db
      .prepare(
        "SELECT COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct FROM user_case_results WHERE candidate_id = ?",
      )
      .get(req.params.candidateId);

    res.json({
      interviews: {
        total: interviews.count,
        average_score: Math.round(interviews.avg_score || 0),
      },
      achievements: {
        unlocked: achievements.length,
        total_available: db
          .prepare("SELECT COUNT(*) as count FROM achievements")
          .get().count,
      },
      leaderboard: leaderboardRank || { rank: null, total_score: 0 },
      soft_skills: softSkills,
      cases: {
        total: cases.total,
        correct: cases.correct,
        accuracy: cases.total > 0 ? Math.round((cases.correct / cases.total) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
