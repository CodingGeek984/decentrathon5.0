const express = require('express');
const router = express.Router();
const SoftSkillsAnalyzer = require('../ai/softSkillsAnalyzer');
const db = require('../database');

// Инициализация анализатора навыков
const skillsAnalyzer = new SoftSkillsAnalyzer(process.env.GEMINI_API_KEY);

// Анализировать текст на soft skills
router.post('/analyze/text', async (req, res) => {
  try {
    const { text, context = 'interview', userId } = req.body;

    if (!text || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Text and userId are required'
      });
    }

    // Анализировать текст
    const analysis = await skillsAnalyzer.analyzeText(text, context);

    // Сохранить анализ в базу данных
    const stmt = db.prepare(`
      INSERT INTO soft_skills_analysis (
        id, user_id, analysis_type, content, analysis_result,
        overall_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      analysisId,
      userId,
      'text',
      text,
      JSON.stringify(analysis),
      analysis.overall_score,
      new Date().toISOString()
    );

    // Обновить навыки пользователя
    await updateUserSkills(userId, analysis);

    res.json({
      success: true,
      analysis: analysis,
      analysisId: analysisId
    });
  } catch (error) {
    console.error('Error analyzing text:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze text'
    });
  }
});

// Анализировать транскрипт видео
router.post('/analyze/video', async (req, res) => {
  try {
    const { transcript, videoMetadata, userId } = req.body;

    if (!transcript || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Transcript and userId are required'
      });
    }

    // Анализировать транскрипт
    const analysis = await skillsAnalyzer.analyzeVideoTranscript(transcript, videoMetadata);

    // Сохранить анализ
    const stmt = db.prepare(`
      INSERT INTO video_analysis (
        id, user_id, transcript, analysis_result, overall_score,
        communication_score, confidence_score, empathy_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const analysisId = `video_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      analysisId,
      userId,
      transcript,
      JSON.stringify(analysis),
      analysis.overall_score || 0,
      analysis.communication_score || 0,
      analysis.confidence_score || 0,
      analysis.empathy_score || 0,
      new Date().toISOString()
    );

    // Обновить навыки пользователя
    const textAnalysis = {
      skills_analysis: {
        communication: { score: analysis.communication_score || 0 },
        leadership: { score: analysis.confidence_score || 0 },
        empathy: { score: analysis.empathy_score || 0 }
      }
    };
    await updateUserSkills(userId, textAnalysis);

    res.json({
      success: true,
      analysis: analysis,
      analysisId: analysisId
    });
  } catch (error) {
    console.error('Error analyzing video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze video'
    });
  }
});

// Анализировать поведенческие ответы
router.post('/analyze/behavioral', async (req, res) => {
  try {
    const { answers, userId } = req.body;

    if (!answers || !Array.isArray(answers) || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Answers array and userId are required'
      });
    }

    // Анализировать ответы
    const analysis = await skillsAnalyzer.analyzeBehavioralAnswers(answers);

    // Сохранить анализ
    const stmt = db.prepare(`
      INSERT INTO soft_skills_analysis (
        id, user_id, analysis_type, content, analysis_result,
        overall_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const analysisId = `behavioral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      analysisId,
      userId,
      'behavioral',
      JSON.stringify(answers),
      JSON.stringify(analysis),
      analysis.skill_scores ? Object.values(analysis.skill_scores).reduce((sum, score) => sum + score, 0) / Object.keys(analysis.skill_scores).length : 0,
      new Date().toISOString()
    );

    // Обновить навыки пользователя
    const textAnalysis = {
      skills_analysis: analysis.skill_scores || {}
    };
    await updateUserSkills(userId, textAnalysis);

    res.json({
      success: true,
      analysis: analysis,
      analysisId: analysisId
    });
  } catch (error) {
    console.error('Error analyzing behavioral answers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze behavioral answers'
    });
  }
});

// Получить навыки пользователя
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const stmt = db.prepare('SELECT * FROM soft_skills WHERE user_id = ?');
    const skills = stmt.get(userId);

    if (!skills) {
      return res.json({
        success: true,
        skills: null,
        message: 'No skills data found for user'
      });
    }

    // Рассчитать средний балл
    const skillValues = [
      skills.leadership, skills.communication, skills.empathy,
      skills.creativity, skills.adaptability, skills.teamwork
    ].filter(val => val !== null && val !== undefined);

    const averageScore = skillValues.length > 0
      ? Math.round(skillValues.reduce((sum, val) => sum + val, 0) / skillValues.length)
      : 0;

    res.json({
      success: true,
      skills: {
        ...skills,
        average_score: averageScore
      }
    });
  } catch (error) {
    console.error('Error getting user skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user skills'
    });
  }
});

// Получить историю анализа навыков
router.get('/user/:userId/history', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const stmt = db.prepare(`
      SELECT * FROM soft_skills_analysis
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const history = stmt.all(userId, parseInt(limit), parseInt(offset));

    // Парсим результаты анализа
    history.forEach(item => {
      item.analysis_result = JSON.parse(item.analysis_result || '{}');
      item.content = item.analysis_type === 'behavioral' ? JSON.parse(item.content || '[]') : item.content;
    });

    res.json({
      success: true,
      history: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error getting skills history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get skills history'
    });
  }
});

// Сгенерировать план развития навыка
router.post('/development-plan', async (req, res) => {
  try {
    const { skill, currentLevel, targetLevel, userId } = req.body;

    if (!skill || currentLevel === undefined || targetLevel === undefined || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Skill, currentLevel, targetLevel, and userId are required'
      });
    }

    // Получить профиль пользователя
    const userStmt = db.prepare('SELECT * FROM candidates WHERE id = ?');
    const userProfile = userStmt.get(userId);

    // Сгенерировать план
    const plan = await skillsAnalyzer.generateSkillDevelopmentPlan(skill, currentLevel, targetLevel, userProfile);

    // Сохранить план
    const stmt = db.prepare(`
      INSERT INTO coaching_sessions (
        id, user_id, session_type, content, plan_data,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      planId,
      userId,
      'skill_development',
      `Development plan for ${skill}`,
      JSON.stringify(plan),
      'active',
      new Date().toISOString()
    );

    res.json({
      success: true,
      plan: plan,
      planId: planId
    });
  } catch (error) {
    console.error('Error generating development plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate development plan'
    });
  }
});

// Сравнить прогресс навыков
router.post('/compare-progress', async (req, res) => {
  try {
    const { userId, baselineAnalysisId, currentAnalysisId } = req.body;

    if (!userId || !baselineAnalysisId || !currentAnalysisId) {
      return res.status(400).json({
        success: false,
        error: 'userId, baselineAnalysisId, and currentAnalysisId are required'
      });
    }

    // Получить анализы
    const stmt = db.prepare('SELECT * FROM soft_skills_analysis WHERE id = ? AND user_id = ?');
    const baselineAnalysis = stmt.get(baselineAnalysisId, userId);
    const currentAnalysis = stmt.get(currentAnalysisId, userId);

    if (!baselineAnalysis || !currentAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'One or both analyses not found'
      });
    }

    const baseline = JSON.parse(baselineAnalysis.analysis_result || '{}');
    const current = JSON.parse(currentAnalysis.analysis_result || '{}');

    // Сравнить прогресс
    const comparison = await skillsAnalyzer.compareSkillProgress(baseline, current);

    res.json({
      success: true,
      comparison: comparison,
      baseline_date: baselineAnalysis.created_at,
      current_date: currentAnalysis.created_at
    });
  } catch (error) {
    console.error('Error comparing progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare progress'
    });
  }
});

// Получить агрегированные оценки навыков
router.get('/user/:userId/aggregated', (req, res) => {
  try {
    const { userId } = req.params;

    // Получить все анализы пользователя
    const stmt = db.prepare(`
      SELECT analysis_result FROM soft_skills_analysis
      WHERE user_id = ? AND analysis_type IN ('text', 'behavioral')
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const analyses = stmt.all(userId).map(row => JSON.parse(row.analysis_result || '{}'));

    if (analyses.length === 0) {
      return res.json({
        success: true,
        aggregated: null,
        message: 'No analyses found for aggregation'
      });
    }

    // Агрегировать оценки
    const aggregated = skillsAnalyzer.aggregateSkillScores(analyses);

    res.json({
      success: true,
      aggregated: aggregated
    });
  } catch (error) {
    console.error('Error getting aggregated skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get aggregated skills'
    });
  }
});

