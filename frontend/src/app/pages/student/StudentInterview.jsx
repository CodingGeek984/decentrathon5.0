import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, Bot, User, Loader, Video } from 'lucide-react';
import { api } from '../../api';

export default function StudentInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiReady, setAiReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    Promise.all([
      api.getAiStatus(),
      api.getStudentProfile(id),
      api.getInterviewHistory(id),
      api.getAiAnalysis(id).catch(() => ({})),
    ]).then(([status, prof, history, analyses]) => {
      setAiReady(status.configured);
      setProfile(prof);
      setMessages(history);
      if (analyses.interview_summary) setSummary(analyses.interview_summary);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startInterview = async () => {
    setSending(true);
    setError('');
    try {
      const result = await api.startInterview(id);
      setMessages([
        { role: 'user', content: 'Здравствуйте, я готов к интервью.' },
        { role: 'assistant', content: result.reply },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);
    setError('');

    try {
      const result = await api.sendInterviewMessage(id, msg);
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const finishInterview = async () => {
    setSummarizing(true);
    setError('');
    try {
      const result = await api.summarizeInterview(id);
      setSummary(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  if (!aiReady) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Bot className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">AI-интервью временно недоступно</h2>
        <p className="text-slate-500 mb-6">AI API не настроен. Пожалуйста, обратитесь к администратору или попробуйте позже.</p>
        <Link to="/" className="text-primary-600 hover:text-primary-800 text-sm font-medium">Вернуться на главную</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">AI-интервью</h2>
            <p className="text-xs text-slate-500">
              {profile ? `${profile.full_name} — inVision U` : 'inVision U'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 p-4 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Мотивационное интервью</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              AI-ассистент проведёт с вами беседу, чтобы лучше понять вашу мотивацию, ценности и цели. Это не экзамен — просто будьте собой.
            </p>
            <button
              onClick={startInterview}
              disabled={sending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {sending ? <Loader className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Начать интервью
            </button>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  m.role === 'user' ? 'bg-slate-100' : 'bg-primary-100'
                }`}>
                  {m.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-primary-600" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-md'
                    : 'bg-slate-100 text-slate-800 rounded-tl-md'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 mb-2">{error}</div>}

      {summary && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Интервью завершено</p>
              <h3 className="text-base font-semibold text-slate-900 mt-1">Можно переходить к видео-интервью</h3>
              <p className="text-sm text-slate-600 mt-2">{summary.summary}</p>
            </div>
            <Link
              to={`/video-interview/${id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
            >
              <Video className="w-4 h-4" /> Пройти видео-интервью
            </Link>
          </div>
        </div>
      )}

      {/* Input */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {!summary && messages.length >= 4 && (
            <div className="flex justify-end">
              <button
                onClick={finishInterview}
                disabled={summarizing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 disabled:opacity-50"
              >
                {summarizing ? <Loader className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                Завершить и перейти к видео-интервью
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите ваш ответ..."
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none h-12 max-h-32"
              disabled={sending || !!summary}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || !!summary}
              className="px-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
