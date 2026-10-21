const express = require("express");
const genai = require("@google/genai");
const db = require("../database");

const router = express.Router();

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const SYSTEM_PROMPT = `Ты — дружелюбный AI-ассистент приёмной комиссии inVision U, инновационного университета от inDrive в Казахстане. Университет предоставляет 100% гранты и обучает будущих лидеров, предпринимателей и создателей проектов.

ТВОЯ РОЛЬ:
- Отвечать на вопросы абитуриентов о программе, процессе отбора, критериях
- Помогать кандидатам подготовить заявку
- Объяснять, что inVision U ищет в кандидатах
- Мотивировать и поддерживать абитуриентов
- Быть тёплым, дружелюбным, но профессиональным

ВАЖНАЯ ИНФОРМАЦИЯ ОБ inVision U:
- 100% грант от inDrive для всех принятых студентов
- Ключевые качества кандидатов: лидерский потенциал, мотивация, траектория роста, аутентичность
- Процесс отбора: онлайн-заявка → AI-скрининг → рассмотрение комиссией
- Заявка включает: анкету, эссе о мотивации/лидерстве/целях, AI-интервью
- Мы ценим не только формальные достижения, но и пройденный путь
- Пишите эссе сами — система детектирует ИИ-генерацию
- AI помогает комиссии, но не принимает окончательных решений

ПРАВИЛА:
1. Говори на языке собеседника (русский, казахский, английский)
2. Будь лаконичным — 2-4 предложения на ответ, если не просят подробнее
3. Если спрашивают про конкретные даты или стоимость — скажи, что нужно уточнить на сайте
4. НЕ делай вид, что ты человек — ты AI-ассистент
5. Если вопрос не связан с inVision U — вежливо перенаправь к теме`;

// POST /api/chat — send message to public chatbot
router.post("/", async (req, res) => {
  const client = getClient();
  if (!client)
    return res
      .status(503)
      .json({ error: "AI не настроен. Добавьте GEMINI_API_KEY в .env" });

  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: "Сообщение обязательно" });

  const sid = sessionId || `sess_${Date.now()}`;

  // Load history
  const history = db
    .prepare(
      "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
    )
    .all(sid);

  // Save user message
  db.prepare(
    "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)",
  ).run(sid, "user", message);

  try {
    const contents = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      config: { systemInstruction: SYSTEM_PROMPT, maxOutputTokens: 600 },
      contents,
    });

    const reply = response.text;

    // Save assistant reply
    db.prepare(
      "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)",
    ).run(sid, "assistant", reply);

    res.json({ reply, sessionId: sid });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Ошибка AI: " + err.message });
  }
});

// GET /api/chat/:sessionId — get chat history
router.get("/:sessionId", (req, res) => {
  const messages = db
    .prepare(
      "SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
    )
    .all(req.params.sessionId);
  res.json(messages);
});

module.exports = router;
