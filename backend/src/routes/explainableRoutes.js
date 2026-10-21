const express = require('express');
const router = express.Router();
const db = require('../database');
const { AchievementSystem, CertificateGenerator, LeaderboardSystem } = require('../utils/utilities');

// Получить объяснение результата интервью
router.get('/explanation/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;

    // Получить данные интервью
    const interviewStmt = db.prepare(`
      SELECT i.*, c.title as case_title, c.problem, c.context, c.stakeholders
      FROM interview_history i
      LEFT JOIN game_cases c ON i.case_id = c.id
      WHERE i.id = ?
    `);
    const interview = interviewStmt.get(interviewId);

    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    // Получить оценки навыков
    const skillsStmt = db.prepare(`
      SELECT * FROM soft_skills
      WHERE user_id = ? AND created_at >= datetime(?, '-1 hour')
      ORDER BY created_at DESC LIMIT 1
    `);
    const skills = skillsStmt.get(interview.user_id, interview.created_at);

    // Получить AI анализ
    const analysisStmt = db.prepare(`
      SELECT * FROM ai_analyses
      WHERE candidate_id = ? AND type = 'interview_feedback'
      ORDER BY created_at DESC LIMIT 1
    `);
    const analysis = analysisStmt.get(interview.user_id);

    // Сгенерировать объяснение
    const explanation = {
      overall_score: interview.score,
      reasoning: {
        strengths: [],
        weaknesses: [],
        key_factors: [],
        recommendations: []
      },
      detailed_breakdown: {
        communication: skills?.communication_score || 0,
        leadership: skills?.leadership_score || 0,
        problem_solving: skills?.problem_solving_score || 0,
        empathy: skills?.empathy_score || 0,
        adaptability: skills?.adaptability_score || 0,
        teamwork: skills?.teamwork_score || 0
      },
      case_context: {
        title: interview.case_title,
        problem: interview.problem,
        context: interview.context,
        stakeholders: interview.stakeholders
      },
      user_responses: JSON.parse(interview.responses || '[]'),
      ai_feedback: analysis ? JSON.parse(analysis.result) : null
    };

    // Анализировать ответы и генерировать объяснение
    explanation.reasoning = generateExplanation(explanation);

    res.json({ success: true, explanation });
  } catch (error) {
    console.error('Error getting explanation:', error);
    res.status(500).json({ success: false, error: 'Failed to get explanation' });
  }
});

// Получить персональные рекомендации
router.get('/coach/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Получить последние оценки навыков
    const skillsStmt = db.prepare(`
      SELECT * FROM soft_skills
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 1
    `);
    const skills = skillsStmt.get(userId);

    // Получить историю интервью
    const historyStmt = db.prepare(`
      SELECT score, created_at FROM interview_history
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 10
    `);
    const history = historyStmt.all(userId);

    // Получить достижения
    const achievementsStmt = db.prepare(`
      SELECT ua.*, a.title, a.description
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.candidate_id = ?
      ORDER BY ua.unlocked_at DESC
    `);
    const achievements = achievementsStmt.all(userId);

    // Сгенерировать план развития
    const developmentPlan = generateDevelopmentPlan(skills, history, achievements);

    res.json({ success: true, coach: developmentPlan });
  } catch (error) {
    console.error('Error getting coach recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to get coach recommendations' });
  }
});

