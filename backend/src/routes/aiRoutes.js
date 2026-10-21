const express = require("express");
const db = require("../database");
const ai = require("../ai/claude");
const { requireAdmin } = require("./authRoutes");

const router = express.Router();
const VIDEO_INTERVIEW_QUESTIONS = [
  "Расскажите о моменте, когда вы сознательно взяли на себя ответственность за других. Что именно вы сделали?",
  "Какой проект или инициатива лучше всего показывает, что вы умеете доводить идеи до результата?",
  "Вспомните ситуацию, когда что-то пошло не по плану. Как вы справились и чему научились?",
  "Почему именно inVision U подходит вам сейчас, и что вы хотите изменить вокруг себя через обучение здесь?",
];

// GET /api/ai/status — check if AI is configured
router.get("/status", requireAdmin, (req, res) => {
  res.json({ configured: ai.isConfigured() });
});

// POST /api/ai/analyze/:candidateId — deep AI analysis of candidate essays
router.post("/analyze/:candidateId", requireAdmin, async (req, res) => {
  if (!ai.isConfigured())
    return res
      .status(503)
      .json({ error: "AI API не настроен. Добавьте GEMINI_API_KEY в .env" });

  const candidate = db
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(req.params.candidateId);
  if (!candidate) return res.status(404).json({ error: "Кандидат не найден" });

  try {
    const analysis = await ai.analyzeEssaysDeep(candidate);

    // Save analysis to DB
    db.prepare(
      `
      INSERT INTO ai_analyses (candidate_id, type, result)
      VALUES (?, 'essay_deep', ?)
      ON CONFLICT(candidate_id, type) DO UPDATE SET
        result = excluded.result, created_at = datetime('now')
    `,
    ).run(candidate.id, JSON.stringify(analysis));

    res.json(analysis);
  } catch (err) {
    console.error("AI analysis error:", err);
    res.status(500).json({ error: "Ошибка AI-анализа: " + err.message });
  }
});

// GET /api/ai/analysis/:candidateId — get saved AI analysis
router.get("/analysis/:candidateId", requireAdmin, (req, res) => {
  const analyses = db
    .prepare(
      "SELECT * FROM ai_analyses WHERE candidate_id = ? ORDER BY created_at DESC",
    )
    .all(req.params.candidateId);

  const result = {};
  for (const a of analyses) {
    result[a.type] = { ...JSON.parse(a.result), analyzed_at: a.created_at };
  }
  res.json(result);
});

// POST /api/ai/interview/:candidateId — AI interview chat
router.post("/interview/:candidateId", async (req, res) => {
  if (!ai.isConfigured())
    return res.status(503).json({ error: "AI API не настроен" });

  const candidate = db
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(req.params.candidateId);
  if (!candidate) return res.status(404).json({ error: "Кандидат не найден" });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Сообщение обязательно" });

  // Load conversation history
  const history = db
    .prepare(
      "SELECT role, content FROM interview_messages WHERE candidate_id = ? ORDER BY created_at ASC",
    )
    .all(candidate.id);

  const candidateContext = `Имя: ${candidate.full_name}, Возраст: ${candidate.age || "?"}, Город: ${candidate.city || "?"}, Школа: ${candidate.school || "?"}, GPA: ${candidate.gpa || "?"}`;

  try {
    const reply = await ai.conductInterview(candidateContext, history, message);

    // Save both messages
    const insertMsg = db.prepare(
      "INSERT INTO interview_messages (candidate_id, role, content) VALUES (?, ?, ?)",
    );
    insertMsg.run(candidate.id, "user", message);
    insertMsg.run(candidate.id, "assistant", reply);

    res.json({ reply, messageCount: history.length + 2 });
  } catch (err) {
    console.error("AI interview error:", err);
    res.status(500).json({ error: "Ошибка AI: " + err.message });
  }
});

