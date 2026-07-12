'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DISCIPLINES } from '@/lib/disciplines';
import { notifyAdmin } from '@/lib/notifyAdmin';

type Prefill = {
  fullName?: string;
  email?: string;
  rank?: string;
  phone?: string;
  school?: string;
  telegram?: string;
  disciplines?: string[];
};

export default function TrainerVerificationForm({
  userId,
  requestType,
  prefill,
  onSubmitted,
  onCancel,
}: {
  userId: string;
  requestType: 'initial' | 'edit';
  prefill?: Prefill;
  onSubmitted: () => void;
  onCancel?: () => void;
}) {
  const [fullName, setFullName] = useState(prefill?.fullName || '');
  const [email, setEmail] = useState(prefill?.email || '');
  const [rank, setRank] = useState(prefill?.rank || '');
  const [phone, setPhone] = useState(prefill?.phone || '');
  const [school, setSchool] = useState(prefill?.school || '');
  const [telegram, setTelegram] = useState(prefill?.telegram || '');
  const [disciplines, setDisciplines] = useState<string[]>(prefill?.disciplines || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleDiscipline(value: string) {
    setDisciplines((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !rank.trim() || !phone.trim()) {
      setError('Заполните ФИО, email, звание и телефон');
      return;
    }
    setSaving(true);
    setError('');

    if (requestType === 'edit') {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/trainer/listing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          rank: rank.trim(),
          phone: phone.trim(),
          school: school.trim() || null,
          telegram: telegram.trim() || null,
          disciplines,
        }),
      });
      setSaving(false);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError('Ошибка сохранения: ' + (json.error || 'неизвестная ошибка'));
        return;
      }
      onSubmitted();
      return;
    }

    const { error: insertError } = await supabase.from('trainer_verification_requests').insert({
      user_id: userId,
      request_type: requestType,
      full_name: fullName.trim(),
      email: email.trim(),
      rank: rank.trim(),
      phone: phone.trim(),
      school: school.trim() || null,
      telegram: telegram.trim() || null,
      disciplines,
    });
    setSaving(false);
    if (insertError) {
      setError('Ошибка отправки: ' + insertError.message);
      return;
    }
    notifyAdmin(`🎓 Заявка на верификацию тренера: ${fullName.trim()} (${email.trim()})`);
    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-black/20 p-4 rounded-xl">
      <div>
        <label className="text-white/70 text-sm block mb-1">ФИО</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          placeholder="Иванов Иван Иванович"
        />
      </div>
      <div>
        <label className="text-white/70 text-sm block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="text-white/70 text-sm block mb-1">Звание</label>
        <input
          type="text"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          placeholder="Мастер спорта"
        />
      </div>
      <div>
        <label className="text-white/70 text-sm block mb-1">Телефон</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          placeholder="+7 900 000-00-00"
        />
      </div>
      <div>
        <label className="text-white/70 text-sm block mb-1">Школа/клуб (необязательно)</label>
        <input
          type="text"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
        />
      </div>
      <div>
        <label className="text-white/70 text-sm block mb-1">Telegram</label>
        <input
          type="text"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          placeholder="@username"
        />
      </div>
      <div>
        <label className="text-white/70 text-sm block mb-2">Дисциплины</label>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => (
            <button
              type="button"
              key={d.value}
              onClick={() => toggleDiscipline(d.value)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                disciplines.includes(d.value) ? 'bg-accent text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Сохраняем…' : requestType === 'edit' ? 'Сохранить' : 'Отправить на проверку'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 rounded-lg bg-white/10 text-white/70">
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
