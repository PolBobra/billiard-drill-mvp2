'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { errorLabel } from '@/lib/errorTypes';
import Nav from '@/components/Nav';

type Profile = {
  name: string;
  level: string;
  accuracy: number;
  power_control: number;
  cue_ball_control: number;
  positioning: number;
  stability: number;
};

type ShotLog = {
  id: string;
  error_type: string;
  created_at: string;
  completed: boolean;
};

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentLogs, setRecentLogs] = useState<ShotLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      const userId = sessionData.session.user.id;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(profileData);

      const { data: logsData } = await supabase
        .from('shot_logs')
        .select('id, error_type, created_at, completed')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentLogs(logsData || []);

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

  const skills = [
    { label: 'Точность', value: profile?.accuracy ?? 50 },
    { label: 'Сила удара', value: profile?.power_control ?? 50 },
    { label: 'Контроль битка', value: profile?.cue_ball_control ?? 50 },
    { label: 'Позиционирование', value: profile?.positioning ?? 50 },
    { label: 'Стабильность', value: profile?.stability ?? 50 },
  ];

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Привет, {profile?.name || 'игрок'} 👋
          </h1>
          <p className="text-white/60">Уровень: {profile?.level || 'beginner'}</p>
        </div>

        <button
          onClick={() => router.push('/find')}
          className="bg-accent text-black font-semibold px-6 py-4 rounded-xl text-lg hover:opacity-90"
        >
          ⚡ Зафиксировать удар
        </button>

        <div>
          <h2 className="text-xl font-semibold text-white mb-3">Навыки</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {skills.map((s) => (
              <div key={s.label} className="bg-black/30 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-accent">{s.value}</div>
                <div className="text-white/60 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-white">Последние ошибки</h2>
            <button onClick={() => router.push('/errors')} className="text-accent text-sm hover:underline">
              Смотреть все →
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-white/50">Пока нет зафиксированных ударов.</p>
          ) : (
            <ul className="space-y-2">
              {recentLogs.map((log) => (
                <li key={log.id} className="bg-black/30 p-3 rounded-lg flex justify-between text-white/80">
                  <span>{errorLabel(log.error_type)}</span>
                  <span className={log.completed ? 'text-green-400' : 'text-yellow-400'}>
                    {log.completed ? 'выполнено' : 'в работе'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