// GET /api/ai/interview/:candidateId — get interview history
router.get("/interview/:candidateId", (req, res) => {
  const messages = db
    .prepare(
      "SELECT role, content, created_at FROM interview_messages WHERE candidate_id = ? ORDER BY created_at ASC",
    )
    .all(req.params.candidateId);
  res.json(messages);
});

// POST /api/ai/interview/:candidateId/start — start fresh interview
router.post("/interview/:candidateId/start", async (req, res) => {
  if (!ai.isConfigured())
    return res.status(503).json({ error: "AI API не настроен" });

  const candidate = db
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(req.params.candidateId);
  if (!candidate) return res.status(404).json({ error: "Кандидат не найден" });

  // Clear old messages
  db.prepare("DELETE FROM interview_messages WHERE candidate_id = ?").run(
    candidate.id,
  );

  const candidateContext = `Имя: ${candidate.full_name}, Возраст: ${candidate.age || "?"}, Город: ${candidate.city || "?"}, Школа: ${candidate.school || "?"}, GPA: ${candidate.gpa || "?"}`;

  try {
    const greeting = await ai.conductInterview(
      candidateContext,
      [],
      "Здравствуйте, я готов к интервью.",
    );

    const insertMsg = db.prepare(
      "INSERT INTO interview_messages (candidate_id, role, content) VALUES (?, ?, ?)",
    );
    insertMsg.run(candidate.id, "user", "Здравствуйте, я готов к интервью.");
    insertMsg.run(candidate.id, "assistant", greeting);

    res.json({ reply: greeting });
  } catch (err) {
    console.error("AI interview start error:", err);
    res.status(500).json({ error: "Ошибка AI: " + err.message });
  }
});

// POST /api/ai/interview/:candidateId/summarize — summarize interview
router.post("/interview/:candidateId/summarize", async (req, res) => {
  if (!ai.isConfigured())
    return res.status(503).json({ error: "AI API не настроен" });

  const candidate = db
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(req.params.candidateId);
  if (!candidate) return res.status(404).json({ error: "Кандидат не найден" });

  const history = db
    .prepare(
      "SELECT role, content FROM interview_messages WHERE candidate_id = ? ORDER BY created_at ASC",
    )
    .all(candidate.id);

  if (history.length < 4)
    return res
      .status(400)
      .json({ error: "Недостаточно сообщений для анализа (минимум 2 обмена)" });

  try {
    const summary = await ai.summarizeInterview(candidate.full_name, history);

    db.prepare(
      `
      INSERT INTO ai_analyses (candidate_id, type, result)
      VALUES (?, 'interview_summary', ?)
      ON CONFLICT(candidate_id, type) DO UPDATE SET
        result = excluded.result, created_at = datetime('now')
    `,
    ).run(candidate.id, JSON.stringify(summary));

    res.json(summary);
  } catch (err) {
    console.error("AI summarize error:", err);
    res.status(500).json({ error: "Ошибка AI: " + err.message });
  }
});

// GET /api/ai/video-interview/:candidateId — get current video interview state
router.get("/video-interview/:candidateId", (req, res) => {
  const candidate = db
    .prepare("SELECT id, full_name FROM candidates WHERE id = ?")
    .get(req.params.candidateId);
  if (!candidate) return res.status(404).json({ error: "Кандидат не найден" });

  const record = db
    .prepare("SELECT * FROM video_interviews WHERE candidate_id = ?")
    .get(candidate.id);

  res.json(formatVideoInterview(record, { includeResult: false }));
});

