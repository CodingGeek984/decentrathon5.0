/**
 * Profile Scoring Module
 * Scores structured candidate data (achievements, GPA, extracurriculars, leadership roles)
 */

function safeParseJSON(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

/**
 * Score academic performance
 */
function scoreAcademics(candidate) {
  const factors = [];
  let score = 0;

  const gpa = candidate.gpa;
  if (gpa != null) {
    if (gpa >= 4.5) { score += 40; factors.push(`Отличная успеваемость (GPA: ${gpa})`); }
    else if (gpa >= 4.0) { score += 30; factors.push(`Хорошая успеваемость (GPA: ${gpa})`); }
    else if (gpa >= 3.5) { score += 20; factors.push(`Средняя успеваемость (GPA: ${gpa})`); }
    else { score += 10; factors.push(`GPA: ${gpa}`); }
  } else {
    factors.push('GPA не указан');
  }

  const achievements = safeParseJSON(candidate.achievements);
  if (achievements.length >= 5) { score += 35; factors.push(`Богатое портфолио (${achievements.length} достижений)`); }
  else if (achievements.length >= 3) { score += 25; factors.push(`Хорошее портфолио (${achievements.length} достижений)`); }
  else if (achievements.length >= 1) { score += 15; factors.push(`Есть достижения (${achievements.length})`); }
  else { factors.push('Достижения не указаны'); }

  // Check for competition-level achievements
  const competitionKeywords = ['олимпиад', 'конкурс', 'чемпион', 'победител', 'призёр', 'призер',
    'olympiad', 'competition', 'champion', 'winner', 'prize', 'award', 'international', 'республикан', 'национальн'];
  const hasCompetitions = achievements.some(a =>
    competitionKeywords.some(kw => a.toLowerCase().includes(kw))
  );
  if (hasCompetitions) { score += 25; factors.push('Участие в олимпиадах/конкурсах'); }

  return { score: Math.min(score, 100), factors };
}

/**
 * Score extracurricular activities
 */
function scoreExtracurriculars(candidate) {
  const factors = [];
  let score = 0;

  const activities = safeParseJSON(candidate.extracurriculars);

  if (activities.length >= 5) { score += 35; factors.push(`Разносторонняя активность (${activities.length} направлений)`); }
  else if (activities.length >= 3) { score += 25; factors.push(`Хорошая внеучебная активность (${activities.length})`); }
  else if (activities.length >= 1) { score += 15; factors.push(`Есть внеучебная активность (${activities.length})`); }
  else { factors.push('Внеучебная активность не указана'); }

  // Social impact keywords
  const impactKeywords = ['волонтёр', 'волонтер', 'благотвор', 'социальн', 'помощь', 'сообществ',
    'volunteer', 'charity', 'social', 'community', 'help', 'ngo', 'nonprofit'];
  const hasSocialImpact = activities.some(a =>
    impactKeywords.some(kw => a.toLowerCase().includes(kw))
  );
  if (hasSocialImpact) { score += 25; factors.push('Социальная направленность деятельности'); }

  // Entrepreneurial keywords
  const entrepreneurKeywords = ['бизнес', 'стартап', 'проект', 'создал', 'основал', 'предпринимат',
    'business', 'startup', 'project', 'founded', 'created', 'entrepreneur'];
  const hasEntrepreneurial = activities.some(a =>
    entrepreneurKeywords.some(kw => a.toLowerCase().includes(kw))
  );
  if (hasEntrepreneurial) { score += 25; factors.push('Предпринимательская активность'); }

  // Diversity of activities
  const categories = new Set();
  const categoryMap = {
    'спорт|sport|физ|атлет': 'sport',
    'музык|music|искусств|art|творч': 'art',
    'наук|science|исследован|research': 'science',
    'технолог|program|код|tech|IT|робот': 'tech',
    'общест|social|волонт|communit': 'social',
    'бизнес|предприн|startup|entrepre': 'business',
  };
  for (const activity of activities) {
    const lower = activity.toLowerCase();
    for (const [pattern, cat] of Object.entries(categoryMap)) {
      if (pattern.split('|').some(p => lower.includes(p))) categories.add(cat);
    }
  }
  if (categories.size >= 3) { score += 15; factors.push(`Разнообразие направлений (${categories.size} категорий)`); }

  return { score: Math.min(score, 100), factors };
}

/**
 * Score leadership experience
 */
function scoreLeadershipRoles(candidate) {
  const factors = [];
  let score = 0;

  const roles = safeParseJSON(candidate.leadership_roles);

  if (roles.length >= 4) { score += 40; factors.push(`Обширный лидерский опыт (${roles.length} ролей)`); }
  else if (roles.length >= 2) { score += 28; factors.push(`Значительный лидерский опыт (${roles.length} ролей)`); }
  else if (roles.length >= 1) { score += 15; factors.push(`Есть лидерский опыт (${roles.length})`); }
  else { factors.push('Лидерские роли не указаны'); }

  // High-impact roles
  const highImpact = ['президент', 'председатель', 'капитан', 'основатель', 'глава',
    'president', 'chairman', 'captain', 'founder', 'head', 'ceo', 'director'];
  const hasHighImpact = roles.some(r =>
    highImpact.some(kw => r.toLowerCase().includes(kw))
  );
  if (hasHighImpact) { score += 30; factors.push('Роли с высокой ответственностью'); }

  // Organizational scale
  const scaleKeywords = ['школ', 'город', 'район', 'област', 'республик', 'национальн', 'международн',
    'school', 'city', 'regional', 'national', 'international'];
  const hasScale = roles.some(r =>
    scaleKeywords.some(kw => r.toLowerCase().includes(kw))
  );
  if (hasScale) { score += 20; factors.push('Лидерство на уровне выше школьного'); }

  // Duration / consistency
  const durationKeywords = ['года', 'лет', 'year', 'years', 'с 20', 'since'];
  const hasDuration = roles.some(r =>
    durationKeywords.some(kw => r.toLowerCase().includes(kw))
  );
  if (hasDuration) { score += 10; factors.push('Устойчивый лидерский опыт'); }

  return { score: Math.min(score, 100), factors };
}

/**
 * Full profile scoring
 */
function scoreProfile(candidate) {
  return {
    academics: scoreAcademics(candidate),
    extracurriculars: scoreExtracurriculars(candidate),
    leadershipRoles: scoreLeadershipRoles(candidate),
  };
}

module.exports = { scoreProfile, scoreAcademics, scoreExtracurriculars, scoreLeadershipRoles };
