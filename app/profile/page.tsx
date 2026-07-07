'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Nav from '@/components/Nav';

type Club = { id: string; name: string; city: string | null };

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [coach, setCoach] = useState('');
  const [cue, setCue] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // Клуб — автокомплит по таблице clubs, сохраняем club_id
  const [clubId, setClubId] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [clubQuery, setClubQuery] = useState('');
  const [clubResults, setClubResults] = useState<Club[]>([]);
  const [searchingClubs, setSearchingClubs] = useState(false);
  const [showClubRequestForm, setShowClubRequestForm] = useState(false);
  const [requestCity, setRequestCity] = useState('');
  const [clubRequestSent, setClubRequestSent] = useState(false);

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
        .select('full_name, club_id, coach, cue, avatar_url')
        .eq('id', uid)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setCoach(data.coach || '');
        setCue(data.cue || '');
        setAvatarUrl(data.avatar_url || '');
        setClubId(data.club_id || null);

        if (data.club_id) {
          const { data: clubData } = await supabase
            .from('clubs')
            .select('id, name, city')
            .eq('id', data.club_id)
            .single();
          if (clubData) setSelectedClub(clubData);
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // Поиск клуба с задержкой 300 мс, чтобы не слать запрос на каждую букву
  useEffect(() => {
    if (clubQuery.trim().length < 2) {
      setClubResults([]);
      setSearchingClubs(false);
      return;
    }
    setSearchingClubs(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('clubs')
        .select('id, name, city')
        .ilike('name', `%${clubQuery.trim()}%`)
        .limit(10);
      setClubResults(data || []);
      setSearchingClubs(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [clubQuery]);

  function selectClub(c: Club) {
    setSelectedClub(c);
    setClubId(c.id);
    setClubQuery('');
    setClubResults([]);
    setShowClubRequestForm(false);
    setClubRequestSent(false);
  }

  function clearClub() {
    setSelectedClub(null);
    setClubId(null);
  }

  async function submitClubRequest() {
    if (!userId || !clubQuery.trim()) return;
    const { error } = await supabase
      .from('addition_requests')
      .insert({ user_id: userId, name: clubQuery.trim(), city: requestCity.trim() || null });
    if (!error) {
      setClubRequestSent(true);
      setShowClubRequestForm(false);
      setRequestCity('');
    }
  }

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
      .update({ full_name: fullName, club_id: clubId, coach, cue, avatar_url: avatarUrl })
      .eq('id', userId);
    setSaving(false);
    setMessage(error ? 'Ошибка сохранения: ' + error.message : 'Сохранено ✓');
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
            {selectedClub ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/10 text-white">
                <span>
                  {selectedClub.name}
                  {selectedClub.city ? `, ${selectedClub.city}` : ''}
                </span>
                <button
                  type="button"
                  onClick={clearClub}
                  className="text-white/50 hover:text-white text-sm shrink-0 ml-3"
                >
                  Изменить
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={clubQuery}
                  onChange={(e) => {
                    setClubQuery(e.target.value);
                    setClubRequestSent(false);
                    setShowClubRequestForm(false);
                  }}
                  className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
                  placeholder="Начни вводить название клуба…"
                />
                {clubQuery.trim().length >= 2 && (
                  <div className="mt-2 bg-black/60 rounded-lg overflow-hidden text-sm">
                    {searchingClubs ? (
                      <p className="p-3 text-white/50">Ищем…</p>
                    ) : clubResults.length > 0 ? (
                      clubResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectClub(c)}
                          className="w-full text-left p-3 hover:bg-white/10 text-white/90 border-b border-white/5 last:border-0"
                        >
                          {c.name}
                          {c.city ? `, ${c.city}` : ''}
                        </button>
                      ))
                    ) : clubRequestSent ? (
                      <p className="p-3 text-green-400">
                        Заявка отправлена — будет рассмотрена администратором.
                      </p>
                    ) : showClubRequestForm ? (
                      <div className="p-3 space-y-2">
                        <p className="text-white/60">Клуб «{clubQuery.trim()}»</p>
                        <input
                          type="text"
                          placeholder="Город"
                          value={requestCity}
                          onChange={(e) => setRequestCity(e.target.value)}
                          className="w-full p-2 rounded bg-white/10 text-white placeholder-white/50"
                        />
                        <button
                          type="button"
                          onClick={submitClubRequest}
                          className="px-3 py-1.5 rounded-full bg-accent text-black font-semibold"
                        >
                          Отправить заявку
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowClubRequestForm(true)}
                        className="w-full text-left p-3 text-white/60 hover:text-white"
                      >
                        Не нашёл клуб? Отправить заявку
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-white/70 text-sm block mb-1">Тренер</label>
            <input
              type="text"
              value={coach}
              onChange={(e) => setCoach(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
              placeholder="Имя тренера"
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
      </div>
    </main>
  );
}