// POST /api/ai/video-interview/:candidateId/start — initialize video interview
router.post("/video-interview/:candidateId/start", (req, res) => {
  const candidate = db
    .prepare("SELECT id, full_name FROM candidates WHERE id = ?")
    .get(req.params.candidateId);
  if (!candidate) return res.status(404).json({ error: "Кандидат не найден" });

  db.prepare(
    `
      INSERT INTO video_interviews (candidate_id, status, question_set, transcript, emotion_summary, session_metrics, result, started_at, updated_at)
      VALUES (?, 'in_progress', ?, '[]', '{}', '{}', NULL, datetime('now'), datetime('now'))
      ON CONFLICT(candidate_id) DO UPDATE SET
        status = 'in_progress',
        question_set = excluded.question_set,
        transcript = '[]',
        emotion_summary = '{}',
        session_metrics = '{}',
        result = NULL,
        started_at = datetime('now'),
        completed_at = NULL,
        updated_at = datetime('now')
    `,
  ).run(candidate.id, JSON.stringify(VIDEO_INTERVIEW_QUESTIONS));

  const record = db
    .prepare("SELECT * FROM video_interviews WHERE candidate_id = ?")
    .get(candidate.id);

  res.json(formatVideoInterview(record, { includeResult: false }));
});

// POST /api/ai/video-interview/:candidateId/complete — submit transcript and analyze
router.post("/video-interview/:candidateId/complete", async (req, res) => {
  const candidate = db
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(req.params.candidateId);
  if (!candidate) return res.status(404).json({ error: "Кандидат не найден" });

  const { answers, emotionSummary, sessionMetrics } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "Нужны ответы видео-интервью" });
  }

  const normalizedAnswers = answers.map((item, index) => ({
    question: item.question || VIDEO_INTERVIEW_QUESTIONS[index] || `Вопрос ${index + 1}`,
    transcript: String(item.transcript || "").trim(),
    manualTranscript: String(item.manualTranscript || "").trim(),
    durationSec: Number(item.durationSec || 0),
    primaryEmotion: String(item.primaryEmotion || "neutral"),
    emotionConfidence: clamp(Number(item.emotionConfidence || 0), 0, 100),
    emotionBreakdown: sanitizeEmotionBreakdown(item.emotionBreakdown),
    faceVisibleRatio: clamp(Number(item.faceVisibleRatio || 0), 0, 1),
    voiceEnergyAvg: clamp(Number(item.voiceEnergyAvg || 0), 0, 1),
    movementScore: clamp(Number(item.movementScore || 0), 0, 100),
    postureStability: clamp(Number(item.postureStability || 0), 0, 100),
    visualEngagement: clamp(Number(item.visualEngagement || 0), 0, 100),
    speechPaceWpm: clamp(Number(item.speechPaceWpm || 0), 0, 300),
  }));

  const finalEmotionSummary = normalizeEmotionSummary(
    emotionSummary,
    normalizedAnswers,
  );
  const finalSessionMetrics = normalizeSessionMetrics(
    sessionMetrics,
    normalizedAnswers,
  );

  let result = null;
  if (ai.isConfigured()) {
    try {
      result = await ai.summarizeVideoInterview(candidate, {
        transcript: normalizedAnswers,
        emotionSummary: finalEmotionSummary,
        sessionMetrics: finalSessionMetrics,
      });
    } catch (err) {
      console.error("Video interview summarize error:", err);
      return res.status(500).json({ error: "Ошибка AI: " + err.message });
    }
  } else {
    result = buildFallbackVideoSummary(normalizedAnswers, finalEmotionSummary);
  }

  db.prepare(
    `
      INSERT INTO video_interviews (candidate_id, status, question_set, transcript, emotion_summary, session_metrics, result, started_at, completed_at, updated_at)
      VALUES (?, 'completed', ?, ?, ?, ?, ?, COALESCE((SELECT started_at FROM video_interviews WHERE candidate_id = ?), datetime('now')), datetime('now'), datetime('now'))
      ON CONFLICT(candidate_id) DO UPDATE SET
        status = 'completed',
        question_set = excluded.question_set,
        transcript = excluded.transcript,
        emotion_summary = excluded.emotion_summary,
        session_metrics = excluded.session_metrics,
        result = excluded.result,
        completed_at = datetime('now'),
        updated_at = datetime('now')
    `,
  ).run(
    candidate.id,
    JSON.stringify(VIDEO_INTERVIEW_QUESTIONS),
    JSON.stringify(normalizedAnswers),
    JSON.stringify(finalEmotionSummary),
    JSON.stringify(finalSessionMetrics),
    JSON.stringify(result),
    candidate.id,
  );

  db.prepare(
    `
      INSERT INTO ai_analyses (candidate_id, type, result)
      VALUES (?, 'video_interview_summary', ?)
      ON CONFLICT(candidate_id, type) DO UPDATE SET
        result = excluded.result, created_at = datetime('now')
    `,
  ).run(
    candidate.id,
    JSON.stringify({
      ...result,
      emotion_summary: finalEmotionSummary,
      session_metrics: finalSessionMetrics,
      transcript: normalizedAnswers,
    }),
  );

  const record = db
    .prepare("SELECT * FROM video_interviews WHERE candidate_id = ?")
    .get(candidate.id);

  res.json({
    ...formatVideoInterview(record, { includeResult: false }),
    organizerResultReady: Boolean(result),
  });
});

