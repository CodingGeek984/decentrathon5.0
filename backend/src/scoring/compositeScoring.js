/**
 * Composite Scoring Engine
 * Combines text analysis and profile scoring into a final recommendation.
 * Fully explainable — every score comes with contributing factors.
 */

const { analyzeEssays } = require('./textAnalysis');
const { scoreProfile } = require('./profileScoring');

// Dimension weights (transparent and adjustable)
const WEIGHTS = {
  leadership_essay: 0.15,
  motivation_essay: 0.12,
  growth_trajectory: 0.12,
  authenticity: 0.10,
  academics: 0.12,
  extracurriculars: 0.12,
  leadership_roles: 0.15,
  ai_penalty: 0.12,  // negative weight (subtracted)
};

function getRecommendation(totalScore) {
  if (totalScore >= 80) return 'strong_yes';
  if (totalScore >= 65) return 'yes';
  if (totalScore >= 45) return 'maybe';
  if (totalScore >= 30) return 'no';
  return 'strong_no';
}

function getRecommendationLabel(rec) {
  const labels = {
    strong_yes: 'Настоятельно рекомендован',
    yes: 'Рекомендован',
    maybe: 'Требует дополнительного рассмотрения',
    no: 'Не рекомендован',
    strong_no: 'Категорически не рекомендован',
  };
  return labels[rec] || rec;
}

/**
 * Generate composite score for a candidate
 * Returns full breakdown with explanations
 */
function generateCompositeScore(candidate) {
  const textAnalysis = analyzeEssays(candidate);
  const profileScores = scoreProfile(candidate);

  // Individual dimension scores
  const dimensions = {
    leadership_essay: {
      score: textAnalysis.leadership.score,
      weight: WEIGHTS.leadership_essay,
      label: 'Лидерский потенциал (эссе)',
      factors: textAnalysis.leadership.factors,
    },
    motivation_essay: {
      score: textAnalysis.motivation.score,
      weight: WEIGHTS.motivation_essay,
      label: 'Мотивация (эссе)',
      factors: textAnalysis.motivation.factors,
    },
    growth_trajectory: {
      score: textAnalysis.growth.score,
      weight: WEIGHTS.growth_trajectory,
      label: 'Траектория роста',
      factors: textAnalysis.growth.factors,
    },
    authenticity: {
      score: textAnalysis.authenticity.score,
      weight: WEIGHTS.authenticity,
      label: 'Аутентичность текста',
      factors: textAnalysis.authenticity.factors,
    },
    academics: {
      score: profileScores.academics.score,
      weight: WEIGHTS.academics,
      label: 'Академическая успеваемость',
      factors: profileScores.academics.factors,
    },
    extracurriculars: {
      score: profileScores.extracurriculars.score,
      weight: WEIGHTS.extracurriculars,
      label: 'Внеучебная деятельность',
      factors: profileScores.extracurriculars.factors,
    },
    leadership_roles: {
      score: profileScores.leadershipRoles.score,
      weight: WEIGHTS.leadership_roles,
      label: 'Лидерские роли',
      factors: profileScores.leadershipRoles.factors,
    },
  };

  // Calculate weighted total
  let totalScore = 0;
  for (const dim of Object.values(dimensions)) {
    totalScore += dim.score * dim.weight;
  }

  // AI detection penalty
  const aiPenalty = textAnalysis.aiDetection.score * WEIGHTS.ai_penalty;
  totalScore = Math.max(0, totalScore - aiPenalty);

  const recommendation = getRecommendation(totalScore);

  // Generate summary
  const topFactors = [];
  for (const dim of Object.values(dimensions)) {
    if (dim.score >= 60) {
      topFactors.push(`✓ ${dim.label}: ${dim.factors[0]}`);
    }
  }
  if (textAnalysis.aiDetection.score >= 40) {
    topFactors.push(`⚠ Подозрение на ИИ-генерацию: ${textAnalysis.aiDetection.factors[0]}`);
  }

  const summary = topFactors.length > 0
    ? topFactors.join('\n')
    : 'Недостаточно данных для формирования подробной рекомендации.';

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    recommendation,
    recommendationLabel: getRecommendationLabel(recommendation),
    summary,
    dimensions,
    aiDetection: {
      score: textAnalysis.aiDetection.score,
      factors: textAnalysis.aiDetection.factors,
    },
    weights: WEIGHTS,
    leadershipPotential: Math.round((dimensions.leadership_essay.score * 0.5 + dimensions.leadership_roles.score * 0.5)),
    growthTrajectory: dimensions.growth_trajectory.score,
    motivationScore: dimensions.motivation_essay.score,
    authenticityScore: dimensions.authenticity.score,
  };
}

/**
 * Score and rank multiple candidates
 */
function rankCandidates(candidates) {
  const scored = candidates.map(c => ({
    candidate: c,
    ...generateCompositeScore(c),
  }));

  scored.sort((a, b) => b.totalScore - a.totalScore);

  scored.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scored;
}

module.exports = { generateCompositeScore, rankCandidates, WEIGHTS };
