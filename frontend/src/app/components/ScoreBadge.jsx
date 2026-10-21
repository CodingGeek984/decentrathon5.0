export function ScoreBadge({ score, size = 'md' }) {
  const color = score >= 75 ? 'text-emerald-700 bg-emerald-50 ring-emerald-200'
    : score >= 55 ? 'text-blue-700 bg-blue-50 ring-blue-200'
    : score >= 35 ? 'text-amber-700 bg-amber-50 ring-amber-200'
    : 'text-red-700 bg-red-50 ring-red-200';

  const sizeClasses = size === 'lg'
    ? 'text-2xl font-bold w-16 h-16'
    : size === 'sm'
    ? 'text-xs font-semibold w-8 h-8'
    : 'text-sm font-bold w-10 h-10';

  return (
    <div className={`${color} ${sizeClasses} rounded-full ring-1 flex items-center justify-center`}>
      {Math.round(score)}
    </div>
  );
}

export function RecommendationBadge({ recommendation }) {
  const config = {
    strong_yes: { label: 'Настоятельно рекомендован', color: 'bg-emerald-100 text-emerald-800' },
    yes: { label: 'Рекомендован', color: 'bg-green-100 text-green-800' },
    maybe: { label: 'На рассмотрении', color: 'bg-amber-100 text-amber-800' },
    no: { label: 'Не рекомендован', color: 'bg-red-100 text-red-800' },
    strong_no: { label: 'Отклонён', color: 'bg-red-200 text-red-900' },
  };
  const { label, color } = config[recommendation] || { label: recommendation, color: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`${color} px-2.5 py-1 rounded-full text-xs font-medium`}>{label}</span>
  );
}

export function StatusBadge({ status }) {
  const config = {
    pending: { label: 'Ожидает', color: 'bg-slate-100 text-slate-700' },
    reviewed: { label: 'Рассмотрен', color: 'bg-blue-100 text-blue-800' },
    shortlisted: { label: 'В шорт-листе', color: 'bg-violet-100 text-violet-800' },
    rejected: { label: 'Отклонён', color: 'bg-red-100 text-red-800' },
    accepted: { label: 'Принят', color: 'bg-emerald-100 text-emerald-800' },
  };
  const { label, color } = config[status] || { label: status, color: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`${color} px-2 py-0.5 rounded-full text-xs font-medium`}>{label}</span>
  );
}
