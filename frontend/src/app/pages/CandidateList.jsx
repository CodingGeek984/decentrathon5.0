import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { api } from '../api';
import { ScoreBadge, RecommendationBadge, StatusBadge } from '../components/ScoreBadge';

export default function CandidateList() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('total_score');
  const [order, setOrder] = useState('desc');

  useEffect(() => {
    setLoading(true);
    api.getCandidates({ search, status: statusFilter, sort, order })
      .then(setCandidates)
      .finally(() => setLoading(false));
  }, [search, statusFilter, sort, order]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Кандидаты</h2>
        <p className="text-slate-500 mt-1">Управление и просмотр всех заявок</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по имени, городу, школе..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
        >
          <option value="">Все статусы</option>
          <option value="pending">Ожидает</option>
          <option value="reviewed">Рассмотрен</option>
          <option value="shortlisted">В шорт-листе</option>
          <option value="accepted">Принят</option>
          <option value="rejected">Отклонён</option>
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
        >
          <option value="total_score">По баллу</option>
          <option value="full_name">По имени</option>
          <option value="created_at">По дате</option>
          <option value="gpa">По GPA</option>
        </select>
        <button
          onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          title={order === 'desc' ? 'По убыванию' : 'По возрастанию'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${order === 'asc' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Кандидаты не найдены</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Кандидат</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Город</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">GPA</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">Балл</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">Рекомендация</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {candidates.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/admin/candidates/${c.id}`} className="font-medium text-slate-900 hover:text-primary-600">
                        {c.full_name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">{c.school}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.city}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">{c.gpa || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {c.total_score != null ? <ScoreBadge score={c.total_score} size="sm" /> : <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.recommendation ? <RecommendationBadge recommendation={c.recommendation} /> : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={c.status} />
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
