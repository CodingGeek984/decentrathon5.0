import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const ExplainableResult = () => {
  const [interviewId, setInterviewId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchExplanation = async () => {
    if (!interviewId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/explainable/explanation/${interviewId}`);
      const data = await response.json();
      if (data.success) {
        setResult(data.explanation);
      } else {
        setError(data.error || 'Не удалось получить объяснение');
      }
    } catch (e) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Explainable AI — объяснение результата</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={interviewId}
                placeholder="ID интервью"
                onChange={(e) => setInterviewId(e.target.value)}
                className="w-full sm:w-auto border px-3 py-2 rounded-md"
              />
              <Button onClick={fetchExplanation} disabled={loading || !interviewId}>
                {loading ? 'Загрузка...' : 'Получить объяснение'}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Результат: {result.overall_score || 0}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Контекст кейса</h4>
                <p className="text-sm text-gray-600">{result.case_context?.title}</p>
                <p className="text-sm text-slate-500">{result.case_context?.problem}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <h5 className="font-medium">Сильные стороны</h5>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                    {(result.reasoning?.strengths || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border">
                  <h5 className="font-medium">Слабые стороны</h5>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                    {(result.reasoning?.weaknesses || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <h5 className="font-medium">Ключевые факторы</h5>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                  {(result.reasoning?.key_factors || []).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <h5 className="font-medium">Рекомендации</h5>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                  {(result.reasoning?.recommendations || []).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <h5 className="font-medium">Какие ответы повлияли</h5>
                <p className="text-sm text-gray-700">
                  {result.user_responses?.length ? result.user_responses.map((r, i) => (
                    <div key={i} className="mb-1">
                      <Badge variant="secondary">{r.question}</Badge> {r.answer}
                    </div>
                  )) : 'Нет данных'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExplainableResult;
