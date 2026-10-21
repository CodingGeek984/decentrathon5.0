const db = require('../database');

class AchievementSystem {
  constructor() {
    this.achievements = [
      {
        id: 'first_steps',
        title: 'Первые шаги',
        description: 'Пройдите первое интервью',
        icon: '🎯',
        category: 'getting_started',
        criteria: JSON.stringify({ interviews_completed: 1 }),
        points: 10
      },
      {
        id: 'case_solver',
        title: 'Решатель кейсов',
        description: 'Решите 5 кейсов',
        icon: '🧩',
        category: 'problem_solving',
        criteria: JSON.stringify({ cases_completed: 5 }),
        points: 25
      },
      {
        id: 'communication_master',
        title: 'Мастер коммуникации',
        description: 'Получите средний балл по коммуникации выше 80',
        icon: '💬',
        category: 'soft_skills',
        criteria: JSON.stringify({ avg_communication_score: 80 }),
        points: 30
      },
      {
        id: 'leadership_pioneer',
        title: 'Лидер-новатор',
        description: 'Получите средний балл по лидерству выше 85',
        icon: '👑',
        category: 'leadership',
        criteria: JSON.stringify({ avg_leadership_score: 85 }),
        points: 35
      },
      {
        id: 'perfect_score',
        title: 'Идеальный результат',
        description: 'Получите 100% за кейс или интервью',
        icon: '⭐',
        category: 'excellence',
        criteria: JSON.stringify({ perfect_scores: 1 }),
        points: 50
      },
      {
        id: 'consistent_performer',
        title: 'Последовательный исполнитель',
        description: 'Завершите 10 активностей с средним баллом выше 75',
        icon: '📈',
        category: 'consistency',
        criteria: JSON.stringify({ activities_completed: 10, avg_score: 75 }),
        points: 40
      },
      {
        id: 'team_player',
        title: 'Командный игрок',
        description: 'Получите высокие оценки по работе в команде',
        icon: '🤝',
        category: 'teamwork',
        criteria: JSON.stringify({ avg_teamwork_score: 80 }),
        points: 30
      },
      {
        id: 'growth_mindset',
        title: 'Рост мышления',
        description: 'Пройдите 3 коучинг сессии',
        icon: '🌱',
        category: 'development',
        criteria: JSON.stringify({ coaching_sessions: 3 }),
        points: 35
      },
      {
        id: 'skill_versatile',
        title: 'Универсальный навык',
        description: 'Развивайте все 6 soft skills выше 70 баллов',
        icon: '🎭',
        category: 'versatility',
        criteria: JSON.stringify({ all_skills_above: 70 }),
        points: 60
      },
      {
        id: 'decathlon_champion',
        title: 'Чемпион Decathlon',
        description: 'Завершите полную оценку лидерских качеств',
        icon: '🏆',
        category: 'completion',
        criteria: JSON.stringify({ full_assessment_completed: true }),
        points: 100
      }
    ];
  }

