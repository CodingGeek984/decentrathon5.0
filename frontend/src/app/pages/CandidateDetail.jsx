import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, Shield, TrendingUp, Heart, Sparkles, BookOpen, Award, Users as UsersIcon, MessageSquare, Brain, Video } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import { ScoreBadge, RecommendationBadge, StatusBadge } from '../components/ScoreBadge';
import ScoreBar from '../components/ScoreBar';

export default function CandidateDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ reviewer_name: '', decision: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.getCandidate(id).then(setData).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleRescore = () => {
    api.rescoreCandidate(id).then(() => load());
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.addReview(id, reviewForm);
      setReviewForm({ reviewer_name: '', decision: '', comment: '' });
      load();
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (newStatus) => {
    await api.updateCandidate(id, { status: newStatus });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!data) return <div className="text-center py-12 text-slate-500">Кандидат не найден</div>;

  const analysis = data.liveAnalysis;
  const dims = analysis?.dimensions || {};

  const radarData = Object.entries(dims).map(([key, dim]) => ({
    dimension: dim.label.replace(/\s*\(.*\)/, ''),
    score: dim.score,
    fullMark: 100,
  }));

  return (
    <div className="space-y-6">
      <Link to="/admin/candidates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Назад к списку
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <ScoreBadge score={analysis?.totalScore || 0} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-900">{data.full_name}</h2>
              <StatusBadge status={data.status} />
              {analysis && <RecommendationBadge recommendation={analysis.recommendation} />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
              <span>{data.age} лет</span>
              <span>{data.city}</span>
              <span>{data.school}</span>
              <span>Класс: {data.grade}</span>
              {data.gpa && <span>GPA: {data.gpa}</span>}
            </div>
            {analysis?.summary && (
              <pre className="mt-3 text-sm text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg p-3">{analysis.summary}</pre>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/admin/candidates/${id}/ai`} className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-100">
              <Brain className="w-3.5 h-3.5" /> AI-анализ
            </Link>
            <button onClick={handleRescore} className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100">
              <RefreshCw className="w-3.5 h-3.5" /> Пересчитать
            </button>
          </div>
        </div>

        {/* Status actions */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center mr-2">Изменить статус:</span>
          {['reviewed', 'shortlisted', 'accepted', 'rejected'].map(s => (
            <button key={s} onClick={() => handleStatusChange(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${data.status === s ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {{ reviewed: 'Рассмотрен', shortlisted: 'В шорт-лист', accepted: 'Принять', rejected: 'Отклонить' }[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Radar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Профиль компетенций</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Dimension details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-900">Детализация оценок</h3>
            {Object.entries(dims).map(([key, dim]) => (
              <ScoreBar key={key} label={dim.label} score={dim.score} showFactors factors={dim.factors} />
            ))}
          </div>

          {/* AI Detection */}
          {analysis?.aiDetection && (
            <div className={`rounded-xl border p-6 ${analysis.aiDetection.score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {analysis.aiDetection.score >= 40 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <Shield className="w-5 h-5 text-emerald-600" />}
                <h3 className="text-sm font-semibold">
                  Детекция ИИ-генерации: {analysis.aiDetection.score}/100
                </h3>
              </div>
              <ul className="space-y-1">
                {analysis.aiDetection.factors.map((f, i) => (
                  <li key={i} className="text-sm">{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Essays */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <h3 className="text-sm font-semibold text-slate-900">Эссе кандидата</h3>
            {data.essay_motivation && (
              <EssaySection icon={Heart} title="Эссе о мотивации" text={data.essay_motivation} />
            )}
            {data.essay_leadership && (
              <EssaySection icon={TrendingUp} title="Эссе о лидерстве" text={data.essay_leadership} />
            )}
            {data.essay_goals && (
              <EssaySection icon={Sparkles} title="Эссе о целях" text={data.essay_goals} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Ключевые метрики</h3>
            <MetricRow icon={TrendingUp} label="Лидерский потенциал" value={analysis?.leadershipPotential} />
            <MetricRow icon={Sparkles} label="Траектория роста" value={analysis?.growthTrajectory} />
            <MetricRow icon={Heart} label="Мотивация" value={analysis?.motivationScore} />
            <MetricRow icon={Shield} label="Аутентичность" value={analysis?.authenticityScore} />
          </div>

          {data.videoInterview?.result && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-primary-600" /> Видео-интервью
              </h3>
              <MetricRow icon={Brain} label="Общая оценка" value={data.videoInterview.result.overall_score} />
              <MetricRow icon={MessageSquare} label="Коммуникация" value={data.videoInterview.result.communication_score} />
              <MetricRow icon={Shield} label="Эмоц. устойчивость" value={data.videoInterview.result.emotional_resilience} />
              <MetricRow icon={Sparkles} label="Невербальная стабильность" value={data.videoInterview.result.nonverbal_consistency} />
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {data.videoInterview.result.summary}
              </div>
              {data.videoInterview.result.behavioral_observations && (
                <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-slate-700">
                  {data.videoInterview.result.behavioral_observations}
                </div>
              )}
            </div>
          )}

          {/* Achievements */}
          {data.achievements?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Award className="w-4 h-4" /> Достижения</h3>
              <ul className="space-y-2">
                {data.achievements.map((a, i) => <li key={i} className="text-sm text-slate-600 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-primary-300 before:rounded-full">{a}</li>)}
              </ul>
            </div>
          )}

          {/* Extracurriculars */}
          {data.extracurriculars?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Внеучебная деятельность</h3>
              <ul className="space-y-2">
                {data.extracurriculars.map((a, i) => <li key={i} className="text-sm text-slate-600 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-violet-300 before:rounded-full">{a}</li>)}
              </ul>
            </div>
          )}

          {/* Leadership roles */}
          {data.leadership_roles?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Лидерские роли</h3>
              <ul className="space-y-2">
                {data.leadership_roles.map((a, i) => <li key={i} className="text-sm text-slate-600 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-emerald-300 before:rounded-full">{a}</li>)}
              </ul>
            </div>
          )}

          {/* Committee Reviews */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Отзывы комиссии ({data.reviews?.length || 0})
            </h3>
            {data.reviews?.length > 0 && (
              <div className="space-y-3 mb-4">
                {data.reviews.map(r => (
                  <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{r.reviewer_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.decision === 'approve' ? 'bg-emerald-100 text-emerald-700' :
                        r.decision === 'reject' ? 'bg-red-100 text-red-700' :
                        r.decision === 'hold' ? 'bg-amber-100 text-amber-700' :
                        'bg-violet-100 text-violet-700'
                      }`}>
                        {{ approve: 'Одобрено', reject: 'Отклонено', hold: 'На удержании', escalate: 'Эскалировано' }[r.decision]}
                      </span>
                    </div>
                    {r.comment && <p className="text-xs text-slate-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Review form */}
            <form onSubmit={handleReview} className="space-y-3 pt-3 border-t border-slate-100">
              <input
                placeholder="Имя члена комиссии"
                value={reviewForm.reviewer_name}
                onChange={e => setReviewForm(f => ({ ...f, reviewer_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                required
              />
              <select
                value={reviewForm.decision}
                onChange={e => setReviewForm(f => ({ ...f, decision: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 appearance-none"
                required
              >
                <option value="">Решение...</option>
                <option value="approve">Одобрить</option>
                <option value="reject">Отклонить</option>
                <option value="hold">На удержание</option>
                <option value="escalate">Эскалировать</option>
              </select>
              <textarea
                placeholder="Комментарий (необязательно)"
                value={reviewForm.comment}
                onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 resize-none h-20 outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Добавить отзыв
              </button>
            </form>
          </div>

          {/* Weights transparency */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Веса факторов (прозрачность)</h3>
            {analysis?.weights && Object.entries(analysis.weights).map(([k, w]) => (
              <div key={k} className="flex justify-between text-xs text-slate-500 py-0.5">
                <span>{k.replace(/_/g, ' ')}</span>
                <span className="font-mono">{(w * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EssaySection({ icon: Icon, title, text }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" /> {title}
      </h4>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4">{text}</p>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value }) {
  const color = value >= 70 ? 'text-emerald-600' : value >= 45 ? 'text-blue-600' : value >= 25 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Icon className="w-4 h-4 text-slate-400" /> {label}
      </div>
      <span className={`text-sm font-bold ${color}`}>{value != null ? Math.round(value) : '—'}</span>
    </div>
  );
}
