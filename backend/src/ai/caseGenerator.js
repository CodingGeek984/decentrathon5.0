const { GoogleGenerativeAI } = require('@google/generative-ai');

class CaseGenerator {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  // Категории кейсов для развития лидерских навыков
  getCaseCategories() {
    return [
      'conflict_resolution',     // Разрешение конфликтов
      'decision_making',         // Принятие решений
      'team_dynamics',           // Динамика команды
      'crisis_management',       // Управление кризисом
      'change_management',       // Управление изменениями
      'resource_allocation',     // Распределение ресурсов
      'stakeholder_management',  // Управление заинтересованными сторонами
      'innovation_leadership'    // Лидерство в инновациях
    ];
  }

  async generateCase(category, difficulty = 'medium', targetSkills = []) {
    try {
      const prompt = `
Создай интерактивный кейс для развития лидерских навыков.

Категория: ${category}
Сложность: ${difficulty}
Целевые навыки: ${targetSkills.join(', ') || 'общие лидерские навыки'}

Кейс должен:
1. Быть реалистичным и актуальным
2. Иметь четкую проблему для решения
3. Требовать применения лидерских навыков
4. Иметь несколько вариантов решения
5. Быть подходящим по сложности

Структура кейса:
- title: Заголовок кейса
- description: Подробное описание ситуации
- problem: Конкретная проблема для решения
- context: Дополнительный контекст
- stakeholders: Задействованные стороны
- constraints: Ограничения и вызовы
- options: 3-4 варианта решения с плюсами/минусами
- optimal_solution: Лучшее решение (для оценки)
- skills_tested: Проверяемые навыки
- difficulty: Уровень сложности
- category: Категория кейса
- time_limit: Время на решение (минуты)

Верни в формате JSON.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const caseData = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());

        // Добавляем метаданные
        caseData.id = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        caseData.created_at = new Date().toISOString();
        caseData.category = category;
        caseData.difficulty = difficulty;

        return caseData;
      } catch (parseError) {
        // Fallback case structure
        return this.generateFallbackCase(category, difficulty);
      }
    } catch (error) {
      console.error('Error generating case:', error);
      return this.generateFallbackCase(category, difficulty);
    }
  }

  generateFallbackCase(category, difficulty) {
    const fallbackCases = {
      conflict_resolution: {
        title: "Конфликт в команде разработчиков",
        description: "В вашей команде два senior разработчика постоянно спорят о технических решениях. Это влияет на сроки проекта и демотивирует junior'ов.",
        problem: "Как разрешить конфликт между senior разработчиками?",
        context: "Проект на финальной стадии, сроки горят, команда из 8 человек.",
        stakeholders: ["Senior dev A", "Senior dev B", "Junior devs", "Project manager", "Client"],
        constraints: ["Ограниченное время", "Нельзя уволить никого", "Надо сохранить экспертизу"],
        options: [
          {
            id: "option_1",
            text: "Провести индивидуальные встречи и найти компромисс",
            pros: ["Сохраняет команду", "Развивает навыки коммуникации"],
            cons: ["Требует времени", "Может не решить проблему полностью"]
          },
          {
            id: "option_2",
            text: "Назначить технического лидера для принятия решений",
            pros: ["Быстрое решение", "Четкая ответственность"],
            cons: ["Может демотивировать одного из senior'ов"]
          }
        ],
        optimal_solution: "option_1",
        skills_tested: ["communication", "conflict_resolution", "team_management"],
        time_limit: 15
      },

      decision_making: {
        title: "Срочное решение о релизе",
        description: "Обнаружен критический баг за день до релиза. Исправление займет 2 дня, но конкурент уже анонсировал похожий продукт.",
        problem: "Выпускать продукт с багом или отложить релиз?",
        context: "Startup на ранней стадии, важный рынок, ограниченный бюджет.",
        stakeholders: ["CEO", "Development team", "Marketing", "Users", "Investors"],
        constraints: ["Время", "Бюджет", "Конкуренция"],
        options: [
          {
            id: "option_1",
            text: "Отложить релиз и исправить баг",
            pros: ["Качественный продукт", "Хорошая репутация"],
            cons: ["Упущенная возможность", "Дополнительные расходы"]
          },
          {
            id: "option_2",
            text: "Выпустить с временным обходом бага",
            pros: ["Своевременный релиз", "Конкурентное преимущество"],
            cons: ["Риски для репутации", "Потенциальные проблемы пользователей"]
          }
        ],
        optimal_solution: "option_1",
        skills_tested: ["decision_making", "risk_assessment", "stakeholder_management"],
        time_limit: 10
      }
    };

    const baseCase = fallbackCases[category] || fallbackCases.conflict_resolution;
    return {
      ...baseCase,
      id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      category,
      difficulty
    };
  }

  async evaluateCaseSolution(caseId, userSolution, userProfile) {
    try {
      // Получить кейс из базы данных (здесь заглушка)
      const caseData = await this.getCaseById(caseId);

      const prompt = `
Оцени решение пользователя для кейса.

Кейс: ${JSON.stringify(caseData, null, 2)}
Решение пользователя: ${userSolution}
Профиль пользователя: ${JSON.stringify(userProfile, null, 2)}

Оцени по шкале 0-100:
- strategic_thinking: Стратегическое мышление
- leadership: Лидерство
- problem_solving: Решение проблем
- communication: Коммуникация
- risk_assessment: Оценка рисков

Дай подробный фидбек и рекомендации.

Верни в формате JSON:
{
  "overall_score": 85,
  "scores": {
    "strategic_thinking": 80,
    "leadership": 85,
    "problem_solving": 75,
    "communication": 90,
    "risk_assessment": 80
  },
  "feedback": "Подробный анализ решения",
  "strengths": ["Сильные стороны"],
  "improvements": ["Что можно улучшить"],
  "recommendations": ["Конкретные советы"],
  "optimal_match": true/false
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        return {
          overall_score: 75,
          scores: {
            strategic_thinking: 70,
            leadership: 75,
            problem_solving: 70,
            communication: 80,
            risk_assessment: 75
          },
          feedback: "Хорошее решение с потенциалом для улучшения.",
          strengths: ["Четкая логика"],
          improvements: ["Учесть больше факторов"],
          recommendations: ["Добавить анализ рисков"],
          optimal_match: false
        };
      }
    } catch (error) {
      console.error('Error evaluating case solution:', error);
      return {
        overall_score: 60,
        scores: {},
        feedback: "Ошибка при оценке решения.",
        strengths: [],
        improvements: [],
        recommendations: [],
        optimal_match: false
      };
    }
  }