  // Инициализировать достижения в базе данных
  async initializeAchievements() {
    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO achievements (
          id, title, description, icon, category, criteria, points, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const achievement of this.achievements) {
        stmt.run(
          achievement.id,
          achievement.title,
          achievement.description,
          achievement.icon,
          achievement.category,
          achievement.criteria,
          achievement.points,
          new Date().toISOString()
        );
      }

      console.log('Achievements initialized successfully');
    } catch (error) {
      console.error('Error initializing achievements:', error);
    }
  }

  // Проверить достижения для пользователя
  async checkAchievements(userId) {
    try {
      const userStats = await this.getUserStats(userId);
      const unlockedAchievements = await this.getUnlockedAchievements(userId);
      const availableAchievements = await this.getAvailableAchievements(userId);

      const newlyUnlocked = [];

      for (const achievement of availableAchievements) {
        if (this.checkAchievementCriteria(achievement, userStats)) {
          await this.unlockAchievement(userId, achievement.id);
          newlyUnlocked.push(achievement);
        }
      }

      return {
        newly_unlocked: newlyUnlocked,
        total_unlocked: unlockedAchievements.length + newlyUnlocked.length,
        total_points: await this.calculateTotalPoints(userId)
      };
    } catch (error) {
      console.error('Error checking achievements:', error);
      return { newly_unlocked: [], total_unlocked: 0, total_points: 0 };
    }
  }

  // Получить статистику пользователя для проверки достижений
  async getUserStats(userId) {
    try {
      // Статистика интервью
      const interviewStats = db.prepare(`
        SELECT
          COUNT(*) as interviews_completed,
          AVG(score) as avg_interview_score,
          MAX(score) as max_interview_score,
          COUNT(CASE WHEN score = 100 THEN 1 END) as perfect_interview_scores
        FROM interview_history
        WHERE candidate_id = ?
      `).get(userId);

      // Статистика кейсов
      const caseStats = db.prepare(`
        SELECT
          COUNT(*) as cases_completed,
          AVG(score) as avg_case_score,
          MAX(score) as max_case_score,
          COUNT(CASE WHEN score = 100 THEN 1 END) as perfect_case_scores
        FROM user_case_results
        WHERE user_id = ?
      `).get(userId);

      // Статистика навыков
      const skillsStats = db.prepare(`
        SELECT
          AVG(leadership) as avg_leadership_score,
          AVG(communication) as avg_communication_score,
          AVG(empathy) as avg_empathy_score,
          AVG(creativity) as avg_creativity_score,
          AVG(adaptability) as avg_adaptability_score,
          AVG(teamwork) as avg_teamwork_score,
          MIN(leadership) as min_leadership,
          MIN(communication) as min_communication,
          MIN(empathy) as min_empathy,
          MIN(creativity) as min_creativity,
          MIN(adaptability) as min_adaptability,
          MIN(teamwork) as min_teamwork
        FROM soft_skills
        WHERE user_id = ?
      `).get(userId);

      // Статистика коучинга
      const coachingStats = db.prepare(`
        SELECT COUNT(*) as coaching_sessions
        FROM coaching_sessions
        WHERE user_id = ?
      `).get(userId);

      // Общая статистика
      const totalActivities = (interviewStats.interviews_completed || 0) + (caseStats.cases_completed || 0);
      const avgOverallScore = totalActivities > 0 ?
        ((interviewStats.avg_interview_score || 0) * (interviewStats.interviews_completed || 0) +
         (caseStats.avg_case_score || 0) * (caseStats.cases_completed || 0)) / totalActivities : 0;

      const perfectScores = (interviewStats.perfect_interview_scores || 0) + (caseStats.perfect_case_scores || 0);

      return {
        interviews_completed: interviewStats.interviews_completed || 0,
        cases_completed: caseStats.cases_completed || 0,
        activities_completed: totalActivities,
        avg_overall_score: avgOverallScore,
        perfect_scores: perfectScores,
        avg_leadership_score: skillsStats.avg_leadership_score || 0,
        avg_communication_score: skillsStats.avg_communication_score || 0,
        avg_empathy_score: skillsStats.avg_empathy_score || 0,
        avg_creativity_score: skillsStats.avg_creativity_score || 0,
        avg_adaptability_score: skillsStats.avg_adaptability_score || 0,
        avg_teamwork_score: skillsStats.avg_teamwork_score || 0,
        coaching_sessions: coachingStats.coaching_sessions || 0,
        all_skills_above_70: this.checkAllSkillsAboveThreshold(skillsStats, 70),
        full_assessment_completed: this.checkFullAssessmentCompleted(userId)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {};
    }
  }

  // Проверить критерии достижения
  checkAchievementCriteria(achievement, userStats) {
    const criteria = JSON.parse(achievement.criteria || '{}');

    switch (achievement.id) {
      case 'first_steps':
        return userStats.interviews_completed >= (criteria.interviews_completed || 1);

      case 'case_solver':
        return userStats.cases_completed >= (criteria.cases_completed || 5);

      case 'communication_master':
        return userStats.avg_communication_score >= (criteria.avg_communication_score || 80);

      case 'leadership_pioneer':
        return userStats.avg_leadership_score >= (criteria.avg_leadership_score || 85);

      case 'perfect_score':
        return userStats.perfect_scores >= (criteria.perfect_scores || 1);

      case 'consistent_performer':
        return userStats.activities_completed >= (criteria.activities_completed || 10) &&
               userStats.avg_overall_score >= (criteria.avg_score || 75);

      case 'team_player':
        return userStats.avg_teamwork_score >= (criteria.avg_teamwork_score || 80);

      case 'growth_mindset':
        return userStats.coaching_sessions >= (criteria.coaching_sessions || 3);

      case 'skill_versatile':
        return userStats.all_skills_above_70;

      case 'decathlon_champion':
        return userStats.full_assessment_completed;

      default:
        return false;
    }
  }

  // Разблокировать достижение
  async unlockAchievement(userId, achievementId) {
    try {
      const stmt = db.prepare(`
        INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at)
        VALUES (?, ?, ?, ?)
      `);

      const unlockId = `unlock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      stmt.run(unlockId, userId, achievementId, new Date().toISOString());

      console.log(`Achievement ${achievementId} unlocked for user ${userId}`);
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }

  // Получить разблокированные достижения
  async getUnlockedAchievements(userId) {
    try {
      const stmt = db.prepare(`
        SELECT ua.*, a.title, a.description, a.icon, a.category, a.points
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ?
        ORDER BY ua.unlocked_at DESC
      `);

      return stmt.all(userId);
    } catch (error) {
      console.error('Error getting unlocked achievements:', error);
      return [];
    }
  }

  // Получить доступные достижения
  async getAvailableAchievements(userId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM achievements
        WHERE id NOT IN (
          SELECT achievement_id FROM user_achievements WHERE user_id = ?
        )
      `);

      return stmt.all(userId);
    } catch (error) {
      console.error('Error getting available achievements:', error);
      return [];
    }
  }

  // Рассчитать общее количество очков
  async calculateTotalPoints(userId) {
    try {
      const stmt = db.prepare(`
        SELECT SUM(a.points) as total_points
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ?
      `);

      const result = stmt.get(userId);
      return result.total_points || 0;
    } catch (error) {
      console.error('Error calculating total points:', error);
      return 0;
    }
  }

  // Вспомогательные методы
  checkAllSkillsAboveThreshold(skillsStats, threshold) {
    return (skillsStats.min_leadership || 0) >= threshold &&
           (skillsStats.min_communication || 0) >= threshold &&
           (skillsStats.min_empathy || 0) >= threshold &&
           (skillsStats.min_creativity || 0) >= threshold &&
           (skillsStats.min_adaptability || 0) >= threshold &&
           (skillsStats.min_teamwork || 0) >= threshold;
  }

  checkFullAssessmentCompleted(userId) {
    // Проверка на завершение полной оценки (интервью + кейсы + анализ навыков)
    const interviewCount = db.prepare('SELECT COUNT(*) as count FROM interview_history WHERE candidate_id = ?').get(userId).count;
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM user_case_results WHERE user_id = ?').get(userId).count;
    const skillsCount = db.prepare('SELECT COUNT(*) as count FROM soft_skills WHERE user_id = ?').get(userId).count;

    return interviewCount >= 3 && caseCount >= 5 && skillsCount >= 1;
  }
}