// Анализировать динамику команды
router.post('/analyze/team-dynamics', async (req, res) => {
  try {
    const { teamInteractions, projectContext, userId } = req.body;

    if (!teamInteractions || !Array.isArray(teamInteractions) || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Team interactions array and userId are required'
      });
    }

    // Анализировать динамику команды
    const analysis = await skillsAnalyzer.analyzeTeamDynamics(teamInteractions, projectContext);

    // Сохранить анализ
    const stmt = db.prepare(`
      INSERT INTO soft_skills_analysis (
        id, user_id, analysis_type, content, analysis_result,
        overall_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const analysisId = `team_dynamics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      analysisId,
      userId,
      'team_dynamics',
      JSON.stringify({ teamInteractions, projectContext }),
      JSON.stringify(analysis),
      analysis.team_communication || 0,
      new Date().toISOString()
    );

    res.json({
      success: true,
      analysis: analysis,
      analysisId: analysisId
    });
  } catch (error) {
    console.error('Error analyzing team dynamics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze team dynamics'
    });
  }
});

// Получить топ навыков пользователя
router.get('/user/:userId/top-skills', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 3 } = req.query;

    const stmt = db.prepare('SELECT * FROM soft_skills WHERE user_id = ?');
    const skills = stmt.get(userId);

    if (!skills) {
      return res.json({
        success: true,
        topSkills: [],
        message: 'No skills data found'
      });
    }

    // Создать массив навыков с их значениями
    const skillArray = [
      { name: 'leadership', value: skills.leadership },
      { name: 'communication', value: skills.communication },
      { name: 'empathy', value: skills.empathy },
      { name: 'creativity', value: skills.creativity },
      { name: 'adaptability', value: skills.adaptability },
      { name: 'teamwork', value: skills.teamwork }
    ].filter(skill => skill.value !== null && skill.value !== undefined);

    // Отсортировать по убыванию и взять топ
    const topSkills = skillArray
      .sort((a, b) => b.value - a.value)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      topSkills: topSkills
    });
  } catch (error) {
    console.error('Error getting top skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top skills'
    });
  }
});

