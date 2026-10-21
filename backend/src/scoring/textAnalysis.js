/**
 * Text Analysis Module for Essay Scoring
 * Provides NLP-based analysis for motivation, leadership, authenticity, and AI detection.
 */

// ---- Utility helpers ----

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sentenceCount(text) {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
}

function avgWordLength(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return words.reduce((sum, w) => sum + w.length, 0) / words.length;
}

function uniqueWordRatio(text) {
  const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

function avgSentenceLength(text) {
  const sentences = sentenceCount(text);
  if (sentences === 0) return 0;
  return wordCount(text) / sentences;
}

function sentenceLengthVariance(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return 0;
  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
  return Math.sqrt(variance);
}

// ---- Keyword dictionaries ----

const LEADERSHIP_KEYWORDS_RU = [
  'лидер', 'лидерство', 'команда', 'командная', 'руководил', 'руководить',
  'организовал', 'организовать', 'инициатива', 'инициировал', 'проект',
  'ответственность', 'решение', 'управление', 'координация', 'вдохновлять',
  'мотивировать', 'наставник', 'менторство', 'волонтёр', 'волонтер',
  'сообщество', 'изменения', 'влияние', 'развитие', 'стратегия'
];

const LEADERSHIP_KEYWORDS_EN = [
  'leader', 'leadership', 'team', 'managed', 'organized', 'initiative',
  'project', 'responsibility', 'decision', 'coordinate', 'inspire',
  'motivate', 'mentor', 'volunteer', 'community', 'impact', 'change',
  'development', 'strategy', 'founded', 'created', 'built'
];

const MOTIVATION_KEYWORDS_RU = [
  'мечта', 'цель', 'стремлюсь', 'хочу', 'планирую', 'будущее',
  'вдохновение', 'страсть', 'увлечение', 'интерес', 'миссия',
  'вклад', 'общество', 'помощь', 'развитие', 'рост', 'обучение',
  'знания', 'навыки', 'возможность', 'потенциал', 'амбиции'
];

const MOTIVATION_KEYWORDS_EN = [
  'dream', 'goal', 'aspire', 'passion', 'future', 'inspiration',
  'mission', 'contribution', 'society', 'help', 'growth', 'learning',
  'knowledge', 'skills', 'opportunity', 'potential', 'ambition',
  'purpose', 'vision', 'driven', 'committed', 'dedicated'
];

const GROWTH_KEYWORDS_RU = [
  'преодолел', 'научился', 'вырос', 'изменился', 'ошибка', 'урок',
  'трудность', 'вызов', 'препятствие', 'путь', 'прогресс',
  'раньше', 'теперь', 'сначала', 'потом', 'опыт', 'понял'
];

const GROWTH_KEYWORDS_EN = [
  'overcame', 'learned', 'grew', 'changed', 'mistake', 'lesson',
  'challenge', 'obstacle', 'journey', 'progress', 'before', 'now',
  'initially', 'eventually', 'experience', 'realized', 'transformed'
];

// AI-generated text markers (overly polished / generic phrasing)
const AI_MARKERS_RU = [
  'в заключение хочу сказать', 'подводя итог', 'в современном мире',
  'в эпоху цифровизации', 'является неотъемлемой частью',
  'играет важную роль', 'в рамках данного', 'следует отметить',
  'безусловно', 'несомненно', 'в контексте', 'парадигма',
  'комплексный подход', 'синергия', 'оптимизация'
];

const AI_MARKERS_EN = [
  'in conclusion', 'in today\'s rapidly', 'it is worth noting',
  'furthermore', 'moreover', 'in the realm of', 'paradigm',
  'synergy', 'holistic approach', 'leverage', 'tapestry',
  'multifaceted', 'underscores', 'navigating the complexities',
  'at the end of the day', 'delve into'
];

// Authenticity markers (personal, specific, vulnerable)
const AUTHENTICITY_MARKERS_RU = [
  'помню', 'чувствовал', 'боялся', 'плакал', 'смеялся', 'мама', 'папа',
  'бабушка', 'дедушка', 'друг', 'учитель', 'однажды', 'когда мне было',
  'в детстве', 'класс', 'школа', 'двор', 'город', 'село', 'аул'
];

const AUTHENTICITY_MARKERS_EN = [
  'remember', 'felt', 'scared', 'cried', 'laughed', 'mom', 'dad',
  'grandmother', 'friend', 'teacher', 'one day', 'when i was',
  'childhood', 'class', 'school', 'hometown', 'village'
];

// ---- Scoring functions ----

function countKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.reduce((count, kw) => {
    const regex = new RegExp(kw, 'gi');
    const matches = lower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function keywordDensity(text, keywords) {
  const words = wordCount(text);
  if (words === 0) return 0;
  return countKeywords(text, keywords) / words;
}

/**
 * Analyze essay for leadership signals
 */
function analyzeLeadership(text) {
  if (!text || text.trim().length === 0) return { score: 0, factors: ['Эссе не предоставлено'] };

  const factors = [];
  let score = 0;

  const kwCount = countKeywords(text, [...LEADERSHIP_KEYWORDS_RU, ...LEADERSHIP_KEYWORDS_EN]);
  const density = keywordDensity(text, [...LEADERSHIP_KEYWORDS_RU, ...LEADERSHIP_KEYWORDS_EN]);

  if (kwCount >= 8) { score += 30; factors.push(`Высокая концентрация лидерских маркеров (${kwCount})`); }
  else if (kwCount >= 4) { score += 20; factors.push(`Умеренная концентрация лидерских маркеров (${kwCount})`); }
  else if (kwCount >= 1) { score += 10; factors.push(`Низкая концентрация лидерских маркеров (${kwCount})`); }
  else { factors.push('Лидерские маркеры не обнаружены'); }

  // Specific examples (numbers, names, concrete details)
  const hasNumbers = /\d+/.test(text);
  const hasQuotes = /["«»]/.test(text);
  if (hasNumbers) { score += 15; factors.push('Содержит конкретные цифры/данные'); }
  if (hasQuotes) { score += 10; factors.push('Содержит цитаты или прямую речь'); }

  // Length & depth
  const words = wordCount(text);
  if (words >= 300) { score += 15; factors.push('Развёрнутое описание опыта'); }
  else if (words >= 150) { score += 10; factors.push('Достаточное описание опыта'); }
  else { score += 5; factors.push('Краткое описание'); }

  // Action verbs (показатель деятельного подхода)
  const actionVerbs = countKeywords(text, [
    'создал', 'запустил', 'организовал', 'разработал', 'провёл', 'провел',
    'основал', 'собрал', 'объединил', 'built', 'created', 'launched', 'organized'
  ]);
  if (actionVerbs >= 3) { score += 15; factors.push(`Активная позиция: ${actionVerbs} глаголов действия`); }
  else if (actionVerbs >= 1) { score += 8; factors.push(`Есть глаголы действия (${actionVerbs})`); }

  // Mention of team/others (not just "I")
  const teamMentions = countKeywords(text, ['мы', 'наша', 'команд', 'вместе', 'we', 'our', 'team', 'together']);
  if (teamMentions >= 3) { score += 15; factors.push('Выраженная командная ориентация'); }
  else if (teamMentions >= 1) { score += 8; factors.push('Есть упоминания командной работы'); }

  return { score: Math.min(score, 100), factors };
}

/**
 * Analyze essay for motivation signals
 */
function analyzeMotivation(text) {
  if (!text || text.trim().length === 0) return { score: 0, factors: ['Эссе не предоставлено'] };

  const factors = [];
  let score = 0;

  const kwCount = countKeywords(text, [...MOTIVATION_KEYWORDS_RU, ...MOTIVATION_KEYWORDS_EN]);

  if (kwCount >= 8) { score += 30; factors.push(`Высокая мотивационная насыщенность (${kwCount} маркеров)`); }
  else if (kwCount >= 4) { score += 20; factors.push(`Умеренная мотивационная насыщенность (${kwCount})`); }
  else if (kwCount >= 1) { score += 10; factors.push(`Низкая мотивационная насыщенность (${kwCount})`); }
  else { factors.push('Мотивационные маркеры не обнаружены'); }

  // Specificity of goals
  const specificGoals = countKeywords(text, [
    'через 5', 'через 10', 'к 20', 'до 20', 'планирую стать',
    'хочу создать', 'мечтаю построить', 'in 5 years', 'in 10 years',
    'want to become', 'plan to create', 'goal is to'
  ]);
  if (specificGoals >= 2) { score += 20; factors.push('Конкретные долгосрочные цели'); }
  else if (specificGoals >= 1) { score += 12; factors.push('Есть указание на будущие планы'); }

  // Connection to inVision U mission
  const missionAlignment = countKeywords(text, [
    'предпринимат', 'entrepreneur', 'социальн', 'social impact',
    'казахстан', 'kazakhstan', 'инновац', 'innovat', 'indrive',
    'invision', 'технолог', 'technolog', 'образован', 'education'
  ]);
  if (missionAlignment >= 3) { score += 20; factors.push('Сильное соответствие миссии inVision U'); }
  else if (missionAlignment >= 1) { score += 10; factors.push('Есть связь с миссией университета'); }

  // Emotional depth
  const emotionalWords = countKeywords(text, [
    'верю', 'чувствую', 'надеюсь', 'горжусь', 'переживаю',
    'believe', 'feel', 'hope', 'proud', 'care'
  ]);
  if (emotionalWords >= 2) { score += 15; factors.push('Эмоциональная глубина и искренность'); }
  else if (emotionalWords >= 1) { score += 8; factors.push('Есть эмоциональные элементы'); }

  // Length factor
  const words = wordCount(text);
  if (words >= 250) { score += 15; factors.push('Развёрнутое изложение мотивации'); }
  else if (words >= 100) { score += 8; factors.push('Достаточный объём текста'); }

  return { score: Math.min(score, 100), factors };
}

/**
 * Analyze essay for growth trajectory signals
 */
function analyzeGrowth(text) {
  if (!text || text.trim().length === 0) return { score: 0, factors: ['Эссе не предоставлено'] };

  const factors = [];
  let score = 0;

  const kwCount = countKeywords(text, [...GROWTH_KEYWORDS_RU, ...GROWTH_KEYWORDS_EN]);

  if (kwCount >= 6) { score += 30; factors.push(`Явная траектория роста (${kwCount} маркеров)`); }
  else if (kwCount >= 3) { score += 20; factors.push(`Умеренные сигналы роста (${kwCount})`); }
  else if (kwCount >= 1) { score += 10; factors.push(`Слабые сигналы роста (${kwCount})`); }
  else { factors.push('Маркеры роста не обнаружены'); }

  // Before/after narrative
  const contrastWords = countKeywords(text, [
    'раньше.*теперь', 'сначала.*потом', 'до этого.*после',
    'before.*after', 'used to.*now', 'initially.*eventually'
  ]);
  // Simple check: has both "before" and "after" type words
  const hasBefore = countKeywords(text, ['раньше', 'сначала', 'до этого', 'before', 'used to', 'initially']);
  const hasAfter = countKeywords(text, ['теперь', 'сейчас', 'потом', 'после', 'now', 'eventually', 'today']);
  if (hasBefore >= 1 && hasAfter >= 1) { score += 25; factors.push('Нарратив трансформации (было → стало)'); }

  // Vulnerability / honesty about failures
  const vulnerabilityWords = countKeywords(text, [
    'ошиб', 'неудач', 'провал', 'не получилось', 'трудно', 'сложно',
    'страх', 'сомнен', 'mistake', 'failure', 'failed', 'difficult', 'fear', 'doubt'
  ]);
  if (vulnerabilityWords >= 2) { score += 20; factors.push('Открытость о неудачах — признак зрелости'); }
  else if (vulnerabilityWords >= 1) { score += 12; factors.push('Есть признание трудностей'); }

  // Self-awareness
  const selfAwareness = countKeywords(text, [
    'понял', 'осознал', 'узнал о себе', 'слабая сторона', 'сильная сторона',
    'realized', 'understood', 'learned about myself', 'weakness', 'strength'
  ]);
  if (selfAwareness >= 2) { score += 20; factors.push('Высокая самосознанность'); }
  else if (selfAwareness >= 1) { score += 10; factors.push('Есть элементы рефлексии'); }

  return { score: Math.min(score, 100), factors };
}

/**
 * Detect potential AI-generated text
 * Returns 0 (likely human) to 100 (likely AI)
 */
function detectAI(text) {
  if (!text || text.trim().length === 0) return { score: 0, factors: ['Текст не предоставлен'] };

  const factors = [];
  let aiScore = 0;

  // AI markers
  const aiMarkerCount = countKeywords(text, [...AI_MARKERS_RU, ...AI_MARKERS_EN]);
  if (aiMarkerCount >= 5) { aiScore += 30; factors.push(`Множество шаблонных фраз ИИ (${aiMarkerCount})`); }
  else if (aiMarkerCount >= 3) { aiScore += 20; factors.push(`Есть шаблонные фразы (${aiMarkerCount})`); }
  else if (aiMarkerCount >= 1) { aiScore += 8; factors.push(`Незначительное кол-во шаблонов (${aiMarkerCount})`); }

  // Vocabulary uniformity (AI tends to be very uniform)
  const uniqueRatio = uniqueWordRatio(text);
  if (uniqueRatio > 0.75) { factors.push('Высокое лексическое разнообразие (вероятно человек)'); }
  else if (uniqueRatio < 0.5) { aiScore += 15; factors.push('Низкое лексическое разнообразие'); }

  // Sentence length variance (AI tends to be more uniform)
  const slVariance = sentenceLengthVariance(text);
  if (slVariance < 3) { aiScore += 15; factors.push('Однородная длина предложений (признак ИИ)'); }
  else if (slVariance > 8) { factors.push('Естественная вариативность длины предложений'); }

  // Average word length (AI tends to use longer words)
  const avgWL = avgWordLength(text);
  if (avgWL > 7) { aiScore += 10; factors.push('Повышенная средняя длина слов'); }

  // Authenticity markers (reduce AI score)
  const authCount = countKeywords(text, [...AUTHENTICITY_MARKERS_RU, ...AUTHENTICITY_MARKERS_EN]);
  if (authCount >= 5) { aiScore -= 20; factors.push(`Много личных деталей (${authCount}) — признак аутентичности`); }
  else if (authCount >= 2) { aiScore -= 10; factors.push(`Есть личные детали (${authCount})`); }

  // Perfect grammar with no colloquialisms (AI marker)
  const colloquial = countKeywords(text, [
    'короче', 'типа', 'ну', 'вообще', 'прям', 'реально', 'кстати',
    'like', 'kinda', 'gonna', 'basically', 'honestly', 'actually'
  ]);
  if (colloquial >= 2) { aiScore -= 10; factors.push('Разговорные элементы — признак живой речи'); }

  // Excessive use of transition words (AI marker)
  const transitions = countKeywords(text, [
    'кроме того', 'более того', 'помимо этого', 'в дополнение',
    'furthermore', 'moreover', 'additionally', 'in addition'
  ]);
  if (transitions >= 3) { aiScore += 15; factors.push('Чрезмерное использование связок (признак ИИ)'); }

  return { score: Math.max(0, Math.min(aiScore, 100)), factors };
}

/**
 * Calculate authenticity score (inverse of AI + personal touch)
 */
function analyzeAuthenticity(text) {
  if (!text || text.trim().length === 0) return { score: 0, factors: ['Текст не предоставлен'] };

  const aiResult = detectAI(text);
  const factors = [];
  let score = Math.max(0, 100 - aiResult.score);

  const authCount = countKeywords(text, [...AUTHENTICITY_MARKERS_RU, ...AUTHENTICITY_MARKERS_EN]);
  if (authCount >= 5) { score = Math.min(score + 15, 100); factors.push('Богатый личный контекст'); }
  else if (authCount >= 2) { score = Math.min(score + 8, 100); factors.push('Есть личные элементы'); }

  // Unique voice indicators
  const exclamations = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  if (exclamations >= 2 || questions >= 2) {
    score = Math.min(score + 5, 100);
    factors.push('Эмоциональная пунктуация — признак живого голоса');
  }

  factors.push(...aiResult.factors);

  return { score: Math.min(score, 100), factors };
}

/**
 * Full text analysis combining all dimensions
 */
function analyzeEssays(candidate) {
  const allText = [
    candidate.essay_motivation || '',
    candidate.essay_leadership || '',
    candidate.essay_goals || ''
  ].join(' ');

  return {
    leadership: analyzeLeadership(candidate.essay_leadership || allText),
    motivation: analyzeMotivation(candidate.essay_motivation || allText),
    growth: analyzeGrowth(allText),
    aiDetection: detectAI(allText),
    authenticity: analyzeAuthenticity(allText),
  };
}

module.exports = {
  analyzeEssays,
  analyzeLeadership,
  analyzeMotivation,
  analyzeGrowth,
  detectAI,
  analyzeAuthenticity,
  wordCount,
  sentenceCount,
};
