/**
 * Google Gemini AI Integration Module
 * Provides deep essay analysis, AI interview, and enhanced scoring.
 */
const genai = require("@google/genai");
require("dotenv").config();

let client = null;

function getClient() {
  if (!client) {
    client = new genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Deep essay analysis — returns structured assessment of candidate's essays
 */
async function analyzeEssaysDeep(candidate) {
  const gemini = getClient();

  const prompt = `Ты — эксперт приёмной комиссии inVision U, инновационного университета от inDrive в Казахстане. Твоя задача — глубоко проанализировать эссе кандидата и дать структурированную оценку.

ПРОФИЛЬ КАНДИДАТА:
- Имя: ${candidate.full_name}
- Возраст: ${candidate.age || "не указан"}
- Город: ${candidate.city || "не указан"}
- Школа: ${candidate.school || "не указана"}
- GPA: ${candidate.gpa || "не указан"}

ЭССЕ О МОТИВАЦИИ:
${candidate.essay_motivation || "[не предоставлено]"}

ЭССЕ О ЛИДЕРСТВЕ:
${candidate.essay_leadership || "[не предоставлено]"}

ЭССЕ О ЦЕЛЯХ:
${candidate.essay_goals || "[не предоставлено]"}

Проанализируй эссе по следующим критериям и верни ответ СТРОГО в формате JSON (без markdown):

{
  "leadership_score": <число 0-100>,
  "leadership_analysis": "<подробный анализ лидерского потенциала, 2-3 предложения>",
  "motivation_score": <число 0-100>,
  "motivation_analysis": "<подробный анализ мотивации, 2-3 предложения>",
  "growth_score": <число 0-100>,
  "growth_analysis": "<анализ траектории роста и способности к рефлексии>",
  "authenticity_score": <число 0-100>,
  "authenticity_analysis": "<оценка аутентичности текста, есть ли признаки ИИ-генерации>",
  "ai_detection_score": <число 0-100, где 100 = точно ИИ>,
  "ai_detection_details": "<конкретные признаки ИИ-генерации или аутентичности>",
  "mission_alignment": <число 0-100>,
  "mission_analysis": "<насколько кандидат соответствует миссии inVision U>",
  "overall_impression": "<общее впечатление, 2-3 предложения>",
  "strengths": ["<сильная сторона 1>", "<сильная сторона 2>"],
  "concerns": ["<зона внимания 1>", "<зона внимания 2>"],
  "recommendation": "<strong_yes|yes|maybe|no|strong_no>",
  "recommendation_reason": "<обоснование рекомендации, 1-2 предложения>"
}`;

  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    config: { maxOutputTokens: 2000 },
    contents: prompt,
  });

  const text = response.text;
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse AI response");
  }
}

/**
 * AI Interview — conducts a conversational assessment with the candidate
 */
async function conductInterview(
  candidateContext,
  conversationHistory,
  userMessage,
) {
  const gemini = getClient();

  const systemPrompt = `Ты — дружелюбный и профессиональный AI-интервьюер для inVision U, инновационного университета от inDrive в Казахстане. Твоя задача — провести мотивационное интервью с кандидатом.

ПРАВИЛА:
1. Говори на том языке, на котором пишет кандидат (русский или казахский или английский)
2. Задавай по ОДНОМУ вопросу за раз
3. Будь дружелюбным, но профессиональным
4. Старайся раскрыть настоящую мотивацию, лидерский потенциал и ценности кандидата
5. НЕ оценивай кандидата вслух — просто веди беседу
6. Задавай уточняющие вопросы, если ответ поверхностный
7. Обращай внимание на конкретные примеры и истории из жизни
8. Если кандидат отвечает шаблонно — мягко попроси конкретный пример

КОНТЕКСТ КАНДИДАТА:
${candidateContext}

ТЕМЫ ДЛЯ ОБСУЖДЕНИЯ (не обязательно все, выбирай по ходу разговора):
- Что привело к решению подать заявку в inVision U
- Самый значимый проект или достижение
- Момент преодоления трудности
- Видение своего будущего через 5-10 лет
- Что значит лидерство для кандидата
- Как кандидат влияет на окружающих
- Связь с Казахстаном и желание менять вещи к лучшему

Если это ПЕРВОЕ сообщение (история пуста), начни с тёплого приветствия и первого вопроса.`;

  const contents = [
    ...conversationHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 500,
    },
    contents,
  });

  return response.text;
}

/**
 * Summarize interview — analyze the full interview transcript
 */