class CertificateGenerator {
  constructor() {
    this.certificates = [
      {
        id: 'leadership_assessment',
        title: 'Сертификат оценки лидерских качеств',
        description: 'Подтверждает прохождение комплексной оценки лидерских навыков',
        requirements: JSON.stringify({
          interviews_completed: 3,
          cases_completed: 5,
          avg_skill_score: 70
        })
      },
      {
        id: 'communication_excellence',
        title: 'Мастер коммуникации',
        description: 'Высокий уровень навыков коммуникации',
        requirements: JSON.stringify({
          avg_communication_score: 85,
          interviews_completed: 5
        })
      },
      {
        id: 'problem_solving_expert',
        title: 'Эксперт по решению проблем',
        description: 'Отличные навыки анализа и решения сложных задач',
        requirements: JSON.stringify({
          cases_completed: 10,
          avg_case_score: 80
        })
      },
      {
        id: 'team_leadership',
        title: 'Командный лидер',
        description: 'Превосходные навыки руководства командой',
        requirements: JSON.stringify({
          avg_leadership_score: 85,
          avg_teamwork_score: 80,
          coaching_sessions: 2
        })
      }
    ];
  }

  // Инициализировать сертификаты
  async initializeCertificates() {
    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO certificates (
          id, title, description, requirements, template_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const cert of this.certificates) {
        stmt.run(
          cert.id,
          cert.title,
          cert.description,
          cert.requirements,
          JSON.stringify({ design: 'default', colors: ['#1f2937', '#3b82f6'] }),
          new Date().toISOString()
        );
      }

      console.log('Certificates initialized successfully');
    } catch (error) {
      console.error('Error initializing certificates:', error);
    }
  }

  // Проверить доступные сертификаты для пользователя
  async checkAvailableCertificates(userId) {
    try {
      const userStats = await this.getUserStatsForCertificates(userId);
      const earnedCertificates = await this.getEarnedCertificates(userId);
      const availableCertificates = await this.getAvailableCertificates(userId);

      const newlyEarned = [];

      for (const cert of availableCertificates) {
        if (this.checkCertificateRequirements(cert, userStats)) {
          await this.awardCertificate(userId, cert.id);
          newlyEarned.push(cert);
        }
      }

      return {
        newly_earned: newlyEarned,
        total_earned: earnedCertificates.length + newlyEarned.length
      };
    } catch (error) {
      console.error('Error checking certificates:', error);
      return { newly_earned: [], total_earned: 0 };
    }
  }

  // Получить статистику пользователя для сертификатов
  async getUserStatsForCertificates(userId) {
    const interviewStats = db.prepare(`
      SELECT COUNT(*) as interviews_completed, AVG(score) as avg_interview_score
      FROM interview_history WHERE candidate_id = ?
    `).get(userId);

    const caseStats = db.prepare(`
      SELECT COUNT(*) as cases_completed, AVG(score) as avg_case_score
      FROM user_case_results WHERE user_id = ?
    `).get(userId);

    const skillsStats = db.prepare(`
      SELECT
        AVG(leadership) as avg_leadership_score,
        AVG(communication) as avg_communication_score,
        AVG(teamwork) as avg_teamwork_score
      FROM soft_skills WHERE user_id = ?
    `).get(userId);

    const coachingStats = db.prepare(`
      SELECT COUNT(*) as coaching_sessions
      FROM coaching_sessions WHERE user_id = ?
    `).get(userId);

    return {
      interviews_completed: interviewStats.interviews_completed || 0,
      avg_interview_score: interviewStats.avg_interview_score || 0,
      cases_completed: caseStats.cases_completed || 0,
      avg_case_score: caseStats.avg_case_score || 0,
      avg_leadership_score: skillsStats.avg_leadership_score || 0,
      avg_communication_score: skillsStats.avg_communication_score || 0,
      avg_teamwork_score: skillsStats.avg_teamwork_score || 0,
      coaching_sessions: coachingStats.coaching_sessions || 0
    };
  }

  // Проверить требования сертификата
  checkCertificateRequirements(certificate, userStats) {
    const requirements = JSON.parse(certificate.requirements || '{}');

    for (const [key, value] of Object.entries(requirements)) {
      if ((userStats[key] || 0) < value) {
        return false;
      }
    }

    return true;
  }

  // Выдать сертификат
  async awardCertificate(userId, certificateId) {
    try {
      const stmt = db.prepare(`
        INSERT INTO user_certificates (
          id, user_id, certificate_id, awarded_at, certificate_data
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const awardId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      stmt.run(
        awardId,
        userId,
        certificateId,
        new Date().toISOString(),
        JSON.stringify({
          generated: true,
          format: 'digital',
          verification_code: this.generateVerificationCode()
        })
      );

      console.log(`Certificate ${certificateId} awarded to user ${userId}`);
    } catch (error) {
      console.error('Error awarding certificate:', error);
    }
  }

  // Получить заработанные сертификаты
  async getEarnedCertificates(userId) {
    try {
      const stmt = db.prepare(`
        SELECT uc.*, c.title, c.description
        FROM user_certificates uc
        JOIN certificates c ON uc.certificate_id = c.id
        WHERE uc.user_id = ?
        ORDER BY uc.awarded_at DESC
      `);

      return stmt.all(userId);
    } catch (error) {
      console.error('Error getting earned certificates:', error);
      return [];
    }
  }

  // Получить доступные сертификаты
  async getAvailableCertificates(userId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM certificates
        WHERE id NOT IN (
          SELECT certificate_id FROM user_certificates WHERE user_id = ?
        )
      `);

      return stmt.all(userId);
    } catch (error) {
      console.error('Error getting available certificates:', error);
      return [];
    }
  }

  // Сгенерировать код верификации
  generateVerificationCode() {
    return 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase() +
           '-' + Date.now().toString(36).toUpperCase();
  }

  // Сгенерировать PDF сертификата (заглушка для будущего развития)
  async generateCertificatePDF(userId, certificateId) {
    // В будущем здесь будет генерация PDF
    return {
      filename: `certificate_${certificateId}_${userId}.pdf`,
      data: 'PDF_DATA_PLACEHOLDER'
    };
  }
}

