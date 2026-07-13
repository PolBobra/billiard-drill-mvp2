'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import YandexCaptcha, { type YandexCaptchaInstance } from '@/components/YandexCaptcha';
import { supabase } from '@/lib/supabaseClient';
import Nav from '@/components/Nav';
import { DISCIPLINES, disciplineLabel } from '@/lib/disciplines';
import { TIER_LABELS } from '@/lib/subscriptionTiers';
import { ShotDiagram } from '@/lib/shotGeometry';
import ShotDiagramView from '@/components/ShotDiagramView';

type MarketplaceTrainer = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  trainer_rank: string | null;
  trainer_school: string | null;
  trainer_disciplines: string[] | null;
  phone: string | null;
  telegram: string | null;
  club_name: string | null;
  club_city: string | null;
};

type ShotLog = {
  id: string;
  error_type: string;
  angle: number | null;
  distance: string | null;
  completed: boolean;
  created_at: string;
  diagram: ShotDiagram | null;
};

type TrainerNote = {
  id: string;
  shot_log_id: string;
  note: string;
  created_at: string;
  read_at: string | null;
};

type LinkedStudent = { id: string; full_name: string | null };

export default function TrainerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'marketplace' | 'my-trainer' | 'my-students'>('marketplace');
  const [userId, setUserId] = useState<string | null>(null);
  const [isVerifiedTrainer, setIsVerifiedTrainer] = useState(false);
  const [linkedTrainerId, setLinkedTrainerId] = useState<string | null>(null);
  const [linkedTrainerName, setLinkedTrainerName] = useState('');
  const [loading, setLoading] = useState(true);

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
  }

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data } = await supabase
        .from('profiles')
        .select('is_verified_trainer, linked_trainer_id')
        .eq('id', uid)
        .single();
      setIsVerifiedTrainer(!!data?.is_verified_trainer);
      setLinkedTrainerId(data?.linked_trainer_id || null);

      if (data?.linked_trainer_id) {
        const { data: trainer } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.linked_trainer_id)
          .single();
        setLinkedTrainerName(trainer?.full_name || '');
      }

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center">
        Загрузка…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">🎓 Тренер</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTab('marketplace')}
            className={`px-4 py-2 rounded-full text-sm ${tab === 'marketplace' ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
          >
            Маркетплейс
          </button>
          <button
            onClick={() => setTab('my-trainer')}
            className={`px-4 py-2 rounded-full text-sm ${tab === 'my-trainer' ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
          >
            Мой тренер
          </button>
          {isVerifiedTrainer && (
            <button
              onClick={() => setTab('my-students')}
              className={`px-4 py-2 rounded-full text-sm ${tab === 'my-students' ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
            >
              Мои ученики
            </button>
          )}
        </div>

        {tab === 'marketplace' && <MarketplaceTab />}
        {tab === 'my-trainer' && userId && (
          <MyTrainerTab
            userId={userId}
            linkedTrainerId={linkedTrainerId}
            linkedTrainerName={linkedTrainerName}
            authHeader={authHeader}
            onLinked={(name) => setLinkedTrainerName(name)}
          />
        )}
        {tab === 'my-students' && userId && <MyStudentsTab authHeader={authHeader} />}
      </div>
    </main>
  );
}

function MarketplaceTab() {
  const [trainers, setTrainers] = useState<MarketplaceTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select(
          'id, full_name, avatar_url, trainer_rank, trainer_school, trainer_disciplines, phone, telegram, clubs(name, city)'
        )
        .eq('is_verified_trainer', true);

      const mapped: MarketplaceTrainer[] = (data || []).map((p: any) => {
        const club = Array.isArray(p.clubs) ? p.clubs[0] : p.clubs;
        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          trainer_rank: p.trainer_rank,
          trainer_school: p.trainer_school,
          trainer_disciplines: p.trainer_disciplines,
          phone: p.phone,
          telegram: p.telegram,
          club_name: club?.name || null,
          club_city: club?.city || null,
        };
      });
      setTrainers(mapped);
      setLoading(false);
    }
    load();
  }, []);

  function toggleDiscipline(value: string) {
    setDisciplineFilter((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  }

  const cities = Array.from(new Set(trainers.map((t) => t.club_city).filter(Boolean))) as string[];
  const filtered = trainers.filter((t) => {
    if (cityFilter && t.club_city !== cityFilter) return false;
    if (disciplineFilter.length && !disciplineFilter.some((d) => (t.trainer_disciplines || []).includes(d)))
      return false;
    return true;
  });

  if (loading) return <p className="text-white/50">Загрузка…</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="p-2 rounded-lg bg-white/10 text-white text-sm"
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => (
            <button
              key={d.value}
              onClick={() => toggleDiscipline(d.value)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                disciplineFilter.includes(d.value) ? 'bg-accent text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((t) => (
          <div key={t.id} className="bg-black/30 rounded-2xl p-4 flex gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
              {t.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatar_url} alt={t.full_name || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/40 text-xs">Нет фото</span>
              )}
            </div>
            <div className="text-sm text-white/80 space-y-1">
              <p className="text-white font-semibold">{t.full_name || 'Без имени'}</p>
              {t.trainer_rank && <p className="text-accent">{t.trainer_rank}</p>}
              {(t.club_name || t.club_city) && (
                <p>
                  {t.club_name}
                  {t.club_city ? `, ${t.club_city}` : ''}
                </p>
              )}
              {t.trainer_disciplines && t.trainer_disciplines.length > 0 && (
                <p className="text-white/50">{t.trainer_disciplines.map(disciplineLabel).join(', ')}</p>
              )}
              {t.phone && <p>📞 {t.phone}</p>}
              {t.telegram && <p>✈️ {t.telegram}</p>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-white/40 col-span-2">Тренеров по фильтру не найдено.</p>}
      </div>
    </div>
  );
}

function MyTrainerTab({
  userId,
  linkedTrainerId,
  linkedTrainerName,
  authHeader,
  onLinked,
}: {
  userId: string;
  linkedTrainerId: string | null;
  linkedTrainerName: string;
  authHeader: () => Promise<{ Authorization: string }>;
  onLinked: (name: string) => void;
}) {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkingSub, setCheckingSub] = useState(true);
  const [code, setCode] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<YandexCaptchaInstance>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linked, setLinked] = useState(!!linkedTrainerId);
  const [trainerName, setTrainerName] = useState(linkedTrainerName);

  const [notes, setNotes] = useState<(TrainerNote & { shotLog?: ShotLog })[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    async function checkSub() {
      const { data } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', userId)
        .eq('tier', 'with_trainer')
        .eq('status', 'active')
        .maybeSingle();
      const active = !!data && (!data.expires_at || new Date(data.expires_at) > new Date());
      setHasSubscription(active);
      setCheckingSub(false);
    }
    checkSub();
  }, [userId]);

  useEffect(() => {
    if (!linked) return;
    async function loadNotes() {
      setNotesLoading(true);
      const { data: noteRows } = await supabase
        .from('trainer_notes')
        .select('id, shot_log_id, note, created_at, read_at')
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      const shotLogIds = (noteRows || []).map((n) => n.shot_log_id);
      let shotLogsById: Record<string, ShotLog> = {};
      if (shotLogIds.length) {
        const { data: logs } = await supabase
          .from('shot_logs')
          .select('id, error_type, angle, distance, completed, created_at')
          .in('id', shotLogIds);
        shotLogsById = Object.fromEntries((logs || []).map((l) => [l.id, l as ShotLog]));
      }

      setNotes((noteRows || []).map((n) => ({ ...n, shotLog: shotLogsById[n.shot_log_id] })));
      setNotesLoading(false);
    }
    loadNotes();
  }, [linked, userId]);

  async function markRead(noteId: string) {
    await fetch('/api/trainer/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ noteId }),
    });
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !captchaToken) return;
    setLinking(true);
    setLinkError('');
    const res = await fetch('/api/trainer/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ code: code.trim(), captchaToken }),
    });
    const json = await res.json();
    setLinking(false);
    if (!res.ok) {
      setLinkError(json.error || 'Не удалось привязаться');
      captchaRef.current?.reset();
      setCaptchaToken(null);
      return;
    }
    setLinked(true);
    setTrainerName(json.trainerName || '');
    onLinked(json.trainerName || '');
  }

  if (checkingSub) return <p className="text-white/50">Загрузка…</p>;

  if (!hasSubscription) {
    return (
      <div className="bg-black/30 rounded-2xl p-6 text-white/70">
        Раздел доступен по подписке «{TIER_LABELS.with_trainer}». Подписка подключается вручную администратором
        — напишите нам, чтобы её активировать.
      </div>
    );
  }

  if (!linked) {
    return (
      <form onSubmit={handleLink} className="bg-black/30 rounded-2xl p-6 space-y-4 max-w-sm">
        <p className="text-white/70 text-sm">Введите секретный код, который вам дал тренер.</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50 tracking-widest text-center text-lg font-mono"
          placeholder="XXXXXX"
        />
        <YandexCaptcha
          ref={captchaRef}
          siteKey={process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_SITE_KEY!}
          onSuccess={(token) => setCaptchaToken(token)}
        />
        {linkError && <p className="text-red-400 text-sm">{linkError}</p>}
        <button
          disabled={linking || !captchaToken || !code.trim()}
          className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {linking ? 'Проверяем…' : 'Привязаться'}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-white/70">
        Ваш тренер: <span className="text-white font-semibold">{trainerName || '—'}</span>
      </p>
      {notesLoading ? (
        <p className="text-white/50">Загрузка заметок…</p>
      ) : notes.length === 0 ? (
        <p className="text-white/40">Заметок пока нет.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`bg-black/30 rounded-xl p-4 cursor-pointer ${!n.read_at ? 'border border-accent/50' : ''}`}
            >
              {n.shotLog && (
                <p className="text-white/50 text-xs mb-1">
                  {n.shotLog.error_type} · {new Date(n.shotLog.created_at).toLocaleDateString('ru-RU')}
                </p>
              )}
              <p className="text-white/90 text-sm">{n.note}</p>
              {!n.read_at && <p className="text-accent text-xs mt-1">Новое</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyStudentsTab({ authHeader }: { authHeader: () => Promise<{ Authorization: string }> }) {
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LinkedStudent | null>(null);
  const [shotLogs, setShotLogs] = useState<ShotLog[]>([]);
  const [notesByLog, setNotesByLog] = useState<Record<string, TrainerNote>>({});
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingLogId, setSavingLogId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState('');
  const [canWrite, setCanWrite] = useState(true);
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      const { data } = await supabase.from('profiles').select('id, full_name').eq('linked_trainer_id', uid);
      setStudents(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function openStudent(s: LinkedStudent) {
    setSelected(s);
    setLoadingLogs(true);
    setAccessError('');
    const res = await fetch(`/api/trainer/students/${s.id}/shot-logs`, { headers: await authHeader() });
    const json = await res.json();
    if (!res.ok) {
      setAccessError(json.error || 'Нет доступа');
      setShotLogs([]);
      setNotesByLog({});
    } else {
      setShotLogs(json.shotLogs || []);
      setNotesByLog(Object.fromEntries((json.notes || []).map((n: TrainerNote) => [n.shot_log_id, n])));
      setCanWrite(json.canWrite !== false);
    }
    setLoadingLogs(false);
  }

  async function saveNote(shotLogId: string) {
    if (!selected || !noteDrafts[shotLogId]?.trim()) return;
    setSavingLogId(shotLogId);
    const res = await fetch('/api/trainer/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ studentId: selected.id, shotLogId, note: noteDrafts[shotLogId].trim() }),
    });
    if (res.ok) {
      setNoteDrafts((prev) => ({ ...prev, [shotLogId]: '' }));
      openStudent(selected);
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error || 'Не удалось сохранить заметку');
    }
    setSavingLogId(null);
  }

  if (loading) return <p className="text-white/50">Загрузка…</p>;
  if (students.length === 0) return <p className="text-white/40">Пока нет привязанных учеников.</p>;

  return (
    <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
      <div className="space-y-2">
        {students.map((s) => (
          <button
            key={s.id}
            onClick={() => openStudent(s)}
            className={`w-full text-left p-3 rounded-lg text-sm ${
              selected?.id === s.id ? 'bg-accent text-black' : 'bg-white/10 text-white/80'
            }`}
          >
            {s.full_name || 'Без имени'}
          </button>
        ))}
      </div>

      <div>
        {!selected && <p className="text-white/40">Выберите ученика слева.</p>}
        {selected && loadingLogs && <p className="text-white/50">Загрузка…</p>}
        {selected && accessError && <p className="text-red-400">{accessError}</p>}
        {selected && !loadingLogs && !accessError && (
          <div className="space-y-3">
            {!canWrite && (
              <p className="text-yellow-400 text-sm">
                У ученика нет активной подписки with_trainer — доступна только история до момента отключения,
                новые записи и добавление заметок недоступны.
              </p>
            )}
            {shotLogs.length === 0 && <p className="text-white/40">У ученика пока нет записей.</p>}
            {shotLogs.map((log) => {
              const existingNote = notesByLog[log.id];
              const open = openLogId === log.id;
              return (
                <div key={log.id} className="bg-black/30 rounded-xl p-4">
                  <button
                    type="button"
                    onClick={() => setOpenLogId(open ? null : log.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <p className="text-white/80 text-sm">
                      {log.error_type} · {log.distance || '—'} ·{' '}
                      {new Date(log.created_at).toLocaleDateString('ru-RU')}
                    </p>
                    <span className="text-white/40 text-sm shrink-0 ml-2">{open ? '▲' : '▼'}</span>
                  </button>
                  {open && (
                    <div className="mt-3">
                      {log.diagram ? (
                        <ShotDiagramView d={log.diagram} />
                      ) : (
                        <p className="text-white/40 text-sm">Для этой ошибки рисунок не сохранён.</p>
                      )}
                    </div>
                  )}
                  {existingNote ? (
                    <p className="text-accent text-sm mt-2">Заметка: {existingNote.note}</p>
                  ) : canWrite ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={noteDrafts[log.id] || ''}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [log.id]: e.target.value }))}
                        placeholder="Добавить заметку…"
                        className="flex-1 p-2 rounded bg-white/10 text-white placeholder-white/50 text-sm"
                      />
                      <button
                        onClick={() => saveNote(log.id)}
                        disabled={savingLogId === log.id}
                        className="px-3 py-1.5 rounded-full bg-accent text-black text-sm disabled:opacity-50"
                      >
                        Сохранить
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
