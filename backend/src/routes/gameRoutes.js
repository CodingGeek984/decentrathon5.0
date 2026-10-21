const express = require('express');
const router = express.Router();
const CaseGenerator = require('../ai/caseGenerator');
const { InterviewerAgent } = require('../ai/agents');
const db = require('../database');

// Инициализация AI компонентов
const caseGenerator = new CaseGenerator(process.env.GEMINI_API_KEY);
const interviewerAgent = new InterviewerAgent(process.env.GEMINI_API_KEY);

// Получить все доступные категории кейсов
router.get('/categories', (req, res) => {
  try {
    const categories = caseGenerator.getCaseCategories();
    res.json({
      success: true,
      categories: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error getting case categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get case categories'
    });
  }
});

// Сгенерировать новый кейс
router.post('/generate', async (req, res) => {
  try {
    const { category, difficulty = 'medium', targetSkills = [] } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    const caseData = await caseGenerator.generateCase(category, difficulty, targetSkills);

    // Сохранить кейс в базу данных
    const stmt = db.prepare(`
      INSERT INTO game_cases (
        id, title, description, problem, context, stakeholders,
        constraints, options, optimal_solution, skills_tested,
        difficulty, category, time_limit, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      caseData.id,
      caseData.title,
      caseData.description,
      caseData.problem,
      JSON.stringify(caseData.context || {}),
      JSON.stringify(caseData.stakeholders || []),
      JSON.stringify(caseData.constraints || []),
      JSON.stringify(caseData.options || []),
      caseData.optimal_solution || '',
      JSON.stringify(caseData.skills_tested || []),
      caseData.difficulty,
      caseData.category,
      caseData.time_limit || 15,
      caseData.created_at
    );

    res.json({
      success: true,
      case: caseData
    });
  } catch (error) {
    console.error('Error generating case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate case'
    });
  }
});

// Получить кейс по ID
router.get('/:caseId', (req, res) => {
  try {
    const { caseId } = req.params;

    const stmt = db.prepare('SELECT * FROM game_cases WHERE id = ?');
    const caseData = stmt.get(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    // Парсим JSON поля
    caseData.context = JSON.parse(caseData.context || '{}');
    caseData.stakeholders = JSON.parse(caseData.stakeholders || '[]');
    caseData.constraints = JSON.parse(caseData.constraints || '[]');
    caseData.options = JSON.parse(caseData.options || '[]');
    caseData.skills_tested = JSON.parse(caseData.skills_tested || '[]');

    res.json({
      success: true,
      case: caseData
    });
  } catch (error) {
    console.error('Error getting case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get case'
    });
  }
});

// Оценить решение кейса
router.post('/:caseId/evaluate', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { userId, solution, timeSpent } = req.body;

    if (!userId || !solution) {
      return res.status(400).json({
        success: false,
        error: 'User ID and solution are required'
      });
    }

    // Получить кейс
    const caseStmt = db.prepare('SELECT * FROM game_cases WHERE id = ?');
    const caseData = caseStmt.get(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    // Получить профиль пользователя
    const userStmt = db.prepare('SELECT * FROM candidates WHERE id = ?');
    const userProfile = userStmt.get(userId);

    // Оценить решение
    const evaluation = await caseGenerator.evaluateCaseSolution(caseId, solution, userProfile || {});

    // Сохранить результат
    const resultStmt = db.prepare(`
      INSERT INTO user_case_results (
        id, user_id, case_id, solution, evaluation, score,
        time_spent, completed_at, skills_improved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    resultStmt.run(
      resultId,
      userId,
      caseId,
      solution,
      JSON.stringify(evaluation),
      evaluation.overall_score,
      timeSpent || 0,
      new Date().toISOString(),
      JSON.stringify(evaluation.skills_improved || [])
    );

    // Обновить статистику пользователя
    this.updateUserStats(userId, evaluation);

    res.json({
      success: true,
      evaluation: evaluation,
      resultId: resultId
    });
  } catch (error) {
    console.error('Error evaluating case solution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate solution'
    });
  }
});

// Получить результаты пользователя
router.get('/user/:userId/results', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const stmt = db.prepare(`
      SELECT
        r.*,
        c.title as case_title,
        c.category,
        c.difficulty
      FROM user_case_results r
      JOIN game_cases c ON r.case_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.completed_at DESC
      LIMIT ? OFFSET ?
    `);

    const results = stmt.all(userId, parseInt(limit), parseInt(offset));

    // Парсим JSON поля
    results.forEach(result => {
      result.evaluation = JSON.parse(result.evaluation || '{}');
      result.skills_improved = JSON.parse(result.skills_improved || '[]');
    });

    res.json({
      success: true,
      results: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error getting user results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user results'
    });
  }
});

