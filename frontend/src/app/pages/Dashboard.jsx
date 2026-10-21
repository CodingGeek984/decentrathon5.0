import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Award, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../api';
import { RecommendationBadge, ScoreBadge } from '../components/ScoreBadge';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [topCandidates, setTopCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStats(), api.getRanking()])
      .then(([s, r]) => { setStats(s); setTopCandidates(r.slice(0, 5)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const recData = (stats?.byRecommendation || []).map(r => ({
    name: { strong_yes: 'Рекомендован+', yes: 'Рекомендован', maybe: 'На рассмотрении', no: 'Не рекомендован', strong_no: 'Отклонён' }[r.recommendation] || r.recommendation,
    value: r.count,
  }));

  const distData = (stats?.scoreDistribution || []).map(d => ({
    range: d.range,
    count: d.count,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Дашборд</h2>
        <p className="text-slate-500 mt-1">Обзор системы отбора кандидатов inVision U</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Всего кандидатов" value={stats?.total || 0} color="bg-primary-50 text-primary-600" />
        <StatCard icon={TrendingUp} label="Средний балл" value={stats?.avgScore || 0} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Award} label="Макс. балл" value={stats?.maxScore || 0} color="bg-violet-50 text-violet-600" />
        <StatCard icon={AlertTriangle} label="Мин. балл" value={stats?.minScore || 0} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Распределение баллов</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendation pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Рекомендации</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={recData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {recData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top candidates */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Топ кандидаты</h3>
          <Link to="/admin/ranking" className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1">
            Полный рейтинг <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {topCandidates.map(c => (
            <Link key={c.id} to={`/admin/candidates/${c.id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-lg font-bold text-slate-400 w-8 text-center">#{c.rank}</span>
              <ScoreBadge score={c.total_score} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{c.full_name}</p>
                <p className="text-xs text-slate-500">{c.city} — {c.school}</p>
              </div>
              <RecommendationBadge recommendation={c.recommendation} />
            </Link>
          ))}
        </div>
      </div>

      {/* Explainability notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">AI</div>
        <div>
          <p className="text-sm font-medium text-blue-900">Прозрачность и объяснимость</p>
          <p className="text-xs text-blue-700 mt-1">
            Каждый балл сопровождается подробным объяснением факторов оценки. ИИ не принимает окончательных решений — система является инструментом поддержки приёмной комиссии (Human-in-the-loop).
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-900">{typeof value === 'number' ? Math.round(value * 10) / 10 : value}</p>
        </div>
      </div>
    </div>
  );
}
