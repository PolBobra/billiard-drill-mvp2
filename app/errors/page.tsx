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
  tournament_id: string | null;
  exercises: { name: string } | null;
};

type Tournament = { id: string; name: string; created_at: string; ended_at: string | null };

const DISTANCE_LABELS: Record<string, string> = {
  close: 'Близко',
  medium: 'Средне',
  far: 'Далеко',
};

function LogRow({ log, open, onToggle }: { log: ShotLog; open: boolean; onToggle: () => void }) {
  return (
    <div className="bg-black/30 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5">
        <div>
          <div className="text-white font-medium">{errorLabel(log.error_type)}</div>
          <div className="text-white/50 text-sm">
            Угол {log.angle}° · {DISTANCE_LABELS[log.distance] || log.distance} ·{' '}
            {new Date(log.created_at).toLocaleString('ru-RU')}
          </div>
          {log.exercises?.name && <div className="text-accent text-sm mt-1">Упражнение: {log.exercises.name}</div>}
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
          {log.diagram ? <ShotDiagramView d={log.diagram} /> : <p className="text-white/40 text-sm">Для этой ошибки рисунок не сохранён.</p>}
        </div>
      )}
    </div>
  );
}

export default function MyErrors() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ShotLog[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTournamentId, setOpenTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [startingTournament, setStartingTournament] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [tournamentBusy, setTournamentBusy] = useState(false);

  async function load(uid: string) {
    const [{ data: logsData }, { data: tournamentsData }] = await Promise.all([
      supabase
        .from('shot_logs')
        .select('id, error_type, angle, distance, completed, created_at, diagram, tournament_id, exercises(name)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase.from('tournaments').select('id, name, created_at, ended_at').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);
    setLogs((logsData as any) || []);
    setTournaments(tournamentsData || []);
  }

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);
      await load(uid);
      setLoading(false);
    }
    init();
  }, [router]);

  async function startTournament() {
    if (!userId || !newTournamentName.trim()) return;
    setTournamentBusy(true);
    const { error } = await supabase.from('tournaments').insert({ user_id: userId, name: newTournamentName.trim() });
    setTournamentBusy(false);
    if (error) {
      alert('Не удалось начать турнир: ' + error.message);
      return;
    }
    setStartingTournament(false);
    setNewTournamentName('');
    await load(userId);
  }

  async function saveTournament(id: string) {
    if (!userId) return;
    setTournamentBusy(true);
    const { error } = await supabase.from('tournaments').update({ ended_at: new Date().toISOString() }).eq('id', id);
    setTournamentBusy(false);
    if (error) {
      alert('Не удалось сохранить турнир: ' + error.message);
      return;
    }
    await load(userId);
  }

  const ungroupedLogs = logs.filter((l) => !l.tournament_id);
  const filtered = filter ? ungroupedLogs.filter((l) => l.error_type === filter) : ungroupedLogs;
  const errorTypesPresent = Array.from(new Set(ungroupedLogs.map((l) => l.error_type)));
  const activeTournament = tournaments.find((t) => !t.ended_at) || null;
  const pastTournaments = tournaments.filter((t) => t.ended_at);

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">📋 Мои ошибки</h1>

        {/* Турнир: начать/сохранить */}
        <div className="bg-black/30 p-4 rounded-2xl mb-6">
          {activeTournament ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-white/80 text-sm">
                🏆 Идёт турнир «<b className="text-accent">{activeTournament.name}</b>» — начат{' '}
                {new Date(activeTournament.created_at).toLocaleDateString('ru-RU')}
              </p>
              <button
                onClick={() => saveTournament(activeTournament.id)}
                disabled={tournamentBusy}
                className="px-4 py-2 rounded-full bg-accent text-black text-sm font-semibold disabled:opacity-50"
              >
                Сохранить турнир
              </button>
            </div>
          ) : null}
          {activeTournament && (
            <div className="mt-4 space-y-2">
              {logs
                .filter((l) => l.tournament_id === activeTournament.id)
                .map((log) => (
                  <LogRow key={log.id} log={log} open={openId === log.id} onToggle={() => setOpenId(openId === log.id ? null : log.id)} />
                ))}
              {logs.filter((l) => l.tournament_id === activeTournament.id).length === 0 && (
                <p className="text-white/40 text-sm">В этом турнире пока нет записей.</p>
              )}
            </div>
          )}
          {!activeTournament &&
            (startingTournament ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="Например: Турнир в клубе X, 12.07.2026"
                  className="flex-1 min-w-[220px] p-2.5 rounded-lg bg-white/10 text-white placeholder-white/50 text-sm"
                />
                <button
                  onClick={startTournament}
                  disabled={tournamentBusy || !newTournamentName.trim()}
                  className="px-4 py-2 rounded-full bg-accent text-black text-sm font-semibold disabled:opacity-50"
                >
                  Начать
                </button>
                <button onClick={() => setStartingTournament(false)} className="px-4 py-2 rounded-full bg-white/10 text-white/70 text-sm">
                  Отмена
                </button>
              </div>
            ) : (
              <button onClick={() => setStartingTournament(true)} className="text-accent text-sm hover:underline">
                + Начать турнир
              </button>
            ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-full text-sm ${!filter ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
          >
            Все ({ungroupedLogs.length})
          </button>
          {errorTypesPresent.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm ${filter === t ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
            >
              {errorLabel(t)} ({ungroupedLogs.filter((l) => l.error_type === t).length})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/60">Загрузка…</p>
        ) : (
          <>
            {filtered.length === 0 ? (
              <p className="text-white/60 mb-6">Пока нет зафиксированных ударов вне турниров.</p>
            ) : (
              <div className="space-y-2 mb-8">
                {filtered.map((log) => (
                  <LogRow key={log.id} log={log} open={openId === log.id} onToggle={() => setOpenId(openId === log.id ? null : log.id)} />
                ))}
              </div>
            )}

            {pastTournaments.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-3">Турниры</h2>
                <div className="space-y-2">
                  {pastTournaments.map((t) => {
                    const tLogs = logs.filter((l) => l.tournament_id === t.id);
                    const tOpen = openTournamentId === t.id;
                    return (
                      <div key={t.id} className="bg-black/20 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenTournamentId(tOpen ? null : t.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5"
                        >
                          <div>
                            <div className="text-white font-medium">📁 {t.name}</div>
                            <div className="text-white/50 text-sm">
                              {new Date(t.created_at).toLocaleDateString('ru-RU')} · {tLogs.length} записей
                            </div>
                          </div>
                          <span className="text-white/40 text-sm">{tOpen ? '▲' : '▼'}</span>
                        </button>
                        {tOpen && (
                          <div className="px-4 pb-4 space-y-2">
                            {tLogs.length === 0 ? (
                              <p className="text-white/40 text-sm">В этом турнире нет записей.</p>
                            ) : (
                              tLogs.map((log) => (
                                <LogRow key={log.id} log={log} open={openId === log.id} onToggle={() => setOpenId(openId === log.id ? null : log.id)} />
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
