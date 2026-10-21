const express = require('express');
const router = express.Router();
const {
  InterviewerAgent,
  AnalyzerAgent,
  CoachAgent,
  PsychologistAgent
} = require('../ai/agents');
const db = require('../database');

// Инициализация AI агентов
const interviewerAgent = new InterviewerAgent(process.env.GEMINI_API_KEY);
const analyzerAgent = new AnalyzerAgent(process.env.GEMINI_API_KEY);
const coachAgent = new CoachAgent(process.env.GEMINI_API_KEY);
const psychologistAgent = new PsychologistAgent(process.env.GEMINI_API_KEY);

// Генерировать вопрос для интервью
router.post('/interviewer/question', async (req, res) => {
  try {
    const { candidateProfile, previousAnswers = [], difficulty = 'medium', sessionId } = req.body;

    if (!candidateProfile || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate profile and sessionId are required'
      });
    }

    // Сгенерировать вопрос
    const questionData = await interviewerAgent.generateQuestion(
      candidateProfile,
      previousAnswers,
      difficulty
    );

    // Сохранить вопрос в историю
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'interviewer',
      JSON.stringify({ candidateProfile, previousAnswers, difficulty }),
      JSON.stringify(questionData),
      JSON.stringify({ question_type: 'generated', difficulty }),
      new Date().toISOString()
    );

    res.json({
      success: true,
      question: questionData,
      conversationId: conversationId
    });
  } catch (error) {
    console.error('Error generating interview question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate interview question'
    });
  }
});

// Оценить ответ кандидата
router.post('/interviewer/evaluate', async (req, res) => {
  try {
    const { question, answer, candidateProfile, sessionId } = req.body;

    if (!question || !answer || !candidateProfile || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Question, answer, candidate profile, and sessionId are required'
      });
    }

    // Оценить ответ
    const evaluation = await interviewerAgent.evaluateAnswer(question, answer, candidateProfile);

    // Сохранить оценку
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'interviewer_evaluation',
      JSON.stringify({ question, answer }),
      JSON.stringify(evaluation),
      JSON.stringify({ evaluation_type: 'answer', score: evaluation.score }),
      new Date().toISOString()
    );

    // Сохранить в историю интервью
    const historyStmt = db.prepare(`
      INSERT INTO interview_history (
        id, candidate_id, question, answer, evaluation,
        score, skills_assessed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const historyId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    historyStmt.run(
      historyId,
      candidateProfile.id || sessionId,
      question.question || question,
      answer,
      JSON.stringify(evaluation),
      evaluation.score,
      JSON.stringify(evaluation.skills_assessed || []),
      new Date().toISOString()
    );

    res.json({
      success: true,
      evaluation: evaluation,
      conversationId: conversationId,
      historyId: historyId
    });
  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate answer'
    });
  }
});

// Анализировать профиль кандидата
router.post('/analyzer/profile', async (req, res) => {
  try {
    const { candidateData, sessionId } = req.body;

    if (!candidateData || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate data and sessionId are required'
      });
    }

    // Анализировать профиль
    const analysis = await analyzerAgent.analyzeProfile(candidateData);

    // Сохранить анализ
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'analyzer',
      JSON.stringify(candidateData),
      JSON.stringify(analysis),
      JSON.stringify({ analysis_type: 'profile', overall_score: analysis.overall_score }),
      new Date().toISOString()
    );

    // Обновить навыки кандидата
    await updateCandidateSkills(candidateData.id, analysis);

    res.json({
      success: true,
      analysis: analysis,
      conversationId: conversationId
    });
  } catch (error) {
    console.error('Error analyzing profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze profile'
    });
  }
});

// Проверить текст на генерацию ИИ
router.post('/analyzer/detect-ai', async (req, res) => {
  try {
    const { text, sessionId } = req.body;

    if (!text || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Text and sessionId are required'
      });
    }

    // Проверить на ИИ
    const detection = await analyzerAgent.detectAiGenerated(text);

    // Сохранить результат
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `ai_detect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'ai_detector',
      text,
      JSON.stringify(detection),
      JSON.stringify({ detection_type: 'ai_generated', probability: detection.ai_probability }),
      new Date().toISOString()
    );

    res.json({
      success: true,
      detection: detection,
      conversationId: conversationId
    });
  } catch (error) {
    console.error('Error detecting AI generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect AI generation'
    });
  }
});

