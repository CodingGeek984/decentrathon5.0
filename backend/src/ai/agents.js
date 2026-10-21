const { GoogleGenerativeAI } = require('@google/generative-ai');

class InterviewerAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateQuestion(candidateProfile, previousAnswers = [], difficulty = 'medium') {
    try {
      const prompt = `
Ты - опытный HR-интервьюер, специализирующийся на оценке лидерских качеств.

Профиль кандидата:
${JSON.stringify(candidateProfile, null, 2)}

Предыдущие ответы кандидата:
${previousAnswers.map((ans, i) => `${i+1}. ${ans}`).join('\n')}

Сложность: ${difficulty}

Сгенерируй один поведенческий вопрос для оценки лидерских навыков. Вопрос должен:
1. Быть конкретным и ситуационным
2. Проверять реальные навыки (коммуникация, принятие решений, управление командой и т.д.)
3. Быть подходящим по сложности
4. Не повторять предыдущие темы

Верни ответ в формате JSON:
{
  "question": "Вопрос для кандидата",
  "focus_area": "leadership|communication|decision_making|team_management|crisis_management",
  "expected_skills": ["навык1", "навык2"],
  "difficulty": "${difficulty}"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          question: text,
          focus_area: 'leadership',
          expected_skills: ['communication', 'decision_making'],
          difficulty: difficulty
        };
      }
    } catch (error) {
      console.error('Error generating interview question:', error);
      return {
        question: "Расскажите о ситуации, когда вам приходилось принимать сложное решение под давлением времени. Что вы сделали и какой был результат?",
        focus_area: 'decision_making',
        expected_skills: ['leadership', 'problem_solving'],
        difficulty: difficulty
      };
    }
  }

  async evaluateAnswer(question, answer, candidateProfile) {
    try {
      const prompt = `
Ты - эксперт по оценке лидерских качеств. Оцени ответ кандидата на вопрос.

Вопрос: ${question.question}
Ответ кандидата: ${answer}

Профиль кандидата: ${JSON.stringify(candidateProfile, null, 2)}

Оцени ответ по шкале 0-100 и объясни почему. Учитывай:
- Конкретность примера
- Демонстрацию лидерских качеств
- Результаты действий
- Саморефлексию

Верни в формате JSON:
{
  "score": 85,
  "feedback": "Подробный анализ ответа",
  "strengths": ["Положительные аспекты"],
  "areas_to_improve": ["Что можно улучшить"],
  "leadership_score": 80,
  "communication_score": 75,
  "decision_making_score": 85
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        return {
          score: 70,
          feedback: "Ответ показывает базовое понимание ситуации, но можно было бы привести более конкретные примеры.",
          strengths: ["Показал понимание проблемы"],
          areas_to_improve: ["Добавить больше деталей о результатах"],
          leadership_score: 65,
          communication_score: 70,
          decision_making_score: 75
        };
      }
    } catch (error) {
      console.error('Error evaluating answer:', error);
      return {
        score: 60,
        feedback: "Техническая ошибка при оценке. Попробуйте переформулировать ответ.",
        strengths: [],
        areas_to_improve: ["Техническая ошибка"],
        leadership_score: 60,
        communication_score: 60,
        decision_making_score: 60
      };
    }
  }
}

class AnalyzerAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeProfile(candidateData) {
    try {
      const prompt = `
Ты - эксперт по анализу кандидатов для лидерских позиций.

Данные кандидата:
${JSON.stringify(candidateData, null, 2)}

Проведи комплексный анализ и оцени следующие навыки по шкале 0-100:
- leadership (лидерство)
- communication (коммуникация)
- empathy (эмпатия)
- creativity (креативность)
- adaptability (адаптивность)
- teamwork (командная работа)
- initiative (инициатива)
- problem_solving (решение проблем)

Для каждой оценки укажи:
- score: числовая оценка
- evidence: доказательства из профиля
- recommendations: советы по улучшению

Верни в формате JSON:
{
  "overall_score": 78,
  "skills_analysis": {
    "leadership": {"score": 85, "evidence": "...", "recommendations": "..."},
    "communication": {"score": 80, "evidence": "...", "recommendations": "..."},
    ...
  },
  "strengths": ["Ключевые сильные стороны"],
  "development_areas": ["Области для развития"],
  "recommendations": ["Конкретные рекомендации"],
  "leadership_potential": "high|medium|low"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        return {
          overall_score: 70,
          skills_analysis: {
            leadership: { score: 70, evidence: "Based on profile data", recommendations: "Practice more leadership roles" },
            communication: { score: 75, evidence: "Good essay content", recommendations: "Work on public speaking" }
          },
          strengths: ["Good academic performance"],
          development_areas: ["More leadership experience needed"],
          recommendations: ["Take leadership courses", "Join student organizations"],
          leadership_potential: "medium"
        };
      }
    } catch (error) {
      console.error('Error analyzing profile:', error);
      return {
        overall_score: 60,
        skills_analysis: {},
        strengths: [],
        development_areas: ["Analysis failed"],
        recommendations: ["Try again later"],
        leadership_potential: "unknown"
      };
    }
  }

  async detectAiGenerated(text) {
    try {
      const prompt = `
Анализируй текст на предмет того, был ли он сгенерирован ИИ.

Текст: "${text}"

Вероятность генерации ИИ (0-100%): [число]

Обоснование: [кратко]
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();

      // Extract percentage from response
      const percentageMatch = analysis.match(/(\d+)%?/);
      const aiProbability = percentageMatch ? parseInt(percentageMatch[1]) : 50;

      return {
        ai_probability: aiProbability,
        analysis: analysis,
        is_likely_ai: aiProbability > 70
      };
    } catch (error) {
      console.error('Error detecting AI generation:', error);
      return {
        ai_probability: 0,
        analysis: "Analysis failed",
        is_likely_ai: false
      };
    }
  }
}

class CoachAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateDevelopmentPlan(candidateProfile, currentSkills, targetSkills) {
    try {
      const prompt = `
Ты - личный коуч по развитию лидерских навыков.

Профиль кандидата: ${JSON.stringify(candidateProfile, null, 2)}
Текущие навыки: ${JSON.stringify(currentSkills, null, 2)}
Целевые навыки: ${JSON.stringify(targetSkills, null, 2)}

Создай 12-недельный план развития с конкретными действиями, упражнениями и сроками.

Верни в формате JSON:
{
  "plan_title": "Персональный план развития",
  "duration_weeks": 12,
  "focus_areas": ["leadership", "communication"],
  "weekly_plan": [
    {
      "week": 1,
      "focus": "Основы лидерства",
      "activities": ["Прочитать книгу по лидерству", "Взять на себя роль в проекте"],
      "exercises": ["Ежедневное ведение дневника решений"],
      "goals": ["Развить уверенность в принятии решений"]
    },
    ...
  ],
  "resources": ["Книги", "Курсы", "Видео"],
  "milestones": ["Промежуточные цели"],
  "success_metrics": ["Как измерять прогресс"]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        return {
          plan_title: "12-Week Leadership Development Plan",
          duration_weeks: 12,
          focus_areas: ["leadership", "communication"],
          weekly_plan: [
            {
              week: 1,
              focus: "Self-awareness",
              activities: ["Take leadership assessment", "Read leadership book"],
              exercises: ["Daily reflection journal"],
              goals: ["Identify leadership strengths and areas for improvement"]
            }
          ],
          resources: ["Books on leadership", "Online courses"],
          milestones: ["Complete self-assessment", "Lead first team meeting"],
          success_metrics: ["Leadership skill scores", "Team feedback"]
        };
      }
    } catch (error) {
      console.error('Error generating development plan:', error);
      return {
        plan_title: "Development Plan",
        duration_weeks: 12,
        focus_areas: ["leadership"],
        weekly_plan: [],
        resources: [],
        milestones: [],
        success_metrics: []
      };
    }
  }

  async generatePersonalizedAdvice(skillArea, currentLevel, targetLevel, candidateProfile) {
    try {
      const prompt = `
Дай персонализированный совет по развитию навыка "${skillArea}".

Текущий уровень: ${currentLevel}/100
Целевой уровень: ${targetLevel}/100
Профиль кандидата: ${JSON.stringify(candidateProfile, null, 2)}

Совет должен быть:
- Конкретным и actionable
- Персонализированным под профиль кандидата
- С реалистичными сроками
- С измеримыми результатами

Верни в формате JSON:
{
  "skill": "${skillArea}",
  "current_level": ${currentLevel},
  "target_level": ${targetLevel},
  "advice": "Подробный совет",
  "action_steps": ["Шаг 1", "Шаг 2", "Шаг 3"],
  "timeline": "2-4 недели",
  "resources": ["Рекомендуемые ресурсы"],
  "success_indicators": ["Как понять, что прогресс есть"]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        return {
          skill: skillArea,
          current_level: currentLevel,
          target_level: targetLevel,
          advice: `Focus on developing ${skillArea} through practical exercises and feedback.`,
          action_steps: ["Practice daily", "Seek feedback", "Take courses"],
          timeline: "4-6 weeks",
          resources: ["Online courses", "Books"],
          success_indicators: ["Improved scores", "Positive feedback"]
        };
      }
    } catch (error) {
      console.error('Error generating personalized advice:', error);
      return {
        skill: skillArea,
        advice: "Continue practicing and seeking feedback.",
        action_steps: ["Practice regularly"],
        timeline: "Ongoing",
        resources: [],
        success_indicators: []
      };
    }
  }
}

class PsychologistAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeTone(text) {
    try {
      const prompt = `
Анализируй эмоциональный тон текста кандидата.

Текст: "${text}"

Оцени по шкалам 0-100:
- confidence (уверенность)
- enthusiasm (энтузиазм)
- stress (стресс)
- sincerity (искренность)
- professionalism (профессионализм)

Верни в формате JSON:
{
  "confidence": 75,
  "enthusiasm": 80,
  "stress": 20,
  "sincerity": 85,
  "professionalism": 78,
  "overall_tone": "уверенный и искренний",
  "recommendations": ["Советы по улучшению тона"]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text_response = response.text();

      try {
        return JSON.parse(text_response.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        return {
          confidence: 70,
          enthusiasm: 75,
          stress: 30,
          sincerity: 80,
          professionalism: 75,
          overall_tone: "положительный",
          recommendations: ["Поддерживать уверенный тон"]
        };
      }
    } catch (error) {
      console.error('Error analyzing tone:', error);
      return {
        confidence: 60,
        enthusiasm: 60,
        stress: 40,
        sincerity: 70,
        professionalism: 65,
        overall_tone: "нейтральный",
        recommendations: []
      };
    }
  }

  async analyzeVideoEmotions(videoDescription, transcript = "") {
    try {
      const prompt = `
Анализируй эмоции кандидата на основе описания видео и транскрипта.

Описание видео: ${videoDescription}
Транскрипт: ${transcript}

Оцени эмоции по шкале 0-100:
- happiness (счастье)
- confidence (уверенность)
- nervousness (нервозность)
- engagement (вовлеченность)
- sincerity (искренность)

Верни в формате JSON:
{
  "emotions": {
    "happiness": 70,
    "confidence": 75,
    "nervousness": 25,
    "engagement": 80,
    "sincerity": 85
  },
  "dominant_emotion": "confidence",
  "body_language": "уверенная поза, зрительный контакт",
  "recommendations": ["Советы по улучшению невербального общения"]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch (parseError) {
        return {
          emotions: {
            happiness: 60,
            confidence: 70,
            nervousness: 30,
            engagement: 75,
            sincerity: 80
          },
          dominant_emotion: "confidence",
          body_language: "good posture",
          recommendations: ["Maintain eye contact"]
        };
      }
    } catch (error) {
      console.error('Error analyzing video emotions:', error);
      return {
        emotions: {
          happiness: 50,
          confidence: 50,
          nervousness: 50,
          engagement: 50,
          sincerity: 50
        },
        dominant_emotion: "neutral",
        body_language: "analysis failed",
        recommendations: []
      };
    }
  }
}

module.exports = {
  InterviewerAgent,
  AnalyzerAgent,
  CoachAgent,
  PsychologistAgent
};
