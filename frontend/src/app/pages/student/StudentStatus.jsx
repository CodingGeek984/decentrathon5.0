import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, Clock, CheckCircle, XCircle, Star, MessageCircle, Video } from 'lucide-react';
import { api } from '../../api';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'На рассмотрении' },
  reviewed: { icon: CheckCircle, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Рассмотрена' },
  shortlisted: { icon: Star, color: 'text-violet-600 bg-violet-50 border-violet-200', label: 'В шорт-листе' },
  accepted: { icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Принят(а)' },
  rejected: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Отклонена' },
};

export default function StudentStatus() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await api.checkStatus(email);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = result ? STATUS_CONFIG[result.status] || STATUS_CONFIG.pending : null;
  const StatusIcon = statusInfo?.icon || Clock;

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Назад
      </Link>

      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-7 h-7 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Проверить статус заявки</h2>
        <p className="text-slate-500 mt-1">Введите email, указанный при подаче заявки</p>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2 mb-8">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Проверить'}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-center">{error}</div>}

      {result && (
        <div className={`border rounded-xl p-6 text-center ${statusInfo.color}`}>
          <StatusIcon className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-1">{result.name}</h3>
          <p className="text-sm font-medium mb-3">{result.statusLabel}</p>
          <p className="text-xs opacity-70">Подано: {new Date(result.appliedAt).toLocaleDateString('ru-RU')}</p>

          {result.status === 'pending' && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link
                to={`/interview/${result.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-current/20 rounded-lg text-sm font-medium hover:bg-white"
              >
                <MessageCircle className="w-4 h-4" />
                {result.interview?.textCompleted ? 'Открыть AI-интервью' : 'Пройти AI-интервью'}
              </Link>

              {result.interview?.canStartVideo && (
                <Link
                  to={`/video-interview/${result.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                >
                  <Video className="w-4 h-4" />
                  {result.interview?.videoStatus === 'completed' ? 'Открыть видео-интервью' : 'Пройти видео-интервью'}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