class LeaderboardSystem {
  constructor() {
    this.updateInterval = 1000 * 60 * 15; // Обновление каждые 15 минут
  }

  // Рассчитать и обновить лидерборд
  async updateLeaderboard(category = 'overall') {
    try {
      let query, params;

      switch (category) {
        case 'leadership':
          query = `
            SELECT
              c.id, c.name,
              AVG(ss.leadership) as score,
              COUNT(ss.id) as activities_count
            FROM candidates c
            JOIN soft_skills ss ON c.id = ss.user_id
            GROUP BY c.id, c.name
            HAVING activities_count > 0
            ORDER BY score DESC
            LIMIT 50
          `;
          params = [];
          break;

        case 'problem_solving':
          query = `
            SELECT
              c.id, c.name,
              AVG(ucr.score) as score,
              COUNT(ucr.id) as activities_count
            FROM candidates c
            JOIN user_case_results ucr ON c.id = ucr.user_id
            GROUP BY c.id, c.name
            HAVING activities_count > 0
            ORDER BY score DESC
            LIMIT 50
          `;
          params = [];
          break;

        case 'communication':
          query = `
            SELECT
              c.id, c.name,
              AVG(ss.communication) as score,
              COUNT(ss.id) as activities_count
            FROM candidates c
            JOIN soft_skills ss ON c.id = ss.user_id
            GROUP BY c.id, c.name
            HAVING activities_count > 0
            ORDER BY score DESC
            LIMIT 50
          `;
          params = [];
          break;

        default: // overall
          query = `
            SELECT
              c.id, c.name,
              (
                COALESCE(AVG(ih.score), 0) * 0.3 +
                COALESCE(AVG(ucr.score), 0) * 0.4 +
                COALESCE(AVG((ss.leadership + ss.communication + ss.empathy + ss.creativity + ss.adaptability + ss.teamwork) / 6), 0) * 0.3
              ) as score,
              (COUNT(DISTINCT ih.id) + COUNT(DISTINCT ucr.id)) as activities_count
            FROM candidates c
            LEFT JOIN interview_history ih ON c.id = ih.candidate_id
            LEFT JOIN user_case_results ucr ON c.id = ucr.user_id
            LEFT JOIN soft_skills ss ON c.id = ss.user_id
            GROUP BY c.id, c.name
            HAVING activities_count > 0
            ORDER BY score DESC
            LIMIT 50
          `;
          params = [];
      }

      const stmt = db.prepare(query);
      const rankings = stmt.all(...params);

      // Сохранить в таблицу лидерборда
      const deleteStmt = db.prepare('DELETE FROM leaderboard WHERE category = ?');
      deleteStmt.run(category);

      const insertStmt = db.prepare(`
        INSERT INTO leaderboard (id, user_id, user_name, score, rank, category, activities_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      rankings.forEach((ranking, index) => {
        const entryId = `lb_${category}_${Date.now()}_${index}`;
        insertStmt.run(
          entryId,
          ranking.id,
          ranking.name,
          Math.round(ranking.score * 100) / 100,
          index + 1,
          category,
          ranking.activities_count,
          new Date().toISOString()
        );
      });

      console.log(`Leaderboard updated for category: ${category}`);
      return rankings;
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return [];
    }
  }

  // Получить лидерборд
  async getLeaderboard(category = 'overall', limit = 10) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM leaderboard
        WHERE category = ?
        ORDER BY rank ASC
        LIMIT ?
      `);

      const rankings = stmt.all(category, limit);

      return {
        category,
        rankings,
        total_entries: rankings.length,
        last_updated: rankings[0]?.updated_at || null
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return { category, rankings: [], total_entries: 0, last_updated: null };
    }
  }

  // Получить позицию пользователя в лидерборде
  async getUserRank(userId, category = 'overall') {
    try {
      const stmt = db.prepare(`
        SELECT rank, score, activities_count
        FROM leaderboard
        WHERE category = ? AND user_id = ?
      `);

      const userRank = stmt.get(category, userId);

      if (userRank) {
        return {
          rank: userRank.rank,
          score: userRank.score,
          activities_count: userRank.activities_count,
          category
        };
      }

      // Если пользователь не в топ-50, рассчитать его позицию
      return await this.calculateUserRank(userId, category);
    } catch (error) {
      console.error('Error getting user rank:', error);
      return null;
    }
  }

  // Рассчитать позицию пользователя (если не в топ-50)
  async calculateUserRank(userId, category) {
    try {
      let scoreQuery, params;

      switch (category) {
        case 'leadership':
          scoreQuery = 'SELECT AVG(leadership) as score FROM soft_skills WHERE user_id = ?';
          params = [userId];
          break;
        case 'problem_solving':
          scoreQuery = 'SELECT AVG(score) as score FROM user_case_results WHERE user_id = ?';
          params = [userId];
          break;
        case 'communication':
          scoreQuery = 'SELECT AVG(communication) as score FROM soft_skills WHERE user_id = ?';
          params = [userId];
          break;
        default:
          scoreQuery = `
            SELECT (
              COALESCE(AVG(ih.score), 0) * 0.3 +
              COALESCE(AVG(ucr.score), 0) * 0.4 +
              COALESCE(AVG((ss.leadership + ss.communication + ss.empathy + ss.creativity + ss.adaptability + ss.teamwork) / 6), 0) * 0.3
            ) as score
            FROM candidates c
            LEFT JOIN interview_history ih ON c.id = ih.candidate_id
            LEFT JOIN user_case_results ucr ON c.id = ucr.user_id
            LEFT JOIN soft_skills ss ON c.id = ss.user_id
            WHERE c.id = ?
          `;
          params = [userId];
      }

      const scoreStmt = db.prepare(scoreQuery);
      const userScore = scoreStmt.get(...params);

      if (!userScore || !userScore.score) {
        return { rank: null, score: 0, category, note: 'insufficient_data' };
      }

      // Посчитать, сколько пользователей имеют более высокий балл
      let rankQuery, rankParams;

      switch (category) {
        case 'leadership':
          rankQuery = 'SELECT COUNT(*) as count FROM soft_skills WHERE AVG(leadership) > ?';
          rankParams = [userScore.score];
          break;
        case 'problem_solving':
          rankQuery = 'SELECT COUNT(*) as count FROM user_case_results WHERE AVG(score) > ?';
          rankParams = [userScore.score];
          break;
        case 'communication':
          rankQuery = 'SELECT COUNT(*) as count FROM soft_skills WHERE AVG(communication) > ?';
          rankParams = [userScore.score];
          break;
        default:
          rankQuery = `
            SELECT COUNT(*) as count FROM (
              SELECT c.id, (
                COALESCE(AVG(ih.score), 0) * 0.3 +
                COALESCE(AVG(ucr.score), 0) * 0.4 +
                COALESCE(AVG((ss.leadership + ss.communication + ss.empathy + ss.creativity + ss.adaptability + ss.teamwork) / 6), 0) * 0.3
              ) as total_score
              FROM candidates c
              LEFT JOIN interview_history ih ON c.id = ih.candidate_id
              LEFT JOIN user_case_results ucr ON c.id = ucr.user_id
              LEFT JOIN soft_skills ss ON c.id = ss.user_id
              GROUP BY c.id
              HAVING total_score > ?
            )
          `;
          rankParams = [userScore.score];
      }

      const rankStmt = db.prepare(rankQuery);
      const higherCount = rankStmt.get(...rankParams);

      return {
        rank: (higherCount.count || 0) + 1,
        score: Math.round(userScore.score * 100) / 100,
        category,
        note: 'calculated'
      };
    } catch (error) {
      console.error('Error calculating user rank:', error);
      return { rank: null, score: 0, category, note: 'error' };
    }
  }

  // Запустить автоматическое обновление лидербордов
  startAutoUpdate() {
    setInterval(async () => {
      try {
        await this.updateLeaderboard('overall');
        await this.updateLeaderboard('leadership');
        await this.updateLeaderboard('problem_solving');
        await this.updateLeaderboard('communication');
        console.log('Leaderboards auto-updated');
      } catch (error) {
        console.error('Error in leaderboard auto-update:', error);
      }
    }, this.updateInterval);
  }
}

// Экспорт классов
module.exports = {
  AchievementSystem,
  CertificateGenerator,
  LeaderboardSystem
};
