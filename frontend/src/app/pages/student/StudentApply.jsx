import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, X, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../../api';

export default function StudentApply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    full_name: '', age: '', city: '', school: '', grade: '', email: '', phone: '', gpa: '',
    achievements: [''], extracurriculars: [''], leadership_roles: [''],
    essay_motivation: '', essay_leadership: '', essay_goals: '',
  });

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const updateArray = (field, i, value) => setForm(f => {
    const arr = [...f[field]]; arr[i] = value; return { ...f, [field]: arr };
  });
  const addToArray = (field) => setForm(f => ({ ...f, [field]: [...f[field], ''] }));
  const removeFromArray = (field, i) => setForm(f => ({ ...f, [field]: f[field].filter((_, j) => j !== i) }));

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const data = {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        gpa: form.gpa ? parseFloat(form.gpa) : null,
        achievements: form.achievements.filter(Boolean),
        extracurriculars: form.extracurriculars.filter(Boolean),
        leadership_roles: form.leadership_roles.filter(Boolean),
      };
      const result = await api.submitApplication(data);
      setSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Заявка отправлена!</h2>
        <p className="text-slate-500 mb-6">
          Спасибо за вашу заявку в inVision U. Мы рассмотрим её и свяжемся с вами.
        </p>
        <p className="text-sm text-slate-400 mb-8">Ваш ID: <code className="bg-slate-100 px-2 py-1 rounded">{success.candidateId}</code></p>
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => navigate(`/interview/${success.candidateId}`)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
          >
            Пройти AI-интервью
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  const totalSteps = 3;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-slate-900">Заявка в inVision U</h2>
      </div>
      <p className="text-slate-500 mb-8">Шаг {step} из {totalSteps}</p>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary-500' : 'bg-slate-200'}`} />
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-6">{error}</div>}

      {/* Step 1: Personal info */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h3 className="font-semibold text-slate-900">Личные данные</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="ФИО *" value={form.full_name} onChange={v => updateField('full_name', v)} required />
            <Input label="Email *" type="email" value={form.email} onChange={v => updateField('email', v)} required />
            <Input label="Возраст" type="number" value={form.age} onChange={v => updateField('age', v)} />
            <Input label="Телефон" value={form.phone} onChange={v => updateField('phone', v)} />
            <Input label="Город" value={form.city} onChange={v => updateField('city', v)} />
            <Input label="Школа" value={form.school} onChange={v => updateField('school', v)} />
            <Input label="Класс" value={form.grade} onChange={v => updateField('grade', v)} />
            <Input label="GPA (0-5)" type="number" step="0.1" min="0" max="5" value={form.gpa} onChange={v => updateField('gpa', v)} />
          </div>

          <div className="space-y-4">
            <ArraySection label="Достижения" items={form.achievements} field="achievements"
              placeholder="Олимпиады, конкурсы, награды..."
              onUpdate={updateArray} onAdd={addToArray} onRemove={removeFromArray} />
            <ArraySection label="Внеучебная деятельность" items={form.extracurriculars} field="extracurriculars"
              placeholder="Клубы, волонтёрство, хобби..."
              onUpdate={updateArray} onAdd={addToArray} onRemove={removeFromArray} />
            <ArraySection label="Лидерские роли" items={form.leadership_roles} field="leadership_roles"
              placeholder="Президент клуба, капитан команды..."
              onUpdate={updateArray} onAdd={addToArray} onRemove={removeFromArray} />
          </div>
        </div>
      )}

      {/* Step 2: Essays */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h3 className="font-semibold text-slate-900">Эссе</h3>
          <p className="text-sm text-slate-500">Пишите от себя, искренне. Мы ценим настоящий голос, а не красивые формулировки. Система определяет тексты, написанные ИИ.</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Эссе о мотивации *</label>
            <p className="text-xs text-slate-400 mb-2">Почему вы хотите учиться в inVision U? Что вами движет? Какую проблему вы хотите решить?</p>
            <textarea
              value={form.essay_motivation}
              onChange={e => updateField('essay_motivation', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none h-40"
              placeholder="Расскажите свою историю..."
              required
            />
            <WordCount text={form.essay_motivation} min={100} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Эссе о лидерстве</label>
            <p className="text-xs text-slate-400 mb-2">Расскажите о ситуации, где вы проявили лидерство. Какие уроки вы извлекли?</p>
            <textarea
              value={form.essay_leadership}
              onChange={e => updateField('essay_leadership', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none h-40"
              placeholder="Лидерство — это не только должности..."
            />
            <WordCount text={form.essay_leadership} min={80} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Эссе о целях</label>
            <p className="text-xs text-slate-400 mb-2">Каковы ваши цели на 5-10 лет? Как inVision U поможет их достичь?</p>
            <textarea
              value={form.essay_goals}
              onChange={e => updateField('essay_goals', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none h-40"
              placeholder="Опишите своё видение будущего..."
            />
            <WordCount text={form.essay_goals} min={80} />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Проверьте вашу заявку</h3>

            <div className="space-y-3 text-sm">
              <ReviewRow label="ФИО" value={form.full_name} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Город" value={form.city} />
              <ReviewRow label="Школа" value={form.school} />
              <ReviewRow label="Класс" value={form.grade} />
              <ReviewRow label="GPA" value={form.gpa} />
              <ReviewRow label="Достижения" value={form.achievements.filter(Boolean).join(', ') || '—'} />
              <ReviewRow label="Деятельность" value={form.extracurriculars.filter(Boolean).join(', ') || '—'} />
              <ReviewRow label="Лидерские роли" value={form.leadership_roles.filter(Boolean).join(', ') || '—'} />
            </div>
          </div>

          {form.essay_motivation && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Эссе о мотивации</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{form.essay_motivation}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              Нажимая «Отправить», вы соглашаетесь на обработку данных для целей отбора в inVision U. Ваши данные не будут переданы третьим лицам.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <button onClick={() => setStep(s => s - 1)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50">
            Назад
          </button>
        ) : <div />}

        {step < totalSteps ? (
          <button
            onClick={() => {
              if (step === 1 && (!form.full_name || !form.email)) {
                setError('Заполните ФИО и Email');
                return;
              }
              if (step === 2 && !form.essay_motivation) {
                setError('Эссе о мотивации обязательно');
                return;
              }
              setError('');
              setStep(s => s + 1);
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700"
          >
            Далее
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Отправка...' : 'Отправить заявку'}
          </button>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" {...props} />
    </div>
  );
}

function ArraySection({ label, items, field, placeholder, onUpdate, onAdd, onRemove }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => onUpdate(field, i, e.target.value)} placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            {items.length > 1 && (
              <button type="button" onClick={() => onRemove(field, i)} className="p-2 text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => onAdd(field)} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium">
          <Plus className="w-3.5 h-3.5" /> Добавить
        </button>
      </div>
    </div>
  );
}

function WordCount({ text, min }) {
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  const isOk = count >= min;
  return (
    <p className={`text-xs mt-1 ${isOk ? 'text-emerald-600' : 'text-slate-400'}`}>
      {count} слов {min ? `(рекомендуется от ${min})` : ''}
    </p>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );
}