  async getCaseById(caseId) {
    // В реальном приложении здесь будет запрос к БД
    // Пока возвращаем заглушку
    return {
      title: "Sample Case",
      description: "Sample description",
      problem: "Sample problem",
      optimal_solution: "option_1"
    };
  }

  async generateAdaptiveCase(userProfile, previousPerformance = []) {
    try {
      // Анализируем предыдущие результаты для адаптации сложности
      const avgScore = previousPerformance.length > 0
        ? previousPerformance.reduce((sum, p) => sum + p.score, 0) / previousPerformance.length
        : 70;

      const difficulty = avgScore > 80 ? 'hard' : avgScore > 60 ? 'medium' : 'easy';

      // Выбираем категорию на основе слабых мест пользователя
      const weakSkills = this.identifyWeakSkills(userProfile, previousPerformance);
      const category = this.selectBestCategory(weakSkills);

      return await this.generateCase(category, difficulty, weakSkills);
    } catch (error) {
      console.error('Error generating adaptive case:', error);
      return this.generateFallbackCase('decision_making', 'medium');
    }
  }

  identifyWeakSkills(userProfile, previousPerformance) {
    // Анализируем предыдущие результаты для определения слабых навыков
    const skillScores = {};

    previousPerformance.forEach(perf => {
      if (perf.scores) {
        Object.entries(perf.scores).forEach(([skill, score]) => {
          skillScores[skill] = (skillScores[skill] || 0) + score;
        });
      }
    });

    // Находим навыки со средним баллом ниже 70
    return Object.entries(skillScores)
      .filter(([skill, totalScore]) => (totalScore / previousPerformance.length) < 70)
      .map(([skill]) => skill);
  }

  selectBestCategory(weakSkills) {
    const skillToCategoryMap = {
      communication: 'team_dynamics',
      leadership: 'crisis_management',
      problem_solving: 'decision_making',
      strategic_thinking: 'change_management',
      risk_assessment: 'resource_allocation'
    };

    // Выбираем категорию на основе самого слабого навыка
    const primaryWeakSkill = weakSkills[0] || 'leadership';
    return skillToCategoryMap[primaryWeakSkill] || 'conflict_resolution';
  }

  async generateCaseSeries(userProfile, seriesLength = 5) {
    try {
      const series = [];
      let previousPerformance = [];

      for (let i = 0; i < seriesLength; i++) {
        const caseData = await this.generateAdaptiveCase(userProfile, previousPerformance);

        // Симулируем оценку для следующего кейса (в реальности будет от пользователя)
        const mockPerformance = {
          score: 70 + Math.random() * 30,
          scores: {
            strategic_thinking: 65 + Math.random() * 35,
            leadership: 65 + Math.random() * 35,
            problem_solving: 65 + Math.random() * 35,
            communication: 65 + Math.random() * 35,
            risk_assessment: 65 + Math.random() * 35
          }
        };

        previousPerformance.push(mockPerformance);
        series.push(caseData);
      }

      return {
        series_id: `series_${Date.now()}`,
        cases: series,
        total_cases: seriesLength,
        estimated_time: seriesLength * 15, // 15 минут на кейс
        focus_areas: this.identifyWeakSkills(userProfile, previousPerformance)
      };
    } catch (error) {
      console.error('Error generating case series:', error);
      return {
        series_id: `series_${Date.now()}`,
        cases: [],
        total_cases: 0,
        estimated_time: 0,
        focus_areas: []
      };
    }
  }
}

module.exports = CaseGenerator;