function formatVideoInterview(record, options = {}) {
  const { includeResult = false } = options;
  if (!record) {
    return {
      status: "not_started",
      questions: VIDEO_INTERVIEW_QUESTIONS,
      transcript: [],
      emotionSummary: {},
      sessionMetrics: {},
      result: null,
      startedAt: null,
      completedAt: null,
    };
  }

  return {
    status: record.status,
    questions: safeParseJSON(record.question_set, VIDEO_INTERVIEW_QUESTIONS),
    transcript: safeParseJSON(record.transcript, []),
    emotionSummary: safeParseJSON(record.emotion_summary, {}),
    sessionMetrics: safeParseJSON(record.session_metrics, {}),
    result: includeResult ? safeParseJSON(record.result, null) : null,
    startedAt: record.started_at,
    completedAt: record.completed_at,
  };
}

function safeParseJSON(value, fallback) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function sanitizeEmotionBreakdown(value) {
  const source = value && typeof value === "object" ? value : {};
  const emotions = ["confident", "engaged", "neutral", "stressed"];
  return emotions.reduce((acc, emotion) => {
    acc[emotion] = clamp(Number(source[emotion] || 0), 0, 100);
    return acc;
  }, {});
}

function normalizeEmotionSummary(input, answers) {
  const base = input && typeof input === "object" ? input : {};
  const dominantEmotion = String(
    base.dominantEmotion || detectDominantEmotionFromAnswers(answers),
  );
  return {
    dominantEmotion,
    confidence: clamp(Number(base.confidence || average(answers.map((item) => item.emotionConfidence))), 0, 100),
    stableMoments: clamp(Number(base.stableMoments || answers.filter((item) => item.primaryEmotion === "confident" || item.primaryEmotion === "engaged").length), 0, 100),
    stressMoments: clamp(Number(base.stressMoments || answers.filter((item) => item.primaryEmotion === "stressed").length), 0, 100),
    distribution: sanitizeEmotionBreakdown(base.distribution || aggregateEmotionDistribution(answers)),
  };
}

function normalizeSessionMetrics(input, answers) {
  const base = input && typeof input === "object" ? input : {};
  return {
    questionsAnswered: answers.length,
    averageAnswerDurationSec: round(Number(base.averageAnswerDurationSec || average(answers.map((item) => item.durationSec))), 1),
    faceVisibleRatio: round(clamp(Number(base.faceVisibleRatio || average(answers.map((item) => item.faceVisibleRatio))), 0, 1), 2),
    voiceEnergyAvg: round(clamp(Number(base.voiceEnergyAvg || average(answers.map((item) => item.voiceEnergyAvg))), 0, 1), 2),
    transcriptCoverage: round(Number(base.transcriptCoverage || calculateTranscriptCoverage(answers)), 1),
    averageMovementScore: round(clamp(Number(base.averageMovementScore || average(answers.map((item) => item.movementScore))), 0, 100), 1),
    postureStability: round(clamp(Number(base.postureStability || average(answers.map((item) => item.postureStability))), 0, 100), 0),
    visualEngagement: round(clamp(Number(base.visualEngagement || average(answers.map((item) => item.visualEngagement))), 0, 100), 0),
    speechPaceWpm: round(clamp(Number(base.speechPaceWpm || average(answers.map((item) => item.speechPaceWpm))), 0, 300), 0),
  };
}

