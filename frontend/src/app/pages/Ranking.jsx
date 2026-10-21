import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, RefreshCw, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../api';
import { ScoreBadge, RecommendationBadge } from '../components/ScoreBadge';

const COLORS = { strong_yes: '#22c55e', yes: '#16a34a', maybe: '#f59e0b', no: '#ef4444', strong_no: '#991b1b' };

export default function Ranking() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);

  const load = () => {
    setLoading(true);
    api.getRanking().then(setCandidates).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleBatchRescore = async () => {
    setRescoring(true);
    await api.batchScore();
    load();
    setRescoring(false);
  };

  const exportCSV = () => {
    const headers = ['Ранг', 'Имя', 'Город', 'Школа', 'GPA', 'Итоговый балл', 'Рекомендация', 'Лидерство', 'Мотивация', 'Рост', 'Аутентичность', 'AI-флаг'];
    const rows = candidates.map(c => [
      c.rank, c.full_name, c.city, c.school, c.gpa,
      c.total_score, c.recommendation,
      c.leadership_potential, c.motivation_score, c.growth_trajectory,
      c.authenticity_score, c.ai_detection_flag
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'invision_u_ranking.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = candidates.map(c => ({
    name: c.full_name.split(' ')[0],
    score: c.total_score,
    recommendation: c.recommendation,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Рейтинг кандидатов
          </h2>
          <p className="text-slate-500 mt-1">Автоматический ранжинг на основе AI-скоринга</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleBatchRescore} disabled={rescoring}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${rescoring ? 'animate-spin' : ''}`} />
            Пересчитать все
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Download className="w-4 h-4" /> Экспорт CSV
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Сравнение кандидатов</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [v.toFixed(1), 'Балл']} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={COLORS[entry.recommendation] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3 w-12">#</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Кандидат</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3">Балл</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3">Лидерство</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3">Мотивация</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3">Рост</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3">Аутентичность</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3">AI-флаг</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-3">Рекомендация</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {candidates.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center">
                      <span className={`text-lg font-bold ${c.rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {c.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/candidates/${c.id}`} className="font-medium text-slate-900 hover:text-primary-600">
                        {c.full_name}
                      </Link>
                      <p className="text-xs text-slate-500">{c.city} | GPA: {c.gpa || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center"><ScoreBadge score={c.total_score} /></div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <MiniScore value={c.leadership_potential} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <MiniScore value={c.motivation_score} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <MiniScore value={c.growth_trajectory} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <MiniScore value={c.authenticity_score} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-medium ${c.ai_detection_flag >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {Math.round(c.ai_detection_flag)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <RecommendationBadge recommendation={c.recommendation} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniScore({ value }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  const v = Math.round(value);
  const color = v >= 70 ? 'text-emerald-600' : v >= 45 ? 'text-blue-600' : v >= 25 ? 'text-amber-600' : 'text-red-600';
  return <span className={`text-sm font-semibold ${color}`}>{v}</span>;
}