// Получить симуляторы решений
router.get('/simulators', async (req, res) => {
  try {
    const simulators = [
      {
        id: 'crisis_management',
        title: 'Управление кризисом',
        description: 'Симуляция управления командой во время кризиса',
        difficulty: 'medium',
        estimated_time: 15,
        scenarios: [
          {
            id: 'server_down',
            title: 'Сервер упал',
            description: 'Ваш основной сервер вышел из строя во время пикового трафика',
            choices: [
              {
                id: 'panic',
                text: 'Паниковать и винить команду',
                consequence: 'Мораль команды падает, доверие теряется',
                score_impact: -20,
                next_scenario: 'recovery'
              },
              {
                id: 'assess',
                text: 'Оценить ситуацию и скоординировать действия',
                consequence: 'Команда работает эффективно, проблема решена быстрее',
                score_impact: 15,
                next_scenario: 'communication'
              }
            ]
          }
        ]
      },
      {
        id: 'team_conflict',
        title: 'Конфликт в команде',
        description: 'Разрешение конфликта между ключевыми членами команды',
        difficulty: 'hard',
        estimated_time: 20,
        scenarios: [
          {
            id: 'personal_conflict',
            title: 'Личный конфликт',
            description: 'Два senior разработчика конфликтуют из-за технических решений',
            choices: [
              {
                id: 'ignore',
                text: 'Игнорировать конфликт',
                consequence: 'Конфликт эскалирует, продуктивность падает',
                score_impact: -25,
                next_scenario: 'escalation'
              },
              {
                id: 'mediate',
                text: 'Провести медиацию и найти компромисс',
                consequence: 'Команда находит лучшее решение, доверие растет',
                score_impact: 20,
                next_scenario: 'resolution'
              }
            ]
          }
        ]
      }
    ];

    res.json({ success: true, simulators });
  } catch (error) {
    console.error('Error getting simulators:', error);
    res.status(500).json({ success: false, error: 'Failed to get simulators' });
  }
});