function aggregateEmotionDistribution(answers) {
  const totals = { confident: 0, engaged: 0, neutral: 0, stressed: 0 };
  answers.forEach((item) => {
    Object.entries(item.emotionBreakdown || {}).forEach(([key, value]) => {
      if (totals[key] !== undefined) totals[key] += Number(value || 0);
    });
  });

  const count = answers.length || 1;
  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, round(value / count, 1)]),
  );
}

function detectDominantEmotionFromAnswers(answers) {
  const counts = {};
  answers.forEach((item) => {
    counts[item.primaryEmotion] = (counts[item.primaryEmotion] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
}

function calculateTranscriptCoverage(answers) {
  const withTranscript = answers.filter(
    (item) => item.transcript || item.manualTranscript,
  ).length;
  return answers.length ? (withTranscript / answers.length) * 100 : 0;
}

function buildFallbackVideoSummary(answers, emotionSummary) {
  const answerLengths = answers.map(
    (item) => (item.transcript || item.manualTranscript || "").length,
  );
  const avgLength = average(answerLengths);
  const avgMovement = round(average(answers.map((item) => item.movementScore)), 0);
  const avgVisualEngagement = round(
    average(answers.map((item) => item.visualEngagement)),
    0,
  );
  const avgSpeechPace = round(average(answers.map((item) => item.speechPaceWpm)), 0);
  const confidentAnswers = answers.filter(
    (item) => item.primaryEmotion === "confident" || item.primaryEmotion === "engaged",
  ).length;
  const stressedAnswers = answers.filter(
    (item) => item.primaryEmotion === "stressed",
  ).length;
  const overall = clamp(
    45 + avgLength / 12 + confidentAnswers * 6 - stressedAnswers * 4,
    0,
    100,
  );

  return {
    overall_score: round(overall, 0),
    communication_score: round(clamp(40 + avgLength / 10, 0, 100), 0),
    motivation_depth: round(clamp(35 + avgLength / 11, 0, 100), 0),
    authenticity: round(clamp(55 + confidentAnswers * 5 - stressedAnswers * 2, 0, 100), 0),
    leadership_signals: round(clamp(40 + confidentAnswers * 8, 0, 100), 0),
    emotional_resilience: round(clamp(50 + confidentAnswers * 6 - stressedAnswers * 5, 0, 100), 0),
    summary: "Видео-интервью сохранено без внешнего AI-анализа. Предварительная сводка построена по содержанию ответов, эмоциональным индикаторам и базовым визуально-поведенческим сигналам.",
    emotional_overview: `Доминирующий эмоциональный сигнал: ${emotionSummary.dominantEmotion || "neutral"}. Визуальная вовлечённость около ${avgVisualEngagement}/100, подвижность ${avgMovement}/100, темп речи ${avgSpeechPace} слов/мин.`,
    strengths: ["Кандидат завершил видео-интервью и предоставил ответы на вопросы"],
    concerns: ["AI API не настроен, поэтому анализ носит упрощённый характер"],
    recommendation: overall >= 75 ? "yes" : overall >= 55 ? "maybe" : "no",
    recommended_next_step: "Провести ручной просмотр комиссией или повторно прогнать анализ после настройки AI API",
  };
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

module.exports = router;