async function summarizeInterview(candidateName, conversationHistory) {
  const gemini = getClient();

  const transcript = conversationHistory
    .map(
      (m) => `${m.role === "user" ? "Кандидат" : "Интервьюер"}: ${m.content}`,
    )
    .join("\n\n");

  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    config: { maxOutputTokens: 1500 },
    contents: `Проанализируй транскрипт интервью с кандидатом ${candidateName} в inVision U и верни оценку в формате JSON (без markdown):

ТРАНСКРИПТ:
${transcript}

Верни JSON:
{
  "overall_score": <0-100>,
  "communication_score": <0-100>,
  "motivation_depth": <0-100>,
  "authenticity": <0-100>,
  "leadership_signals": <0-100>,
  "summary": "<краткое резюме интервью, 3-4 предложения>",
  "key_quotes": ["<значимая цитата 1>", "<значимая цитата 2>"],
  "strengths": ["<сильная сторона>"],
  "concerns": ["<зона внимания>"],
  "recommendation": "<strong_yes|yes|maybe|no|strong_no>"
}`,
  });

  const text = response.text;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse AI response");
  }
}

async function summarizeVideoInterview(candidate, videoInterview) {
  const gemini = getClient();

  const transcript = (videoInterview.transcript || [])
    .map((item, index) => {
      const transcriptText = item.transcript || item.manualTranscript || "";
      const emotionLabel = item.primaryEmotion || "neutral";
      const confidence = item.emotionConfidence ?? 0;
      return [
        `Вопрос ${index + 1}: ${item.question}`,
        `Ответ кандидата: ${transcriptText || "[нет расшифровки]"}`,
        `Длительность ответа: ${item.durationSec || 0} сек.`,
        `Эмоциональный сигнал: ${emotionLabel} (${confidence}/100)`,
        `Подвижность в кадре: ${item.movementScore ?? 0}/100`,
        `Стабильность позы/кадра: ${item.postureStability ?? 0}/100`,
        `Визуальная вовлечённость: ${item.visualEngagement ?? 0}/100`,
        `Темп речи: ${item.speechPaceWpm ?? 0} слов/мин`,
      ].join("\n");
    })
    .join("\n\n");

  const emotionSummary = JSON.stringify(videoInterview.emotionSummary || {}, null, 2);
  const sessionMetrics = JSON.stringify(videoInterview.sessionMetrics || {}, null, 2);

  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    config: { maxOutputTokens: 1800 },
    contents: `Ты анализируешь видео-интервью абитуриента inVision U для внутреннего просмотра организатором. Используй транскрипт ответов, речевые сигналы, визуально-поведенческие метрики и сводку эмоциональных индикаторов. Не делай медицинских выводов и не утверждай то, чего нельзя обосновать. Если сигнал слабый, прямо скажи, что это вероятностная оценка.

КАНДИДАТ:
- Имя: ${candidate.full_name}
- Возраст: ${candidate.age || "не указан"}
- Город: ${candidate.city || "не указан"}
- Школа: ${candidate.school || "не указана"}

ТРАНСКРИПТ ВИДЕО-ИНТЕРВЬЮ:
${transcript}

СВОДКА ЭМОЦИОНАЛЬНЫХ ИНДИКАТОРОВ:
${emotionSummary}

МЕТРИКИ СЕССИИ:
${sessionMetrics}

Верни СТРОГО JSON без markdown:
{
  "overall_score": <0-100>,
  "communication_score": <0-100>,
  "speech_clarity": <0-100>,
  "motivation_depth": <0-100>,
  "authenticity": <0-100>,
  "leadership_signals": <0-100>,
  "emotional_resilience": <0-100>,
  "nonverbal_consistency": <0-100>,
  "visual_presence": <0-100>,
  "summary": "<краткое резюме 3-4 предложения>",
  "emotional_overview": "<какие эмоциональные сигналы были замечены и насколько они устойчивы>",
  "behavioral_observations": "<что заметно по мимике, движениям и поведению в кадре; формулируй это как вероятностную интерпретацию сигналов>",
  "strengths": ["<сильная сторона>"],
  "concerns": ["<зона внимания>"],
  "recommendation": "<strong_yes|yes|maybe|no|strong_no>",
  "recommended_next_step": "<какой следующий шаг комиссии стоит сделать>"
}`,
  });

  const text = response.text;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse AI response");
  }
}

module.exports = {
  isConfigured,
  analyzeEssaysDeep,
  conductInterview,
  summarizeInterview,
  summarizeVideoInterview,
};
