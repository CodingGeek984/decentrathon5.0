import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const AICoach = () => {
  const [coachData, setCoachData] = useState(null);
  const [userId, setUserId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCoach = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/explainable/coach/${userId}`);
      const data = await response.json();
      if (data.success) {
        setCoachData(data.coach);
      } else {
        setError(data.error || 'Ошибка получения рекомендаций');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoach();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Coach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <input
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="ID пользователя"
              />
              <Button onClick={fetchCoach} disabled={loading}>
                {loading ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>
            {error && <p className="text-red-600">{error}</p>}
          </CardContent>
        </Card>

        {coachData ? (
          <Card>
            <CardHeader>
              <CardTitle>Персональные рекомендации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-slate-50">
                  <h4 className="font-medium">Уровень</h4>
                  <p className="mt-1">{coachData.current_level}</p>
                </div>
                <div className="p-3 rounded-lg border bg-slate-50">
                  <h4 className="font-medium">Вехи</h4>
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    {coachData.milestones?.map((m, idx) => <li key={idx}>{m.title} ({m.timeframe})</li>)}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Области для фокуса</h4>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                  {coachData.focus_areas?.length > 0 ? coachData.focus_areas.map((area, idx) => (
                    <li key={idx}>{area.skill}: {area.current_score} → {area.target_score} ({area.priority})</li>
                  )) : <li>Нет рекомендаций</li>}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">Конкретные действия</h4>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                  {coachData.action_items?.map((item, idx) => (
                    <li key={idx}>{item.title}: {item.description} ({item.frequency})</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>Загрузка данных AI Coach...</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AICoach;
