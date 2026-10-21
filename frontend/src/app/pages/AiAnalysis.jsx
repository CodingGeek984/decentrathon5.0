import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Brain, Sparkles, Loader, MessageSquare, AlertTriangle, CheckCircle, Target, Shield } from 'lucide-react';
import { api } from '../api';
import ScoreBar from '../components/ScoreBar';

export default function AiAnalysis() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [interviewSummary, setInterviewSummary] = useState(null);
  const [videoInterviewSummary, setVideoInterviewSummary] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getCandidate(id),
      api.getAiStatus(),
      api.getAiAnalysis(id).catch(() => ({})),
      api.getInterviewHistory(id).catch(() => []),
    ]).then(([cand, status, analyses, history]) => {
      setCandidate(cand);
      setAiReady(status.configured);
      if (analyses.essay_deep) setAnalysis(analyses.essay_deep);
      if (analyses.interview_summary) setInterviewSummary(analyses.interview_summary);
      if (analyses.video_interview_summary) setVideoInterviewSummary(analyses.video_interview_summary);
      setInterviewHistory(history);
    }).finally(() => setLoading(false));
  }, [id]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const result = await api.analyzeCandidate(id);
      setAnalysis(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const runSummarize = async () => {
    setSummarizing(true);
    setError('');
    try {
      const result = await api.summarizeInterview(id);
      setInterviewSummary(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!candidate) return <div className="text-center py-12 text-slate-500">Кандидат не найден</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/admin/candidates/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Профиль кандидата
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-violet-600" /> AI-анализ: {candidate.full_name}
          </h2>
          <p className="text-slate-500 mt-1">Глубокий анализ эссе и интервью с помощью Claude AI</p>
        </div>
        {!aiReady && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> AI API не настроен
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Essay Deep Analysis */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" /> Глубокий анализ эссе
            </h3>
            <button
              onClick={runAnalysis}
              disabled={analyzing || !aiReady}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-100 disabled:opacity-50"
            >
              {analyzing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              {analysis ? 'Перeанализировать' : 'Запустить анализ'}
            </button>
          </div>

          {analysis ? (
            <div className="space-y-5">
              <ScoreBar label="Лидерский потенциал" score={analysis.leadership_score} showFactors factors={[analysis.leadership_analysis]} />
              <ScoreBar label="Мотивация" score={analysis.motivation_score} showFactors factors={[analysis.motivation_analysis]} />
              <ScoreBar label="Траектория роста" score={analysis.growth_score} showFactors factors={[analysis.growth_analysis]} />
              <ScoreBar label="Аутентичность" score={analysis.authenticity_score} showFactors factors={[analysis.authenticity_analysis]} />
              <ScoreBar label="Соответствие миссии" score={analysis.mission_alignment} showFactors factors={[analysis.mission_analysis]} />

              {/* AI detection */}
              <div className={`rounded-lg p-4 ${analysis.ai_detection_score >= 50 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {analysis.ai_detection_score >= 50 ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Shield className="w-4 h-4 text-emerald-600" />}
                  <span className="text-sm font-medium">AI-генерация: {analysis.ai_detection_score}/100</span>
                </div>
                <p className="text-xs text-slate-600">{analysis.ai_detection_details}</p>
              </div>

              {/* Strengths / Concerns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-emerald-700 uppercase mb-2">Сильные стороны</h4>
                  <ul className="space-y-1">
                    {analysis.strengths?.map((s, i) => (
                      <li key={i} className="text-xs text-slate-600 flex gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-amber-700 uppercase mb-2">Зоны внимания</h4>
                  <ul className="space-y-1">
                    {analysis.concerns?.map((c, i) => (
                      <li key={i} className="text-xs text-slate-600 flex gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Overall */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-900 mb-1">Общее впечатление</h4>
                <p className="text-sm text-slate-600">{analysis.overall_impression}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-slate-900">Рекомендация AI:</span>
                  <RecBadge rec={analysis.recommendation} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{analysis.recommendation_reason}</p>
              </div>

              {analysis.analyzed_at && (
                <p className="text-xs text-slate-400">Анализ выполнен: {new Date(analysis.analyzed_at).toLocaleString('ru-RU')}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Нажмите «Запустить анализ» для глубокой AI-оценки эссе</p>
            </div>
          )}
        </div>

        {/* Interview section */}
        <div className="space-y-6">
          {/* Interview transcript */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" /> AI-интервью ({interviewHistory.length} сообщ.)
              </h3>
              {interviewHistory.length >= 4 && (
                <button
                  onClick={runSummarize}
                  disabled={summarizing || !aiReady}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                >
                  {summarizing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Анализировать
                </button>
              )}
            </div>

            {interviewHistory.length > 0 ? (
              <div className="max-h-80 overflow-y-auto space-y-3">
                {interviewHistory.map((m, i) => (
                  <div key={i} className={`text-sm ${m.role === 'user' ? 'bg-primary-50 border-primary-100' : 'bg-slate-50 border-slate-100'} border rounded-lg p-3`}>
                    <span className={`text-xs font-medium ${m.role === 'user' ? 'text-primary-600' : 'text-slate-500'}`}>
                      {m.role === 'user' ? 'Кандидат' : 'AI-интервьюер'}
                    </span>
                    <p className="text-slate-700 mt-1">{m.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-sm text-slate-400">Кандидат ещё не прошёл AI-интервью</p>
            )}
          </div>

          {/* Interview summary */}
          {interviewSummary && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-500" /> Результаты интервью
              </h3>
              <div className="space-y-4">
                <ScoreBar label="Общая оценка" score={interviewSummary.overall_score} />
                <ScoreBar label="Коммуникация" score={interviewSummary.communication_score} />
                <ScoreBar label="Глубина мотивации" score={interviewSummary.motivation_depth} />
                <ScoreBar label="Аутентичность" score={interviewSummary.authenticity} />
                <ScoreBar label="Лидерские сигналы" score={interviewSummary.leadership_signals} />

                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">{interviewSummary.summary}</p>
                </div>

                {interviewSummary.key_quotes?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Ключевые цитаты</h4>
                    {interviewSummary.key_quotes.map((q, i) => (
                      <blockquote key={i} className="border-l-2 border-primary-300 pl-3 text-sm text-slate-600 italic mb-2">"{q}"</blockquote>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium">Рекомендация:</span>
                  <RecBadge rec={interviewSummary.recommendation} />
                </div>
              </div>
            </div>
          )}

          {videoInterviewSummary && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" /> Результаты видео-интервью
              </h3>
              <div className="space-y-4">
                <ScoreBar label="Общая оценка" score={videoInterviewSummary.overall_score} />
                <ScoreBar label="Коммуникация" score={videoInterviewSummary.communication_score} />
                <ScoreBar label="Чёткость речи" score={videoInterviewSummary.speech_clarity} />
                <ScoreBar label="Глубина мотивации" score={videoInterviewSummary.motivation_depth} />
                <ScoreBar label="Аутентичность" score={videoInterviewSummary.authenticity} />
                <ScoreBar label="Эмоц. устойчивость" score={videoInterviewSummary.emotional_resilience} />
                <ScoreBar label="Невербальная стабильность" score={videoInterviewSummary.nonverbal_consistency} />
                <ScoreBar label="Визуальное присутствие" score={videoInterviewSummary.visual_presence} />

                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">{videoInterviewSummary.summary}</p>
                </div>

                {videoInterviewSummary.emotional_overview && (
                  <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
                    <h4 className="text-xs font-medium text-violet-700 uppercase mb-2">Эмоциональная картина</h4>
                    <p className="text-sm text-slate-700">{videoInterviewSummary.emotional_overview}</p>
                  </div>
                )}

                {videoInterviewSummary.behavioral_observations && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <h4 className="text-xs font-medium text-blue-700 uppercase mb-2">Мимика и поведение в кадре</h4>
                    <p className="text-sm text-slate-700">{videoInterviewSummary.behavioral_observations}</p>
                  </div>
                )}

                {videoInterviewSummary.emotion_summary?.distribution && (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(videoInterviewSummary.emotion_summary.distribution).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">{emotionLabel(key)}</p>
                        <p className="text-sm font-medium text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium">Рекомендация:</span>
                  <RecBadge rec={videoInterviewSummary.recommendation} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function emotionLabel(key) {
  return {
    confident: 'Уверенность',
    engaged: 'Вовлечённость',
    neutral: 'Нейтрально',
    stressed: 'Напряжение',
  }[key] || key;
}

function RecBadge({ rec }) {
  const config = {
    strong_yes: { label: 'Настоятельно рекомендован', color: 'bg-emerald-100 text-emerald-800' },
    yes: { label: 'Рекомендован', color: 'bg-green-100 text-green-800' },
    maybe: { label: 'На рассмотрении', color: 'bg-amber-100 text-amber-800' },
    no: { label: 'Не рекомендован', color: 'bg-red-100 text-red-800' },
    strong_no: { label: 'Отклонён', color: 'bg-red-200 text-red-900' },
  };
  const { label, color } = config[rec] || { label: rec, color: 'bg-slate-100 text-slate-700' };
  return <span className={`${color} px-2.5 py-1 rounded-full text-xs font-medium`}>{label}</span>;
}
