import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Filter
} from 'lucide-react';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState({});
  const [userRank, setUserRank] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('overall');
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'overall', name: 'Общий рейтинг', icon: '🏆' },
    { id: 'leadership', name: 'Лидерство', icon: '👑' },
    { id: 'problem_solving', name: 'Решение проблем', icon: '🧩' },
    { id: 'communication', name: 'Коммуникация', icon: '💬' }
  ];

  useEffect(() => {
    fetchLeaderboard(selectedCategory);
    fetchUserRank(selectedCategory);
  }, [selectedCategory]);

  const fetchLeaderboard = async (category) => {
    try {
      const response = await fetch(`/api/games/leaderboard?category=${category}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setLeaderboard(prev => ({
          ...prev,
          [category]: data.leaderboard
        }));
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchUserRank = async (category) => {
    try {
      const response = await fetch(`/api/progress/peer-comparison/1`); // TODO: заменить на реальный userId
      const data = await response.json();
      if (data.success) {
        setUserRank(data.comparison);
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
    }
    setLoading(false);
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (rank <= 10) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (rank <= 25) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatScore = (score) => {
    return typeof score === 'number' ? score.toFixed(1) : score;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загружаем рейтинг...</p>
        </div>
      </div>
    );
  }

  const currentLeaderboard = leaderboard[selectedCategory] || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏆 Лидерборд
          </h1>
          <p className="text-gray-600">
            Соревнуйтесь с другими кандидатами и отслеживайте свой прогресс
          </p>
        </div>

        {/* Ваша позиция */}
        {userRank && (
          <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Ваша позиция</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl font-bold text-blue-600">
                      #{userRank.user_percentile.interview ? 'Топ' : 'Не определена'}
                    </div>
                    <div className="text-sm text-gray-600">
                      по {selectedCategory === 'overall' ? 'общему рейтингу' :
                           selectedCategory === 'leadership' ? 'лидерству' :
                           selectedCategory === 'problem_solving' ? 'решению проблем' :
                           'коммуникации'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {formatScore(userRank.user_stats.avg_overall_score || 0)} баллов
                  </div>
                  <div className="text-sm text-gray-600">
                    {userRank.user_stats.total_activities || 0} активностей
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Категории рейтинга */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            {categories.map(category => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center space-x-2"
              >
                <span>{category.icon}</span>
                <span className="hidden sm:inline">{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category.id} value={category.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {currentLeaderboard.length} участников
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentLeaderboard.length > 0 ? (
                    <div className="space-y-4">
                      {/* Топ-3 с особым оформлением */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {currentLeaderboard.slice(0, 3).map((entry, index) => (
                          <Card key={entry.user_id} className={`relative overflow-hidden ${
                            index === 0 ? 'border-yellow-300 bg-yellow-50' :
                            index === 1 ? 'border-gray-300 bg-gray-50' :
                            'border-amber-300 bg-amber-50'
                          }`}>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <div className="flex justify-center mb-2">
                                  {getRankIcon(entry.rank)}
                                </div>
                                <h3 className="font-bold text-lg mb-1">{entry.user_name}</h3>
                                <div className="text-2xl font-bold mb-1" style={{
                                  color: index === 0 ? '#D97706' : index === 1 ? '#6B7280' : '#D97706'
                                }}>
                                  {formatScore(entry.score)}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {entry.activities_count} активностей
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Остальной рейтинг */}
                      <div className="space-y-2">
                        {currentLeaderboard.slice(3).map((entry) => (
                          <div
                            key={entry.user_id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                                getRankBadgeColor(entry.rank)
                              }`}>
                                {entry.rank}
                              </div>
                              <div>
                                <h4 className="font-medium">{entry.user_name}</h4>
                                <p className="text-sm text-gray-600">
                                  {entry.activities_count} активностей
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                {formatScore(entry.score)}
                              </div>
                              <Badge
                                variant="outline"
                                className={getRankBadgeColor(entry.rank)}
                              >
                                #{entry.rank}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">
                        Рейтинг пока пуст
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Будьте первым, кто заработает очки в этой категории!
                      </p>
                      <Button onClick={() => window.location.href = '/games'}>
                        Начать решать кейсы
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Статистика рейтинга */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{currentLeaderboard.length}</p>
                  <p className="text-sm text-gray-600">Участников</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Target className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {currentLeaderboard.length > 0 ? formatScore(currentLeaderboard[0]?.score || 0) : '0.0'}
                  </p>
                  <p className="text-sm text-gray-600">Лучший результат</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {currentLeaderboard.length > 0
                      ? formatScore(currentLeaderboard.reduce((sum, entry) => sum + entry.score, 0) / currentLeaderboard.length)
                      : '0.0'
                    }
                  </p>
                  <p className="text-sm text-gray-600">Средний балл</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Мотивационные сообщения */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Продолжайте развиваться!</h3>
              <p className="text-gray-600 mb-4">
                Регулярное участие в кейсах и интервью поможет вам подняться в рейтинге
                и развить ценные лидерские навыки.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.location.href = '/games'}>
                  Решать кейсы
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/progress'}>
                  Посмотреть прогресс
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderboardPage;