// Сохранить результат симулятора
router.post('/simulators/:simulatorId/results', async (req, res) => {
  try {
    const { simulatorId } = req.params;
    const { userId, score, choices, feedback } = req.body;

    const stmt = db.prepare(`
      INSERT INTO simulator_results (user_id, simulator_id, score, choices, feedback, completed_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(userId, simulatorId, score, JSON.stringify(choices), feedback);

    res.json({ success: true, resultId: result.lastInsertRowid });
  } catch (error) {
    console.error('Error saving simulator result:', error);
    res.status(500).json({ success: false, error: 'Failed to save simulator result' });
  }
});

// Получить расширенную историю прогресса
router.get('/progress/:userId/detailed', async (req, res) => {
  try {
    const { userId } = req.params;

    // Получить все интервью с деталями
    const interviewsStmt = db.prepare(`
      SELECT
        i.*,
        c.title as case_title,
        c.category,
        JSON_GROUP_ARRAY(
          JSON_OBJECT('skill', s.skill_name, 'score', s.score)
        ) as skills_data
      FROM interview_history i
      LEFT JOIN game_cases c ON i.case_id = c.id
      LEFT JOIN soft_skills s ON s.user_id = i.user_id
        AND s.created_at >= datetime(i.created_at, '-1 hour')
        AND s.created_at <= datetime(i.created_at, '+1 hour')
      WHERE i.user_id = ?
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);
    const interviews = interviewsStmt.all(userId);

    // Получить тренды навыков
    const skillsTrendStmt = db.prepare(`
      SELECT
        DATE(created_at) as date,
        AVG(communication_score) as communication,
        AVG(leadership_score) as leadership,
        AVG(problem_solving_score) as problem_solving,
        AVG(empathy_score) as empathy,
        AVG(adaptability_score) as adaptability,
        AVG(teamwork_score) as teamwork
      FROM soft_skills
      WHERE user_id = ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);
    const skillsTrend = skillsTrendStmt.all(userId);

    // Получить достижения по времени
    const achievementsStmt = db.prepare(`
      SELECT ua.*, a.title, a.description, a.category
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.candidate_id = ?
      ORDER BY ua.unlocked_at DESC
    `);
    const achievements = achievementsStmt.all(userId);

    // Рассчитать метрики прогресса
    const progressMetrics = calculateProgressMetrics(interviews, skillsTrend, achievements);

    res.json({
      success: true,
      progress: {
        interviews: interviews.map(i => ({
          ...i,
          skills_data: JSON.parse(i.skills_data || '[]')
        })),
        skills_trend: skillsTrend,
        achievements,
        metrics: progressMetrics
      }
    });
  } catch (error) {
    console.error('Error getting detailed progress:', error);
    res.status(500).json({ success: false, error: 'Failed to get detailed progress' });
  }
});

// Вспомогательные функции
function generateExplanation(data) {
  const reasoning = {
    strengths: [],
    weaknesses: [],
    key_factors: [],
    recommendations: []
  };

  // Анализ сильных сторон
  Object.entries(data.detailed_breakdown).forEach(([skill, score]) => {
    if (score >= 80) {
      reasoning.strengths.push(`${skill}: ${score}/100 - отличный результат`);
    }
  });

  // Анализ слабых сторон
  Object.entries(data.detailed_breakdown).forEach(([skill, score]) => {
    if (score < 60) {
      reasoning.weaknesses.push(`${skill}: ${score}/100 - требует улучшения`);
    }
  });

  // Ключевые факторы
  if (data.user_responses.length > 0) {
    reasoning.key_factors.push('Анализ ответов показал хорошее понимание ситуации');
  }

  if (data.ai_feedback) {
    reasoning.key_factors.push('AI анализ подтвердил аутентичность ответов');
  }

  // Рекомендации
  reasoning.recommendations = [
    'Практикуйте больше кейсов для улучшения навыков',
    'Обратите внимание на слабые стороны в коммуникации',
    'Изучайте примеры успешных лидеров'
  ];

  return reasoning;
}

function generateDevelopmentPlan(skills, history, achievements) {
  const plan = {
    current_level: 'intermediate',
    focus_areas: [],
    action_items: [],
    timeline: '3_months',
    milestones: []
  };

  if (skills) {
    // Определить области для фокуса
    Object.entries(skills).forEach(([skill, score]) => {
      if (skill.endsWith('_score') && score < 70) {
        plan.focus_areas.push({
          skill: skill.replace('_score', ''),
          current_score: score,
          target_score: 80,
          priority: score < 50 ? 'high' : 'medium'
        });
      }
    });
  }

  // Сгенерировать действия
  plan.action_items = [
    {
      title: 'Еженедельная практика кейсов',
      description: 'Решайте минимум 3 кейса в неделю',
      frequency: 'weekly',
      duration: '2_months'
    },
    {
      title: 'Изучение лидерства',
      description: 'Читать книги и статьи о лидерстве',
      frequency: 'daily',
      duration: 'ongoing'
    },
    {
      title: 'Обратная связь',
      description: 'Просить фидбек от коллег и mentors',
      frequency: 'monthly',
      duration: 'ongoing'
    }
  ];

  // Вехи
  plan.milestones = [
    { title: 'Достичь среднего балла 75', timeframe: '1_month' },
    { title: 'Получить достижение "Мастер коммуникации"', timeframe: '2_months' },
    { title: 'Завершить 50 кейсов', timeframe: '3_months' }
  ];

  return plan;
}

function calculateProgressMetrics(interviews, skillsTrend, achievements) {
  const metrics = {
    total_interviews: interviews.length,
    average_score: 0,
    improvement_rate: 0,
    consistency_score: 0,
    skills_growth: {},
    achievements_count: achievements.length
  };

  if (interviews.length > 0) {
    metrics.average_score = interviews.reduce((sum, i) => sum + i.score, 0) / interviews.length;

    // Рассчитать улучшение
    if (interviews.length >= 2) {
      const recent = interviews.slice(0, 5).reduce((sum, i) => sum + i.score, 0) / Math.min(5, interviews.length);
      const older = interviews.slice(-5).reduce((sum, i) => sum + i.score, 0) / Math.min(5, interviews.length);
      metrics.improvement_rate = ((recent - older) / older) * 100;
    }
  }

  return metrics;
}

module.exports = router;