require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/authRoutes");
const { requireAdmin } = require("./src/routes/authRoutes");
const candidateRoutes = require("./src/routes/candidateRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const chatRoutes = require("./src/routes/chatRoutes");

// Новые роуты для расширенной функциональности
const gameRoutes = require("./src/routes/gameRoutes");
const skillsRoutes = require("./src/routes/skillsRoutes");
const agentRoutes = require("./src/routes/agentRoutes");
const progressRoutes = require("./src/routes/progressRoutes");
const explainableRoutes = require("./src/routes/explainableRoutes");

// Системы достижений и сертификатов
const { AchievementSystem, CertificateGenerator, LeaderboardSystem } = require("./src/utils/utilities");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);
app.use(express.json({ limit: "10mb" }));

// Public routes (no auth)
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/student", studentRoutes);

// Новые публичные роуты для геймификации и AI агентов
app.use("/api/games", gameRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/progress", progressRoutes);

// Protected admin routes
app.use("/api/candidates", requireAdmin, candidateRoutes);
app.use("/api/ai", aiRoutes);

// Health check (public)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Decentrathon Leadership Assessment Platform",
    aiConfigured: !!process.env.GEMINI_API_KEY,
    features: [
      "AI-powered interviews",
      "Gamified case studies",
      "Soft skills analysis",
      "Progress tracking",
      "Achievement system",
      "Multi-agent AI",
      "Video analysis",
      "Certificate generation"
    ]
  });
});

// Инициализация систем при запуске
async function initializeSystems() {
  try {
    const achievementSystem = new AchievementSystem();
    const certificateGenerator = new CertificateGenerator();
    const leaderboardSystem = new LeaderboardSystem();

    // Инициализировать достижения и сертификаты
    await achievementSystem.initializeAchievements();
    await certificateGenerator.initializeCertificates();

    // Запустить автоматическое обновление лидербордов
    leaderboardSystem.startAutoUpdate();

    console.log("✅ All systems initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing systems:", error);
  }
}

const port = 3000;
app.listen(port, () => {
  console.log(`🚀 Decentrathon Backend running on http://localhost:${port}`);
  console.log(
    `🤖 AI API: ${process.env.GEMINI_API_KEY ? "configured ✅" : "not configured ❌ (add GEMINI_API_KEY to .env)"}`,
  );
  console.log(`🎮 Gamification: enabled`);
  console.log(`📊 Analytics: enabled`);
  console.log(`🏆 Achievements: enabled`);

  // Инициализировать системы
  initializeSystems();
});


module.exports = app;
