const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'invision.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    age INTEGER,
    city TEXT,
    school TEXT,
    grade TEXT,
    email TEXT,
    phone TEXT,
    gpa REAL,
    achievements TEXT,        -- JSON array
    extracurriculars TEXT,    -- JSON array
    leadership_roles TEXT,    -- JSON array
    essay_motivation TEXT,
    essay_leadership TEXT,
    essay_goals TEXT,
    interview_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','shortlisted','rejected','accepted')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL DEFAULT 100,
    explanation TEXT,
    factors TEXT,             -- JSON array of contributing factors
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS composite_scores (
    candidate_id TEXT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
    total_score REAL NOT NULL,
    rank INTEGER,
    recommendation TEXT CHECK(recommendation IN ('strong_yes','yes','maybe','no','strong_no')),
    summary TEXT,
    ai_detection_flag REAL DEFAULT 0,
    growth_trajectory REAL DEFAULT 0,
    leadership_potential REAL DEFAULT 0,
    motivation_score REAL DEFAULT 0,
    authenticity_score REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS committee_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL,
    decision TEXT CHECK(decision IN ('approve','reject','hold','escalate')),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_id, type)
  );

  CREATE TABLE IF NOT EXISTS interview_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS video_interviews (
    candidate_id TEXT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
    question_set TEXT NOT NULL DEFAULT '[]',
    transcript TEXT NOT NULL DEFAULT '[]',
    emotion_summary TEXT NOT NULL DEFAULT '{}',
    session_metrics TEXT NOT NULL DEFAULT '{}',
    result TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin','viewer')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  /* === НОВЫЕ ТАБЛИЦЫ ДЛЯ РАСШИРЕННОГО ФУНКЦИОНАЛА === */

  -- Геймифицированные микро-кейсы
  CREATE TABLE IF NOT EXISTS game_cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    scenario TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('conflict_resolution', 'decision_making', 'team_dynamics', 'crisis_management', 'change_management', 'ethical_dilemma', 'resource_allocation', 'communication')),
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
    points INTEGER DEFAULT 10,
    soft_skills_tested TEXT, -- JSON array of skills
    correct_answer TEXT,
    explanation TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Результаты решения кейсов пользователями
  CREATE TABLE IF NOT EXISTS user_case_results (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    case_id TEXT NOT NULL REFERENCES game_cases(id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL,
    ai_evaluation TEXT, -- JSON with score, feedback, strengths, areas_to_improve
    score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
    completed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  -- Анализ soft skills
  CREATE TABLE IF NOT EXISTS soft_skills (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL CHECK(skill_name IN ('empathy', 'communication', 'creativity', 'leadership', 'adaptability', 'teamwork', 'initiative', 'problem_solving')),
    best_score REAL NOT NULL CHECK(best_score >= 0 AND best_score <= 100),
    average_score REAL NOT NULL CHECK(average_score >= 0 AND average_score <= 100),
    trend TEXT CHECK(trend IN ('improving', 'stable', 'declining')),
    last_updated TEXT DEFAULT (datetime('now'))
  );

  -- История интервью для отслеживания прогресса
  CREATE TABLE IF NOT EXISTS interview_history (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    interview_type TEXT NOT NULL,
    overall_score REAL NOT NULL CHECK(overall_score >= 0 AND overall_score <= 100),
    leadership_score REAL CHECK(leadership_score >= 0 AND leadership_score <= 100),
    communication_score REAL CHECK(communication_score >= 0 AND communication_score <= 100),
    empathy_score REAL CHECK(empathy_score >= 0 AND empathy_score <= 100),
    creativity_score REAL CHECK(creativity_score >= 0 AND creativity_score <= 100),
    adaptability_score REAL CHECK(adaptability_score >= 0 AND adaptability_score <= 100),
    teamwork_score REAL CHECK(teamwork_score >= 0 AND teamwork_score <= 100),
    initiative_score REAL CHECK(initiative_score >= 0 AND initiative_score <= 100),
    summary TEXT,
    completed_at TEXT DEFAULT (datetime('now'))
  );

  -- Система достижений
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    requirement_type TEXT NOT NULL CHECK(requirement_type IN ('cases_completed', 'score_threshold', 'streak', 'skill_mastery', 'interview_count')),
    requirement_value INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Достижения пользователей
  CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_id, achievement_id)
  );

  -- Лидерборд
  CREATE TABLE IF NOT EXISTS leaderboard (
    candidate_id TEXT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
    total_score REAL NOT NULL DEFAULT 0,
    cases_completed INTEGER DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    rank INTEGER,
    last_updated TEXT DEFAULT (datetime('now'))
  );

  -- Сессии коучинга
  CREATE TABLE IF NOT EXISTS coaching_sessions (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    coach_type TEXT NOT NULL CHECK(coach_type IN ('leadership', 'communication', 'career', 'personal_development')),
    session_data TEXT, -- JSON with plan, recommendations, exercises
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Сертификаты
  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    certificate_type TEXT NOT NULL CHECK(certificate_type IN ('completion', 'excellence', 'leadership', 'participation')),
    title TEXT NOT NULL,
    description TEXT,
    issued_at TEXT DEFAULT (datetime('now')),
    pdf_data TEXT -- Base64 encoded PDF or URL
  );

  -- Анализ видео
  CREATE TABLE IF NOT EXISTS video_analysis (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    video_url TEXT,
    emotion_analysis TEXT, -- JSON with emotions over time
    confidence_score REAL CHECK(confidence_score >= 0 AND confidence_score <= 100),
    engagement_score REAL CHECK(engagement_score >= 0 AND engagement_score <= 100),
    eye_contact_score REAL CHECK(eye_contact_score >= 0 AND eye_contact_score <= 100),
    analyzed_at TEXT DEFAULT (datetime('now'))
  );

  -- Анализ речи
  CREATE TABLE IF NOT EXISTS speech_analysis (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    transcript TEXT,
    tone_analysis TEXT, -- JSON with tone metrics
    pace_score REAL CHECK(pace_score >= 0 AND pace_score <= 100),
    clarity_score REAL CHECK(clarity_score >= 0 AND clarity_score <= 100),
    vocabulary_score REAL CHECK(vocabulary_score >= 0 AND vocabulary_score <= 100),
    pause_analysis TEXT, -- JSON with pause patterns
    analyzed_at TEXT DEFAULT (datetime('now'))
  );

  -- Конверсации с AI агентами
  CREATE TABLE IF NOT EXISTS ai_agent_conversations (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL CHECK(agent_type IN ('interviewer', 'analyzer', 'coach', 'psychologist')),
    conversation_history TEXT NOT NULL, -- JSON array of messages
    evaluation_result TEXT, -- JSON with final assessment
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Группы и команды (для B2B)
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organization_id TEXT, -- For B2B organizations
    created_by TEXT REFERENCES candidates(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Членство в группах
  CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'moderator', 'member')),
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(group_id, candidate_id)
  );

  -- Инвайты друзей
  CREATE TABLE IF NOT EXISTS friend_invites (
    id TEXT PRIMARY KEY,
    inviter_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
    bonus_cases_awarded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT
  );
`);

const videoInterviewColumns = db
  .prepare("PRAGMA table_info(video_interviews)")
  .all()
  .map((column) => column.name);

if (!videoInterviewColumns.includes("started_at")) {
  db.exec("ALTER TABLE video_interviews ADD COLUMN started_at TEXT");
}

if (!videoInterviewColumns.includes("completed_at")) {
  db.exec("ALTER TABLE video_interviews ADD COLUMN completed_at TEXT");
}

if (!videoInterviewColumns.includes("created_at")) {
  db.exec("ALTER TABLE video_interviews ADD COLUMN created_at TEXT DEFAULT (datetime('now'))");
}

if (!videoInterviewColumns.includes("updated_at")) {
  db.exec("ALTER TABLE video_interviews ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))");
}

// Результаты симуляторов решений
db.exec(`
  CREATE TABLE IF NOT EXISTS simulator_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    simulator_id TEXT NOT NULL,
    score REAL NOT NULL,
    choices TEXT NOT NULL,
    feedback TEXT,
    completed_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