// Получить статистику пользователя
router.get('/user/:userId/stats', (req, res) => {
  try {
    const { userId } = req.params;

    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_cases,
        AVG(score) as avg_score,
        MAX(score) as best_score,
        SUM(time_spent) as total_time,
        COUNT(CASE WHEN score >= 80 THEN 1 END) as high_scores
      FROM user_case_results
      WHERE user_id = ?
    `);

    const stats = stmt.get(userId);

    // Получить распределение по категориям
    const categoryStmt = db.prepare(`
      SELECT
        c.category,
        COUNT(*) as count,
        AVG(r.score) as avg_score
      FROM user_case_results r
      JOIN game_cases c ON r.case_id = c.id
      WHERE r.user_id = ?
      GROUP BY c.category
    `);

    const categoryStats = categoryStmt.all(userId);

    res.json({
      success: true,
      stats: {
        ...stats,
        avg_score: Math.round((stats.avg_score || 0) * 100) / 100,
        best_score: stats.best_score || 0,
        total_time: stats.total_time || 0,
        high_scores: stats.high_scores || 0
      },
      category_breakdown: categoryStats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user stats'
    });
  }
});

// Сгенерировать адаптивный кейс для пользователя
router.post('/adaptive/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Получить профиль пользователя
    const userStmt = db.prepare('SELECT * FROM candidates WHERE id = ?');
    const userProfile = userStmt.get(userId);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Получить предыдущие результаты
    const resultsStmt = db.prepare(`
      SELECT evaluation, score FROM user_case_results
      WHERE user_id = ? ORDER BY completed_at DESC LIMIT 10
    `);

    const previousResults = resultsStmt.all(userId).map(row => ({
      evaluation: JSON.parse(row.evaluation || '{}'),
      score: row.score
    }));

    // Сгенерировать адаптивный кейс
    const caseData = await caseGenerator.generateAdaptiveCase(userProfile, previousResults);

    // Сохранить кейс
    const stmt = db.prepare(`
      INSERT INTO game_cases (
        id, title, description, problem, context, stakeholders,
        constraints, options, optimal_solution, skills_tested,
        difficulty, category, time_limit, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      caseData.id,
      caseData.title,
      caseData.description,
      caseData.problem,
      JSON.stringify(caseData.context || {}),
      JSON.stringify(caseData.stakeholders || []),
      JSON.stringify(caseData.constraints || []),
      JSON.stringify(caseData.options || []),
      caseData.optimal_solution || '',
      JSON.stringify(caseData.skills_tested || []),
      caseData.difficulty,
      caseData.category,
      caseData.time_limit || 15,
      caseData.created_at
    );

    res.json({
      success: true,
      case: caseData,
      adaptive_reason: `Adapted for user performance history (${previousResults.length} previous cases)`
    });
  } catch (error) {
    console.error('Error generating adaptive case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate adaptive case'
    });
  }
});

// Получить лидерборд по кейсам
router.get('/leaderboard', (req, res) => {
  try {
    const { category, limit = 10 } = req.query;

    let query = `
      SELECT
        u.id,
        u.name,
        COUNT(r.id) as cases_completed,
        AVG(r.score) as avg_score,
        MAX(r.score) as best_score,
        SUM(r.time_spent) as total_time
      FROM candidates u
      JOIN user_case_results r ON u.id = r.user_id
    `;

    const params = [];

    if (category) {
      query += `
        JOIN game_cases c ON r.case_id = c.id
        WHERE c.category = ?
      `;
      params.push(category);
    }

    query += `
      GROUP BY u.id, u.name
      ORDER BY avg_score DESC, cases_completed DESC
      LIMIT ?
    `;

    params.push(parseInt(limit));

    const stmt = db.prepare(query);
    const leaderboard = stmt.all(...params);

    res.json({
      success: true,
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        ...entry,
        avg_score: Math.round(entry.avg_score * 100) / 100
      })),
      category: category || 'all'
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Вспомогательный метод для обновления статистики пользователя
function updateUserStats(userId, evaluation) {
  try {
    // Получить текущую статистику навыков
    const statsStmt = db.prepare('SELECT * FROM soft_skills WHERE user_id = ?');
    const currentStats = statsStmt.get(userId);

    if (currentStats) {
      // Обновить существующие навыки
      const updateStmt = db.prepare(`
        UPDATE soft_skills
        SET leadership = leadership + ?, communication = communication + ?,
            empathy = empathy + ?, creativity = creativity + ?,
            adaptability = adaptability + ?, teamwork = teamwork + ?,
            updated_at = ?
        WHERE user_id = ?
      `);

      updateStmt.run(
        evaluation.scores?.leadership || 0,
        evaluation.scores?.communication || 0,
        evaluation.scores?.empathy || 0,
        evaluation.scores?.creativity || 0,
        evaluation.scores?.adaptability || 0,
        evaluation.scores?.teamwork || 0,
        new Date().toISOString(),
        userId
      );
    } else {
      // Создать новую запись навыков
      const insertStmt = db.prepare(`
        INSERT INTO soft_skills (
          user_id, leadership, communication, empathy, creativity,
          adaptability, teamwork, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        userId,
        evaluation.scores?.leadership || 0,
        evaluation.scores?.communication || 0,
        evaluation.scores?.empathy || 0,
        evaluation.scores?.creativity || 0,
        evaluation.scores?.adaptability || 0,
        evaluation.scores?.teamwork || 0,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

module.exports = router;
