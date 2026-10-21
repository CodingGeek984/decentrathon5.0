import { Link } from 'react-router-dom';
import { GraduationCap, FileText, MessageCircle, Search, ArrowRight, Sparkles, Shield, Users } from 'lucide-react';

export default function StudentLanding() {
  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Hero */}
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" /> Decentrathon 5.0 — AI inDrive
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
          Подай заявку в <span className="text-primary-600">inVision U</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
          Инновационный университет от inDrive с 100% грантами. Мы ищем будущих лидеров, предпринимателей и создателей — тех, кто готов менять мир.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/student/apply" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors">
            <FileText className="w-5 h-5" /> Подать заявку <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/student/status" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
            <Search className="w-5 h-5" /> Проверить статус
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4 pb-16">
        <FeatureCard
          icon={FileText}
          title="Онлайн-заявка"
          desc="Заполните анкету и напишите эссе. Наша AI-система поможет оценить ваш профиль."
          color="bg-blue-50 text-blue-600"
        />
        <FeatureCard
          icon={MessageCircle}
          title="AI-интервью"
          desc="Пройдите мотивационное интервью с AI-ассистентом. Это не экзамен — это разговор."
          color="bg-violet-50 text-violet-600"
        />
        <FeatureCard
          icon={Shield}
          title="Честный отбор"
          desc="AI — инструмент поддержки. Финальное решение всегда принимает приёмная комиссия."
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* What we look for */}
      <div className="bg-white border-t border-slate-200 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Кого мы ищем</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QualityCard emoji="🌟" title="Лидерский потенциал" desc="Не обязательно быть президентом класса. Важно, что вы инициируете и вдохновляете." />
            <QualityCard emoji="🚀" title="Траектория роста" desc="Нас интересует ваш путь, а не только текущие достижения. Расскажите о преодолениях." />
            <QualityCard emoji="💡" title="Мотивация и видение" desc="Зачем вам inVision U? Что вы хотите изменить? Конкретные цели ценнее общих слов." />
            <QualityCard emoji="🤝" title="Ценности и аутентичность" desc="Будьте собой. Мы ценим честность и искренность больше, чем красивые формулировки." />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
      <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function QualityCard({ emoji, title, desc }) {
  return (
    <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
      <span className="text-2xl">{emoji}</span>
      <div>
        <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
        <p className="text-xs text-slate-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}