// Вспомогательная функция для обновления навыков пользователя
async function updateUserSkills(userId, analysis) {
  try {
    // Получить текущие навыки
    const selectStmt = db.prepare('SELECT * FROM soft_skills WHERE user_id = ?');
    const currentSkills = selectStmt.get(userId);

    const skillUpdates = {
      leadership: analysis.skills_analysis?.leadership?.score || analysis.skills_analysis?.leadership || 0,
      communication: analysis.skills_analysis?.communication?.score || analysis.skills_analysis?.communication || 0,
      empathy: analysis.skills_analysis?.empathy?.score || analysis.skills_analysis?.empathy || 0,
      creativity: analysis.skills_analysis?.creativity?.score || analysis.skills_analysis?.creativity || 0,
      adaptability: analysis.skills_analysis?.adaptability?.score || analysis.skills_analysis?.adaptability || 0,
      teamwork: analysis.skills_analysis?.teamwork?.score || analysis.skills_analysis?.teamwork || 0
    };

    if (currentSkills) {
      // Обновить существующие навыки (взвешенное среднее)
      const updateStmt = db.prepare(`
        UPDATE soft_skills
        SET leadership = ROUND((leadership + ?) / 2),
            communication = ROUND((communication + ?) / 2),
            empathy = ROUND((empathy + ?) / 2),
            creativity = ROUND((creativity + ?) / 2),
            adaptability = ROUND((adaptability + ?) / 2),
            teamwork = ROUND((teamwork + ?) / 2),
            updated_at = ?
        WHERE user_id = ?
      `);

      updateStmt.run(
        skillUpdates.leadership,
        skillUpdates.communication,
        skillUpdates.empathy,
        skillUpdates.creativity,
        skillUpdates.adaptability,
        skillUpdates.teamwork,
        new Date().toISOString(),
        userId
      );
    } else {
      // Создать новую запись
      const insertStmt = db.prepare(`
        INSERT INTO soft_skills (
          user_id, leadership, communication, empathy, creativity,
          adaptability, teamwork, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        userId,
        skillUpdates.leadership,
        skillUpdates.communication,
        skillUpdates.empathy,
        skillUpdates.creativity,
        skillUpdates.adaptability,
        skillUpdates.teamwork,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  } catch (error) {
    console.error('Error updating user skills:', error);
  }
}

module.exports = router;