// Сгенерировать план развития
router.post('/coach/development-plan', async (req, res) => {
  try {
    const {
      candidateProfile,
      currentSkills,
      targetSkills,
      sessionId
    } = req.body;

    if (!candidateProfile || !currentSkills || !targetSkills || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate profile, current skills, target skills, and sessionId are required'
      });
    }

    // Сгенерировать план
    const plan = await coachAgent.generateDevelopmentPlan(
      candidateProfile,
      currentSkills,
      targetSkills
    );

    // Сохранить план
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'coach',
      JSON.stringify({ currentSkills, targetSkills }),
      JSON.stringify(plan),
      JSON.stringify({ plan_type: 'development', duration_weeks: plan.duration_weeks }),
      new Date().toISOString()
    );

    // Сохранить в коучинг сессии
    const coachingStmt = db.prepare(`
      INSERT INTO coaching_sessions (
        id, user_id, session_type, content, plan_data,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const sessionId_coaching = `coaching_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    coachingStmt.run(
      sessionId_coaching,
      candidateProfile.id || sessionId,
      'development_plan',
      `Development plan for ${candidateProfile.name || 'candidate'}`,
      JSON.stringify(plan),
      'active',
      new Date().toISOString()
    );

    res.json({
      success: true,
      plan: plan,
      conversationId: conversationId,
      coachingSessionId: sessionId_coaching
    });
  } catch (error) {
    console.error('Error generating development plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate development plan'
    });
  }
});

// Получить персональный совет
router.post('/coach/personal-advice', async (req, res) => {
  try {
    const {
      skillArea,
      currentLevel,
      targetLevel,
      candidateProfile,
      sessionId
    } = req.body;

    if (!skillArea || currentLevel === undefined || targetLevel === undefined || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Skill area, current level, target level, and sessionId are required'
      });
    }

    // Получить совет
    const advice = await coachAgent.generatePersonalizedAdvice(
      skillArea,
      currentLevel,
      targetLevel,
      candidateProfile || {}
    );

    // Сохранить совет
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `advice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'coach_advice',
      JSON.stringify({ skillArea, currentLevel, targetLevel }),
      JSON.stringify(advice),
      JSON.stringify({ advice_type: 'personalized', skill: skillArea }),
      new Date().toISOString()
    );

    res.json({
      success: true,
      advice: advice,
      conversationId: conversationId
    });
  } catch (error) {
    console.error('Error generating personal advice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate personal advice'
    });
  }
});

// Анализировать тон речи
router.post('/psychologist/analyze-tone', async (req, res) => {
  try {
    const { text, sessionId } = req.body;

    if (!text || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Text and sessionId are required'
      });
    }

    // Анализировать тон
    const toneAnalysis = await psychologistAgent.analyzeTone(text);

    // Сохранить анализ
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `tone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'psychologist',
      text,
      JSON.stringify(toneAnalysis),
      JSON.stringify({ analysis_type: 'tone', confidence: toneAnalysis.confidence }),
      new Date().toISOString()
    );

    // Сохранить в анализ речи
    const speechStmt = db.prepare(`
      INSERT INTO speech_analysis (
        id, user_id, transcript, analysis_result, confidence_score,
        stress_level, enthusiasm_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const speechId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    speechStmt.run(
      speechId,
      sessionId, // Используем sessionId как user_id для простоты
      text,
      JSON.stringify(toneAnalysis),
      toneAnalysis.professionalism || 0,
      toneAnalysis.stress || 0,
      toneAnalysis.enthusiasm || 0,
      new Date().toISOString()
    );

    res.json({
      success: true,
      toneAnalysis: toneAnalysis,
      conversationId: conversationId,
      speechAnalysisId: speechId
    });
  } catch (error) {
    console.error('Error analyzing tone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tone'
    });
  }
});

// Анализировать эмоции на видео
router.post('/psychologist/analyze-video', async (req, res) => {
  try {
    const { videoDescription, transcript = '', sessionId } = req.body;

    if (!videoDescription || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Video description and sessionId are required'
      });
    }

    // Анализировать эмоции
    const emotionAnalysis = await psychologistAgent.analyzeVideoEmotions(videoDescription, transcript);

    // Сохранить анализ
    const stmt = db.prepare(`
      INSERT INTO ai_agent_conversations (
        id, session_id, agent_type, user_input, ai_response,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const conversationId = `video_emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    stmt.run(
      conversationId,
      sessionId,
      'psychologist_video',
      JSON.stringify({ videoDescription, transcript }),
      JSON.stringify(emotionAnalysis),
      JSON.stringify({ analysis_type: 'video_emotions', dominant_emotion: emotionAnalysis.dominant_emotion }),
      new Date().toISOString()
    );

    // Сохранить в видео анализ
    const videoStmt = db.prepare(`
      INSERT INTO video_analysis (
        id, user_id, video_description, transcript, analysis_result,
        overall_score, confidence_score, engagement_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    videoStmt.run(
      videoId,
      sessionId,
      videoDescription,
      transcript,
      JSON.stringify(emotionAnalysis),
      emotionAnalysis.emotions?.confidence || 0,
      emotionAnalysis.emotions?.sincerity || 0,
      emotionAnalysis.emotions?.engagement || 0,
      new Date().toISOString()
    );

    res.json({
      success: true,
      emotionAnalysis: emotionAnalysis,
      conversationId: conversationId,
      videoAnalysisId: videoId
    });
  } catch (error) {
    console.error('Error analyzing video emotions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze video emotions'
    });
  }
});

