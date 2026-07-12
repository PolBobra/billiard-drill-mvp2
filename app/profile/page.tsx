'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Nav from '@/components/Nav';
import EntityAutocomplete, { EntityOption } from '@/components/EntityAutocomplete';
import TrainerVerificationForm from '@/components/TrainerVerificationForm';
import { disciplineLabel } from '@/lib/disciplines';

type TrainerRequest = {
  id: string;
  request_type: 'initial' | 'edit';
  status: string;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [cue, setCue] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const [clubId, setClubId] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<EntityOption | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<EntityOption | null>(null);

  const [isVerifiedTrainer, setIsVerifiedTrainer] = useState(false);
  const [trainerRank, setTrainerRank] = useState('');
  const [trainerSchool, setTrainerSchool] = useState('');
  const [trainerDisciplines, setTrainerDisciplines] = useState<string[]>([]);
  const [trainerPhone, setTrainerPhone] = useState('');
  const [trainerTelegram, setTrainerTelegram] = useState('');
  const [trainerSecretCode, setTrainerSecretCode] = useState('');
  const [pendingTrainerRequest, setPendingTrainerRequest] = useState<TrainerRequest | null>(null);
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [deletingListing, setDeletingListing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);
      setUserEmail(sessionData.session.user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select(
          'full_name, club_id, coach_id, cue, avatar_url, is_verified_trainer, trainer_rank, trainer_school, trainer_disciplines, phone, telegram'
        )
        .eq('id', uid)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setCue(data.cue || '');
        setAvatarUrl(data.avatar_url || '');
        setClubId(data.club_id || null);
        setCoachId(data.coach_id || null);
        setIsVerifiedTrainer(!!data.is_verified_trainer);
        setTrainerRank(data.trainer_rank || '');
        setTrainerSchool(data.trainer_school || '');
        setTrainerDisciplines(data.trainer_disciplines || []);
        setTrainerPhone(data.phone || '');
        setTrainerTelegram(data.telegram || '');

        if (data.is_verified_trainer) {
          const { data: sessionForToken } = await supabase.auth.getSession();
          const res = await fetch('/api/trainer/me', {
            headers: { Authorization: `Bearer ${sessionForToken.session?.access_token ?? ''}` },
          });
          if (res.ok) {
            const json = await res.json();
            setTrainerSecretCode(json.code || '');
          }
        }

        const { data: pending } = await supabase
          .from('trainer_verification_requests')
          .select('id, request_type, status, created_at')
          .eq('user_id', uid)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setPendingTrainerRequest(pending || null);

        if (data.club_id) {
          const { data: clubData } = await supabase
            .from('clubs')
            .select('id, name, city')
            .eq('id', data.club_id)
            .single();
          if (clubData) setSelectedClub(clubData);
        }
        if (data.coach_id) {
          const { data: coachData } = await supabase
            .from('coaches')
            .select('id, name')
            .eq('id', data.coach_id)
            .single();
          if (coachData) setSelectedCoach(coachData);
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setMessage('');

    const path = `${userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setMessage('Не удалось загрузить фото: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // метка времени — чтобы браузер не показывал старое фото из кэша после перезаписи
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setMessage('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, club_id: clubId, coach_id: coachId, cue, avatar_url: avatarUrl })
      .eq('id', userId);
    setSaving(false);
    setMessage(error ? 'Ошибка сохранения: ' + error.message : 'Сохранено ✓');
  }

  async function refreshTrainerProfile() {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, trainer_rank, trainer_school, trainer_disciplines, phone, telegram')
      .eq('id', userId)
      .single();
    if (data) {
      setFullName(data.full_name || '');
      setTrainerRank(data.trainer_rank || '');
      setTrainerSchool(data.trainer_school || '');
      setTrainerDisciplines(data.trainer_disciplines || []);
      setTrainerPhone(data.phone || '');
      setTrainerTelegram(data.telegram || '');
    }
  }

  async function handleDeleteListing() {
    if (!confirm('Удалить объявление с маркетплейса тренеров? Резюме и код для учеников сохранятся — сможете опубликоваться снова через новую заявку.')) {
      return;
    }
    setDeletingListing(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch('/api/trainer/listing', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
    });
    setDeletingListing(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage('Не удалось удалить объявление: ' + (json.error || 'ошибка'));
      return;
    }
    setIsVerifiedTrainer(false);
    setTrainerSecretCode('');
    setMessage('Объявление удалено с маркетплейса ✓');
  }

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
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">👤 Профиль</h1>

        <div className="bg-black/30 p-6 rounded-2xl space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Фото профиля" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/40 text-xs text-center px-1">Нет фото</span>
              )}
            </div>
            <label className="text-sm text-accent cursor-pointer hover:underline">
              {uploading ? 'Загружаем…' : 'Загрузить фото'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

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
            <label className="text-white/70 text-sm block mb-1">Клуб</label>
            <EntityAutocomplete
              table="clubs"
              requestType="club"
              userId={userId}
              value={selectedClub}
              onChange={(o) => {
                setSelectedClub(o);
                setClubId(o?.id ?? null);
              }}
              placeholder="Начни вводить название клуба…"
              withCity
            />
          </div>

          <div>
            <label className="text-white/70 text-sm block mb-1">Тренер</label>
            <EntityAutocomplete
              table="coaches"
              requestType="coach"
              userId={userId}
              value={selectedCoach}
              onChange={(o) => {
                setSelectedCoach(o);
                setCoachId(o?.id ?? null);
              }}
              placeholder="Начни вводить имя тренера…"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm block mb-1">Кий</label>
            <input
              type="text"
              value={cue}
              onChange={(e) => setCue(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
              placeholder="Модель кия"
            />
          </div>

          {message && <p className="text-sm text-accent">{message}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>

        <div className="bg-black/30 p-6 rounded-2xl mt-6 space-y-4">
          <h2 className="text-lg font-bold text-white">🎓 Тренер</h2>

          {pendingTrainerRequest ? (
            <p className="text-white/60 text-sm">
              Заявка ({pendingTrainerRequest.request_type === 'initial' ? 'на верификацию' : 'на изменение резюме'})
              отправлена {new Date(pendingTrainerRequest.created_at).toLocaleDateString('ru-RU')} и ожидает
              рассмотрения администратором.
            </p>
          ) : isVerifiedTrainer ? (
            showTrainerForm ? (
              <TrainerVerificationForm
                userId={userId!}
                requestType="edit"
                prefill={{
                  fullName,
                  email: userEmail,
                  rank: trainerRank,
                  phone: trainerPhone,
                  school: trainerSchool,
                  telegram: trainerTelegram,
                  disciplines: trainerDisciplines,
                }}
                onSubmitted={async () => {
                  setShowTrainerForm(false);
                  await refreshTrainerProfile();
                  setMessage('Резюме обновлено ✓');
                }}
                onCancel={() => setShowTrainerForm(false)}
              />
            ) : (
              <div className="space-y-2 text-sm text-white/80">
                <p>Вы верифицированный тренер.</p>
                {trainerSecretCode && (
                  <p>
                    Код для учеников: <span className="text-accent font-mono text-lg">{trainerSecretCode}</span>
                  </p>
                )}
                <p>Звание: {trainerRank || '—'}</p>
                <p>Школа/клуб: {trainerSchool || '—'}</p>
                <p>Телефон: {trainerPhone || '—'}</p>
                <p>Telegram: {trainerTelegram || '—'}</p>
                <p>
                  Дисциплины:{' '}
                  {trainerDisciplines.length ? trainerDisciplines.map(disciplineLabel).join(', ') : '—'}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowTrainerForm(true)}
                    className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm hover:text-white"
                  >
                    Изменить резюме
                  </button>
                  <button
                    onClick={handleDeleteListing}
                    disabled={deletingListing}
                    className="px-4 py-2 rounded-full bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {deletingListing ? 'Удаляем…' : 'Удалить объявление'}
                  </button>
                </div>
              </div>
            )
          ) : showTrainerForm ? (
            <TrainerVerificationForm
              userId={userId!}
              requestType="initial"
              prefill={{ fullName, email: userEmail }}
              onSubmitted={() => {
                setShowTrainerForm(false);
                setPendingTrainerRequest({
                  id: 'local',
                  request_type: 'initial',
                  status: 'pending',
                  created_at: new Date().toISOString(),
                });
              }}
              onCancel={() => setShowTrainerForm(false)}
            />
          ) : (
            <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
              <input type="checkbox" onChange={(e) => e.target.checked && setShowTrainerForm(true)} />
              Я тренер
            </label>
          )}
        </div>
      </div>
    </main>
  );
}
