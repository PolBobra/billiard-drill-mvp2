'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { errorLabel } from '@/lib/errorTypes';
import { ShotDiagram } from '@/lib/shotGeometry';
import ShotDiagramView from '@/components/ShotDiagramView';
import Nav from '@/components/Nav';

type ShotLog = {
  id: string;
  error_type: string;
  angle: number;
  distance: string;
  completed: boolean;
  created_at: string;
  diagram: ShotDiagram | null;
  exercises: { name: string } | null;
};

const DISTANCE_LABELS: Record<string, string> = {
  close: 'Близко',
  medium: 'Средне',
  far: 'Далеко',
};

export default function MyErrors() {
  const router = useRouter();
  const [logs, setLogs] = useState<ShotLog[]>([]);
  const [filter, setFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      const userId = sessionData.session.user.id;

      const { data } = await supabase
        .from('shot_logs')
        .select('id, error_type, angle, distance, completed, created_at, diagram, exercises(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setLogs((data as any) || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = filter ? logs.filter((l) => l.error_type === filter) : logs;
  const errorTypesPresent = Array.from(new Set(logs.map((l) => l.error_type)));

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">📋 Мои ошибки</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-full text-sm ${!filter ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
          >
            Все ({logs.length})
          </button>
          {errorTypesPresent.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm ${filter === t ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
            >
              {errorLabel(t)} ({logs.filter((l) => l.error_type === t).length})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/60">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className="text-white/60">Пока нет зафиксированных ударов — начни с «Зафиксировать удар».</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const open = openId === log.id;
              return (
                <div key={log.id} className="bg-black/30 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenId(open ? null : log.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5"
                  >
                    <div>
                      <div className="text-white font-medium">{errorLabel(log.error_type)}</div>
                      <div className="text-white/50 text-sm">
                        Угол {log.angle}° · {DISTANCE_LABELS[log.distance] || log.distance} ·{' '}
                        {new Date(log.created_at).toLocaleString('ru-RU')}
                      </div>
                      {log.exercises?.name && (
                        <div className="text-accent text-sm mt-1">Упражнение: {log.exercises.name}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-3 py-1 rounded-full ${log.completed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {log.completed ? 'выполнено' : 'в работе'}
                      </span>
                      <span className="text-white/40 text-sm">{open ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {open && (
                    <div className="px-4 pb-4">
                      {log.diagram ? (
                        <ShotDiagramView d={log.diagram} />
                      ) : (
                        <p className="text-white/40 text-sm">Для этой ошибки рисунок не сохранён.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
