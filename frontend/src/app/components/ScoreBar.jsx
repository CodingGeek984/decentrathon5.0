export default function ScoreBar({ label, score, maxScore = 100, showFactors = false, factors = [] }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-blue-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{Math.round(score)}/{maxScore}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showFactors && factors.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {factors.map((f, i) => (
            <li key={i} className="text-xs text-slate-500 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-slate-300 before:rounded-full">
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
