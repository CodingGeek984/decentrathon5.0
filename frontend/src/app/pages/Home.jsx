import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, Bot, User, GraduationCap, FileText, Search, Sparkles, MessageCircle, ArrowRight, Loader, Shield, TrendingUp, Heart } from 'lucide-react';
import { api } from '../api';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">inVision U</h1>
                <p className="text-xs text-slate-500 -mt-0.5">Университет от inDrive</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/apply" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">
                Подать заявку
              </Link>
              <Link to="/status" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">
                Статус заявки
              </Link>
              <Link to="/admin/login" className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">
                Комиссия
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero + Chat */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left — info */}
          <div className="space-y-8 pt-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" /> 100% грант от inDrive
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                Начни свой путь<br />в <span className="text-primary-600">inVision U</span>
              </h2>
              <p className="text-slate-500 mt-4 text-lg leading-relaxed">
                Задай вопрос нашему AI-ассистенту, подай заявку или пройди интервью — всё в одном месте.
              </p>
            </div>

            {/* Quick actions */}
            <div className="space-y-3">
              <Link to="/apply" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Подать заявку</p>
                  <p className="text-xs text-slate-500">Заполните анкету и напишите эссе</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600" />
              </Link>

              <Link to="/status" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600 group-hover:bg-violet-100">
                  <Search className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Проверить статус</p>
                  <p className="text-xs text-slate-500">Узнайте результат по email</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600" />
              </Link>
            </div>

            {/* What we look for */}
            <div className="grid grid-cols-2 gap-3">
              <QualityCard icon={TrendingUp} title="Лидерство" desc="Инициативность и командная работа" color="text-blue-600 bg-blue-50" />
              <QualityCard icon={Heart} title="Мотивация" desc="Конкретные цели и видение" color="text-rose-600 bg-rose-50" />
              <QualityCard icon={Sparkles} title="Рост" desc="Путь преодоления и рефлексия" color="text-amber-600 bg-amber-50" />
              <QualityCard icon={Shield} title="Честность" desc="Аутентичность, а не шаблоны" color="text-emerald-600 bg-emerald-50" />
            </div>
          </div>

          {/* Right — CHATBOT */}
          <ChatBot />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-400">
            inVision U — инновационный университет от inDrive | Decentrathon 5.0
          </p>
        </div>
      </footer>
    </div>
  );
}

function QualityCard({ icon: Icon, title, desc, color }) {
  return (
    <div className="p-3 bg-white rounded-xl border border-slate-200">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-semibold text-slate-900 text-sm">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </div>
  );
}

function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState('');
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);

    try {
      const result = await api.sendChatMessage(msg, sessionId);
      setSessionId(result.sessionId);
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

  const quickQuestions = [
    'Что такое inVision U?',
    'Как подать заявку?',
    'Какие критерии отбора?',
    'Нужно ли платить?',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-[600px]">
      {/* Chat header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">AI-ассистент inVision U</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-white/80">Онлайн — задайте любой вопрос</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary-500" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">Привет! Я AI-ассистент</p>
            <p className="text-sm text-slate-500 mb-6 max-w-xs">
              Спросите меня о программе inVision U, процессе отбора или подготовке заявки
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  m.role === 'user' ? 'bg-primary-100' : 'bg-white border border-slate-200'
                }`}>
                  {m.role === 'user'
                    ? <User className="w-4 h-4 text-primary-600" />
                    : <Bot className="w-4 h-4 text-primary-600" />
                  }
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-white text-slate-800 rounded-bl-md border border-slate-100 shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
                <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600">{error}</div>
      )}

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-200">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите что-нибудь..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            disabled={sending}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
