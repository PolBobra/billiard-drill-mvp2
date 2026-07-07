'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Nav from '@/components/Nav';

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [club, setClub] = useState('');
  const [coach, setCoach] = useState('');
  const [cue, setCue] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

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
        .select('full_name, club, coach, cue, avatar_url')
        .eq('id', uid)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setClub(data.club || '');
        setCoach(data.coach || '');
        setCue(data.cue || '');
        setAvatarUrl(data.avatar_url || '');
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
      .update({ full_name: fullName, club, coach, cue, avatar_url: avatarUrl })
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
            <input
              type="text"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
              placeholder="Название клуба"
            />
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
