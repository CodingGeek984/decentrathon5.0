import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Clock, Trophy, Target, Users, Lightbulb, AlertTriangle } from 'lucide-react';

const GameCasesPage = () => {
  const [currentCase, setCurrentCase] = useState(null);
  const [userSolution, setUserSolution] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [caseHistory, setCaseHistory] = useState([]);
  const [stats, setStats] = useState(null);

  // Получить статистику пользователя
  useEffect(() => {
    fetchUserStats();
    fetchCaseHistory();
  }, []);

  // Таймер
  useEffect(() => {
    if (timeLeft > 0 && currentCase && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, currentCase, isSubmitted]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/games/user/1/stats'); // TODO: заменить на реальный userId
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCaseHistory = async () => {
    try {
      const response = await fetch('/api/games/user/1/results'); // TODO: заменить на реальный userId
      const data = await response.json();
      if (data.success) {
        setCaseHistory(data.results);
      }
    } catch (error) {
      console.error('Error fetching case history:', error);
    }
  };

  const generateNewCase = async (category = 'conflict_resolution') => {
    setLoading(true);
    try {
      const response = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, difficulty: 'medium' })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentCase(data.case);
        setUserSolution('');
        setIsSubmitted(false);
        setEvaluation(null);
        setTimeLeft(data.case.time_limit * 60); // конвертировать минуты в секунды
      }
    } catch (error) {
      console.error('Error generating case:', error);
    }
    setLoading(false);
  };

  const submitSolution = async () => {
    if (!userSolution.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/games/${currentCase.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // TODO: заменить на реальный userId
          solution: userSolution,
          timeSpent: (currentCase.time_limit * 60) - timeLeft
        })
      });

      const data = await response.json();
      if (data.success) {
        setEvaluation(data.evaluation);
        setIsSubmitted(true);
        fetchUserStats(); // обновить статистику
        fetchCaseHistory(); // обновить историю
      }
    } catch (error) {
      console.error('Error submitting solution:', error);
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      conflict_resolution: <Users className="w-4 h-4" />,
      decision_making: <Target className="w-4 h-4" />,
      team_dynamics: <Users className="w-4 h-4" />,
      crisis_management: <AlertTriangle className="w-4 h-4" />,
      change_management: <Lightbulb className="w-4 h-4" />
    };
    return icons[category] || <Target className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎮 Лидерские кейсы
          </h1>
          <p className="text-gray-600">
            Развивайте навыки лидерства через интерактивные сценарии принятия решений
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Основная область кейса */}
          <div className="lg:col-span-2">
            {!currentCase ? (
              // Экран выбора кейса
              <Card>
                <CardHeader>
                  <CardTitle>Выберите категорию кейса</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: 'conflict_resolution', name: 'Разрешение конфликтов', icon: '🤝' },
                      { id: 'decision_making', name: 'Принятие решений', icon: '🎯' },
                      { id: 'team_dynamics', name: 'Динамика команды', icon: '👥' },
                      { id: 'crisis_management', name: 'Управление кризисом', icon: '⚡' },
                      { id: 'change_management', name: 'Управление изменениями', icon: '🔄' },
                      { id: 'resource_allocation', name: 'Распределение ресурсов', icon: '📊' }
                    ].map(category => (
                      <Button
                        key={category.id}
                        onClick={() => generateNewCase(category.id)}
                        disabled={loading}
                        className="h-24 flex flex-col items-center justify-center space-y-2"
                        variant="outline"
                      >
                        <span className="text-2xl">{category.icon}</span>
                        <span className="text-sm text-center">{category.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Активный кейс
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(currentCase.category)}
                      <div>
                        <CardTitle className="text-xl">{currentCase.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getDifficultyColor(currentCase.difficulty)}>
                            {currentCase.difficulty}
                          </Badge>
                          <Badge variant="outline">
                            {currentCase.category.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono">{formatTime(timeLeft)}</span>
                      </div>
                      <Button
                        onClick={() => setCurrentCase(null)}
                        variant="outline"
                        size="sm"
                      >
                        Новый кейс
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Описание кейса */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Ситуация</h3>
                    <p className="text-gray-700 leading-relaxed">{currentCase.description}</p>
                  </div>

                  {/* Проблема */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Проблема для решения</h3>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <p className="text-blue-800 font-medium">{currentCase.problem}</p>
                    </div>
                  </div>

                  {/* Контекст и ограничения */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentCase.context && (
                      <div>
                        <h4 className="font-medium mb-2">Дополнительный контекст</h4>
                        <p className="text-sm text-gray-600">{currentCase.context}</p>
                      </div>
                    )}
                    {currentCase.constraints && currentCase.constraints.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Ограничения</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {currentCase.constraints.map((constraint, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-red-500 mt-1">•</span>
                              <span>{constraint}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Варианты решения */}
                  {currentCase.options && currentCase.options.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Возможные варианты решения</h3>
                      <div className="space-y-3">
                        {currentCase.options.map((option, index) => (
                          <div key={option.id || index} className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Вариант {index + 1}: {option.text}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-green-600">Плюсы:</span>
                                <ul className="mt-1 space-y-1">
                                  {option.pros?.map((pro, i) => (
                                    <li key={i} className="text-green-700">• {pro}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="font-medium text-red-600">Минусы:</span>
                                <ul className="mt-1 space-y-1">
                                  {option.cons?.map((con, i) => (
                                    <li key={i} className="text-red-700">• {con}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Поле для решения */}
                  {!isSubmitted && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Ваше решение</h3>
                      <textarea
                        value={userSolution}
                        onChange={(e) => setUserSolution(e.target.value)}
                        placeholder="Опишите, как бы вы поступили в этой ситуации. Объясните свой выбор и ожидаемые результаты..."
                        className="w-full h-40 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                      />
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-sm text-gray-500">
                          {userSolution.length} символов
                        </span>
                        <Button
                          onClick={submitSolution}
                          disabled={!userSolution.trim() || loading}
                        >
                          {loading ? 'Оцениваем...' : 'Отправить решение'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Результат оценки */}
                  {isSubmitted && evaluation && (
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span>Результаты оценки</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Общая оценка */}
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-4xl font-bold text-blue-600 mb-2">
                                {evaluation.overall_score}/100
                              </div>
                              <p className="text-gray-600">Общая оценка</p>
                              <Progress
                                value={evaluation.overall_score}
                                className="mt-3"
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Детальная оценка */}
                        <div className="space-y-3">
                          {evaluation.scores && Object.entries(evaluation.scores).map(([skill, score]) => (
                            <div key={skill} className="flex items-center justify-between">
                              <span className="text-sm capitalize">
                                {skill.replace('_', ' ')}
                              </span>
                              <div className="flex items-center space-x-2">
                                <Progress value={score} className="w-20" />
                                <span className="text-sm font-medium w-8">{score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Фидбек */}
                      <div className="mt-6 space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Анализ решения:</h4>
                          <p className="text-gray-700">{evaluation.feedback}</p>
                        </div>

                        {evaluation.strengths && evaluation.strengths.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 text-green-600">Сильные стороны:</h4>
                            <ul className="space-y-1">
                              {evaluation.strengths.map((strength, index) => (
                                <li key={index} className="text-green-700 text-sm">
                                  • {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {evaluation.improvements && evaluation.improvements.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 text-orange-600">Области для улучшения:</h4>
                            <ul className="space-y-1">
                              {evaluation.improvements.map((improvement, index) => (
                                <li key={index} className="text-orange-700 text-sm">
                                  • {improvement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {evaluation.recommendations && evaluation.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 text-blue-600">Рекомендации:</h4>
                            <ul className="space-y-1">
                              {evaluation.recommendations.map((rec, index) => (
                                <li key={index} className="text-blue-700 text-sm">
                                  • {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Статистика */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📊 Ваша статистика</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.total_cases || 0}</div>
                      <p className="text-sm text-gray-600">Кейсов решено</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.avg_score ? Math.round(stats.avg_score) : 0}</div>
                      <p className="text-sm text-gray-600">Средний балл</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Лучший результат</span>
                      <span className="font-medium">{stats.best_score || 0}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Общее время</span>
                      <span className="font-medium">{Math.round((stats.total_time || 0) / 60)} мин</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* История кейсов */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📚 Последние кейсы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {caseHistory.slice(0, 5).map((caseItem, index) => (
                    <div key={caseItem.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{caseItem.case_title}</p>
                        <p className="text-xs text-gray-500">{caseItem.category}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{caseItem.score}/100</div>
                        <p className="text-xs text-gray-500">
                          {new Date(caseItem.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {caseHistory.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Пока нет решенных кейсов
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Советы */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 Советы по решению</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Анализируйте все заинтересованные стороны</li>
                  <li>• Учитывайте долгосрочные последствия</li>
                  <li>• Обосновывайте свой выбор конкретными фактами</li>
                  <li>• Думайте о развитии команды</li>
                  <li>• Не спешите с решением под давлением</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCasesPage;
