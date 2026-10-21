import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Plus, X } from 'lucide-react';
import { api } from '../api';

export default function AddCandidate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '', age: '', city: '', school: '', grade: '', email: '', phone: '', gpa: '',
    achievements: [''], extracurriculars: [''], leadership_roles: [''],
    essay_motivation: '', essay_leadership: '', essay_goals: '',
  });

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const updateArray = (field, index, value) => {
    setForm(f => {
      const arr = [...f[field]];
      arr[index] = value;
      return { ...f, [field]: arr };
    });
  };

  const addToArray = (field) => setForm(f => ({ ...f, [field]: [...f[field], ''] }));

  const removeFromArray = (field, index) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const result = await api.createCandidate(data);
      navigate(`/admin/candidates/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary-600" /> Добавить кандидата
        </h2>
        <p className="text-slate-500 mt-1">Заполните данные кандидата. AI автоматически оценит профиль.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal info */}
        <Section title="Личные данные">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="ФИО *" value={form.full_name} onChange={v => updateField('full_name', v)} required />
            <Input label="Возраст" type="number" value={form.age} onChange={v => updateField('age', v)} />
            <Input label="Город" value={form.city} onChange={v => updateField('city', v)} />
            <Input label="Школа" value={form.school} onChange={v => updateField('school', v)} />
            <Input label="Класс" value={form.grade} onChange={v => updateField('grade', v)} />
            <Input label="GPA" type="number" step="0.1" min="0" max="5" value={form.gpa} onChange={v => updateField('gpa', v)} />
            <Input label="Email" type="email" value={form.email} onChange={v => updateField('email', v)} />
            <Input label="Телефон" value={form.phone} onChange={v => updateField('phone', v)} />
          </div>
        </Section>

        {/* Achievements */}
        <Section title="Достижения">
          <ArrayField items={form.achievements} field="achievements" placeholder="Например: Победитель олимпиады..."
            onUpdate={updateArray} onAdd={addToArray} onRemove={removeFromArray} />
        </Section>

        {/* Extracurriculars */}
        <Section title="Внеучебная деятельность">
          <ArrayField items={form.extracurriculars} field="extracurriculars" placeholder="Например: Волонтёр в фонде..."
            onUpdate={updateArray} onAdd={addToArray} onRemove={removeFromArray} />
        </Section>

        {/* Leadership roles */}
        <Section title="Лидерские роли">
          <ArrayField items={form.leadership_roles} field="leadership_roles" placeholder="Например: Президент клуба..."
            onUpdate={updateArray} onAdd={addToArray} onRemove={removeFromArray} />
        </Section>

        {/* Essays */}
        <Section title="Эссе">
          <Textarea label="Эссе о мотивации" value={form.essay_motivation} onChange={v => updateField('essay_motivation', v)}
            placeholder="Почему вы хотите учиться в inVision U? Что вами движет?" />
          <Textarea label="Эссе о лидерстве" value={form.essay_leadership} onChange={v => updateField('essay_leadership', v)}
            placeholder="Расскажите о вашем лидерском опыте. Какие уроки вы извлекли?" />
          <Textarea label="Эссе о целях" value={form.essay_goals} onChange={v => updateField('essay_goals', v)}
            placeholder="Каковы ваши цели на 5-10 лет? Как inVision U поможет их достичь?" />
        </Section>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={submitting}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {submitting ? 'Отправка...' : 'Добавить и оценить'}
          </button>
          <button type="button" onClick={() => navigate('/admin/candidates')}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        {...props}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 resize-none h-32 outline-none"
      />
    </div>
  );
}

function ArrayField({ items, field, placeholder, onUpdate, onAdd, onRemove }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            onChange={e => onUpdate(field, i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          {items.length > 1 && (
            <button type="button" onClick={() => onRemove(field, i)} className="p-2 text-slate-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onAdd(field)}
        className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium">
        <Plus className="w-3.5 h-3.5" /> Добавить ещё
      </button>
    </div>
  );
}
