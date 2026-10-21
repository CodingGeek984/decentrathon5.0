import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import {
  TrendingUp,
  Trophy,
  Target,
  Calendar,
  Award,
  BarChart3,
  Users,
  Clock,
  Star,
  ChevronRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from 'recharts';

const ProgressDashboard = () => {
  const [progressData, setProgressData] = useState(null);
  const [skillsTrend, setSkillsTrend] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [peerComparison, setPeerComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
    fetchSkillsTrend();
    fetchAchievements();
    fetchPeerComparison();
  }, []);

  const fetchProgressData = async () => {
    try {
      const response = await fetch('/api/progress/dashboard/1'); // TODO: заменить на реальный userId
      const data = await response.json();
      if (response.ok) {
        setProgressData({
          activities: {
            interviews: data.interviews?.total || 0,
            cases: data.cases?.total || 0,
          },
          achievements: {
            unlocked_in_period: data.achievements?.unlocked || 0,
            total_available: data.achievements?.total_available || 0,
          },
          skills: {
            period_average: data.interviews?.average_score || 0,
            breakdown: data.soft_skills?.reduce((acc, s) => {
              acc[s.skill_name] = s.best_score;
              return acc;
            }, {}) || {},
          },
          leader: data.leaderboard || {},
        });
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    }
  };

  const fetchSkillsTrend = async () => {
    try {
      const response = await fetch('/api/progress/skills-trend/1?days=30'); // TODO: заменить на реальный userId
      const data = await response.json();
      if (data.success) {
        setSkillsTrend(data.trend);
      }
    } catch (error) {
      console.error('Error fetching skills trend:', error);
    }
  };

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/progress/achievements/1'); // TODO: заменить на реальный userId
      const data = await response.json();
      if (data.success) {
        setAchievements(data.unlocked);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchPeerComparison = async () => {
    try {
      const response = await fetch('/api/progress/peer-comparison/1'); // TODO: заменить на реальный userId
      const data = await response.json();
      if (data.success) {
        setPeerComparison(data.comparison);
      }
    } catch (error) {
      console.error('Error fetching peer comparison:', error);
    }
    setLoading(false);
  };

  const getSkillColor = (skill) => {
    const colors = {
      leadership: '#3B82F6',
      communication: '#10B981',
      empathy: '#F59E0B',
      creativity: '#EF4444',
      adaptability: '#8B5CF6',
      teamwork: '#06B6D4'
    };
    return colors[skill] || '#6B7280';
  };

  const getSkillName = (skill) => {
    const names = {
      leadership: 'Лидерство',
      communication: 'Коммуникация',
      empathy: 'Эмпатия',
      creativity: 'Креативность',
      adaptability: 'Адаптивность',
      teamwork: 'Командная работа'
    };
    return names[skill] || skill;
  };

  const getPercentileLabel = (percentile) => {
    switch (percentile) {
      case 'top_25': return 'Топ 25%';
      case 'top_50': return 'Топ 50%';
      case 'bottom_50': return 'Ниже среднего';
      case 'bottom_25': return 'Низкий уровень';
      default: return 'Не определено';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загружаем ваш прогресс...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Дашборд прогресса
          </h1>
          <p className="text-gray-600">
            Отслеживайте развитие ваших лидерских навыков и достижений
          </p>
        </div>

        {/* Основные метрики */}
        {progressData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Target className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{progressData.activities.interviews || 0}</p>
                    <p className="text-sm text-gray-600">Интервью пройдено</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{progressData.activities.cases || 0}</p>
                    <p className="text-sm text-gray-600">Кейсов решено</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold">{progressData.achievements.unlocked_in_period || 0}</p>
                    <p className="text-sm text-gray-600">Достижений за период</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{progressData.skills.period_average || 0}/100</p>
                    <p className="text-sm text-gray-600">Средний навык</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* График тренда навыков */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Динамика навыков</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skillsTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={skillsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      labelFormatter={(date) => new Date(date).toLocaleDateString('ru-RU')}
                      formatter={(value, name) => [value, getSkillName(name)]}
                    />
                    <Line
                      type="monotone"
                      dataKey="leadership"
                      stroke={getSkillColor('leadership')}
                      strokeWidth={2}
                      name="leadership"
                    />
                    <Line
                      type="monotone"
                      dataKey="communication"
                      stroke={getSkillColor('communication')}
                      strokeWidth={2}
                      name="communication"
                    />
                    <Line
                      type="monotone"
                      dataKey="empathy"
                      stroke={getSkillColor('empathy')}
                      strokeWidth={2}
                      name="empathy"
                    />
                    <Line
                      type="monotone"
                      dataKey="creativity"
                      stroke={getSkillColor('creativity')}
                      strokeWidth={2}
                      name="creativity"
                    />
                    <Line
                      type="monotone"
                      dataKey="adaptability"
                      stroke={getSkillColor('adaptability')}
                      strokeWidth={2}
                      name="adaptability"
                    />
                    <Line
                      type="monotone"
                      dataKey="teamwork"
                      stroke={getSkillColor('teamwork')}
                      strokeWidth={2}
                      name="teamwork"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Недостаточно данных для построения графика
                </div>
              )}
            </CardContent>
          </Card>

          {/* Радар навыков */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Профиль навыков</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressData?.skills?.breakdown ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={Object.entries(progressData.skills.breakdown).map(([skill, score]) => ({
                    skill: getSkillName(skill),
                    score: score,
                    fullMark: 100
                  }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Навыки"
                      dataKey="score"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Данные о навыках недоступны
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Сравнение с другими */}
          {peerComparison && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Сравнение с другими кандидатами</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Интервью</span>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {peerComparison.user_stats.avg_interview_score}/100
                      </div>
                      <div className="text-sm text-gray-600">
                        {getPercentileLabel(peerComparison.user_percentile.interview)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Кейсы</span>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {peerComparison.user_stats.avg_case_score}/100
                      </div>
                      <div className="text-sm text-gray-600">
                        {getPercentileLabel(peerComparison.user_percentile.case)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Общие навыки</span>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">
                        {peerComparison.user_stats.avg_skill_score}/100
                      </div>
                      <div className="text-sm text-gray-600">
                        {getPercentileLabel(peerComparison.user_percentile.skill)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Достижения */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Недавние достижения</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.slice(0, 5).map((achievement, index) => (
                  <div key={achievement.id || index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <Badge variant="secondary">+{achievement.points} очков</Badge>
                  </div>
                ))}
                {achievements.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    Пока нет разблокированных достижений
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Рекомендации */}
        {progressData?.recommendations && progressData.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ChevronRight className="w-5 h-5" />
                <span>Персональные рекомендации</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {progressData.recommendations.map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        rec.priority === 'high' ? 'bg-red-500' :
                        rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span className="text-sm font-medium capitalize">
                        {rec.priority === 'high' ? 'Высокий' :
                         rec.priority === 'medium' ? 'Средний' : 'Низкий'} приоритет
                      </span>
                    </div>
                    <p className="text-gray-700">{rec.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Детальная статистика навыков */}
        {progressData?.skills?.breakdown && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Детальный анализ навыков</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(progressData.skills.breakdown).map(([skill, score]) => (
                  <div key={skill} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{getSkillName(skill)}</span>
                      <span className="text-lg font-bold" style={{ color: getSkillColor(skill) }}>
                        {score}/100
                      </span>
                    </div>
                    <Progress value={score} className="h-2" />
                    <p className="text-xs text-gray-500">
                      {score >= 80 ? 'Отличный уровень' :
                       score >= 60 ? 'Хороший уровень' :
                       score >= 40 ? 'Средний уровень' : 'Требует развития'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProgressDashboard;