// Получить историю взаимодействий с агентом
router.get('/conversations/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agentType, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT * FROM ai_agent_conversations
      WHERE session_id = ?
    `;
    const params = [sessionId];

    if (agentType) {
      query += ' AND agent_type = ?';
      params.push(agentType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const conversations = stmt.all(...params);

    // Парсим JSON поля
    conversations.forEach(conv => {
      conv.user_input = JSON.parse(conv.user_input || '{}');
      conv.ai_response = JSON.parse(conv.ai_response || '{}');
      conv.metadata = JSON.parse(conv.metadata || '{}');
    });

    res.json({
      success: true,
      conversations: conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

// Получить статистику использования агентов
router.get('/stats/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    const stmt = db.prepare(`
      SELECT
        agent_type,
        COUNT(*) as interactions,
        AVG(CAST(metadata->>'$.score' AS INTEGER)) as avg_score,
        MAX(created_at) as last_interaction
      FROM ai_agent_conversations
      WHERE session_id = ?
      GROUP BY agent_type
    `);

    const stats = stmt.all(sessionId);

    // Парсим metadata для извлечения оценок
    stats.forEach(stat => {
      // Для некоторых типов агентов оценки могут быть в разных полях
      if (stat.agent_type === 'interviewer_evaluation') {
        const scoreStmt = db.prepare(`
          SELECT AVG(CAST(ai_response->>'$.score' AS INTEGER)) as avg_score
          FROM ai_agent_conversations
          WHERE session_id = ? AND agent_type = 'interviewer_evaluation'
        `);
        const scoreResult = scoreStmt.get(sessionId);
        stat.avg_score = scoreResult.avg_score;
      }
    });

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error getting agent stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent stats'
    });
  }
});

// Вспомогательная функция для обновления навыков кандидата
async function updateCandidateSkills(candidateId, analysis) {
  try {
    if (!analysis.skills_analysis) return;

    // Получить текущие навыки
    const selectStmt = db.prepare('SELECT * FROM soft_skills WHERE user_id = ?');
    const currentSkills = selectStmt.get(candidateId);

    const skillUpdates = {
      leadership: analysis.skills_analysis.leadership?.score || 0,
      communication: analysis.skills_analysis.communication?.score || 0,
      empathy: analysis.skills_analysis.empathy?.score || 0,
      creativity: analysis.skills_analysis.creativity?.score || 0,
      adaptability: analysis.skills_analysis.adaptability?.score || 0,
      teamwork: analysis.skills_analysis.teamwork?.score || 0
    };

    if (currentSkills) {
      // Обновить существующие навыки
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
        candidateId
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
        candidateId,
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
    console.error('Error updating candidate skills:', error);
  }
}

module.exports = router;
