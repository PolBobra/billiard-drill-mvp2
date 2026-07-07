'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Nav from '@/components/Nav';

type AdminUser = {
  id: string;
  name: string | null;
  full_name: string | null;
  club: string | null;
  coach: string | null;
  cue: string | null;
  created_at: string;
  is_admin: boolean;
  flagged_suspicious: boolean;
  email: string;
  verified: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

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
      const userId = sessionData.session.user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (!profile?.is_admin) {
        router.replace('/dashboard');
        return;
      }

      const res = await fetch('/api/admin/users', { headers: await authHeader() });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Не удалось загрузить пользователей');
      } else {
        setUsers(json.users);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function toggleFlag(u: AdminUser) {
    setBusyId(u.id);
    const res = await fetch('/api/admin/flag-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ userId: u.id, flagged: !u.flagged_suspicious }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, flagged_suspicious: !x.flagged_suspicious } : x)));
    }
    setBusyId(null);
  }

  async function deleteUser(u: AdminUser) {
    if (!confirm('Точно удалить?')) return;
    setBusyId(u.id);
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ userId: u.id }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error || 'Не удалось удалить пользователя');
    }
    setBusyId(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center">
        Загрузка…
      </main>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          (u.full_name || u.name || '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    : users;

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">🛡 Модерация пользователей</h1>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <input
          type="text"
          placeholder="Поиск по имени или email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md mb-6 p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
        />

        <div className="overflow-x-auto bg-black/30 rounded-2xl">
          <table className="w-full text-sm text-left text-white/80">
            <thead className="text-white/50 border-b border-white/10">
              <tr>
                <th className="p-3">Имя</th>
                <th className="p-3">Email</th>
                <th className="p-3">Клуб</th>
                <th className="p-3">Тренер</th>
                <th className="p-3">Кий</th>
                <th className="p-3">Регистрация</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Подозрительный</th>
                <th className="p-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="p-3">{u.full_name || u.name || '—'}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.club || '—'}</td>
                  <td className="p-3">{u.coach || '—'}</td>
                  <td className="p-3">{u.cue || '—'}</td>
                  <td className="p-3">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                  <td className="p-3">{u.verified ? 'да' : 'нет'}</td>
                  <td className={u.flagged_suspicious ? 'p-3 text-yellow-400' : 'p-3'}>
                    {u.flagged_suspicious ? 'да' : 'нет'}
                  </td>
                  <td className="p-3 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => toggleFlag(u)}
                      disabled={busyId === u.id}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:text-white disabled:opacity-50"
                    >
                      {u.flagged_suspicious ? 'Снять пометку' : 'Отметить как подозрительный'}
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      disabled={busyId === u.id}
                      className="text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Удалить аккаунт
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-white/40">
                    Ничего не найдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
