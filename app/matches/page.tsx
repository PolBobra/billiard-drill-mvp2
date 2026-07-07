'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Nav from '@/components/Nav';

type Match = {
  id: string;
  player1_name: string;
  player2_name: string;
  score1: number;
  score2: number;
  duration_seconds: number;
  winner: 'player1' | 'player2' | 'draw';
  created_at: string;
};

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')} ч`;
  }
  return formatTimer(totalSeconds);
}

export default function MatchesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [player1Name, setPlayer1Name] = useState('Игрок 1');
  const [player2Name, setPlayer2Name] = useState('Игрок 2');
  const [editingName, setEditingName] = useState<1 | 2 | null>(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      setUserId(sessionData.session.user.id);
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (tab !== 'history' || historyLoaded || !userId) return;
    async function loadHistory() {
      const { data, error } = await supabase
        .from('matches')
        .select('id, player1_name, player2_name, score1, score2, duration_seconds, winner, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) setHistoryError(error.message);
      else setMatches(data || []);
      setHistoryLoaded(true);
    }
    loadHistory();
  }, [tab, historyLoaded, userId]);

  function resetForm() {
    setPlayer1Name('Игрок 1');
    setPlayer2Name('Игрок 2');
    setScore1(0);
    setScore2(0);
    setSeconds(0);
    setRunning(false);
    setEditingName(null);
  }

  async function finishMatch() {
    if (!userId) return;
    const winner: Match['winner'] = score1 > score2 ? 'player1' : score1 < score2 ? 'player2' : 'draw';
    setSaving(true);
    setRunning(false);
    const { error } = await supabase.from('matches').insert({
      user_id: userId,
      player1_name: player1Name.trim() || 'Игрок 1',
      player2_name: player2Name.trim() || 'Игрок 2',
      score1,
      score2,
      duration_seconds: seconds,
      winner,
    });
    setSaving(false);
    if (!error) {
      setHistoryLoaded(false); // перезагрузим историю при следующем открытии вкладки
      resetForm();
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center">
        Загрузка…
      </main>
    );
  }

  const winnerLabel: Record<Match['winner'], string> = {
    player1: 'Игрок 1',
    player2: 'Игрок 2',
    draw: 'Ничья',
  };

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">🎱 Матчи</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('new')}
            className={`px-4 py-2 rounded-full text-sm ${tab === 'new' ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
          >
            Новый матч
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-full text-sm ${tab === 'history' ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
          >
            История матчей
          </button>
        </div>

        {tab === 'new' && (
          <div>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-4xl font-mono text-white">{formatTimer(seconds)}</div>
              <button
                onClick={() => setRunning((r) => !r)}
                className="px-4 py-2 rounded-full bg-accent text-black font-semibold"
              >
                {running ? 'Пауза' : 'Старт'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {([1, 2] as const).map((n) => {
                const name = n === 1 ? player1Name : player2Name;
                const setName = n === 1 ? setPlayer1Name : setPlayer2Name;
                const score = n === 1 ? score1 : score2;
                const setScore = n === 1 ? setScore1 : setScore2;
                return (
                  <div
                    key={n}
                    onClick={() => setScore((s) => s + 1)}
                    className="relative bg-black/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer select-none hover:bg-black/40 min-h-[220px]"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScore((s) => Math.max(0, s - 1));
                      }}
                      className="absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/70 hover:text-white"
                    >
                      -1
                    </button>

                    {editingName === n ? (
                      <input
                        autoFocus
                        type="text"
                        value={name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => setEditingName(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingName(null)}
                        className="w-2/3 text-center p-2 rounded-lg bg-white/10 text-white"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingName(n);
                        }}
                        className="text-white/80 text-lg hover:text-white underline decoration-dotted"
                      >
                        {name}
                      </button>
                    )}

                    <div className="text-7xl font-bold text-accent">{score}</div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={finishMatch}
              disabled={saving}
              className="w-full mt-6 p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Сохраняем…' : 'Завершить матч'}
            </button>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {historyError && <p className="text-red-400 mb-4">{historyError}</p>}
            {historyLoaded && matches.length === 0 ? (
              <p className="text-white/50">Пока нет сыгранных матчей.</p>
            ) : (
              <div className="space-y-2">
                {matches.map((m) => (
                  <div key={m.id} className="bg-black/30 p-4 rounded-xl">
                    <div className="flex items-center justify-center gap-3 text-lg">
                      <span className={m.winner === 'player1' ? 'text-accent font-bold' : 'text-white/80'}>
                        {m.player1_name}
                      </span>
                      <span className="text-white font-mono">
                        {m.score1} : {m.score2}
                      </span>
                      <span className={m.winner === 'player2' ? 'text-accent font-bold' : 'text-white/80'}>
                        {m.player2_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-white/50 text-sm">
                      <span>
                        {m.winner === 'draw' ? 'Ничья' : `Победил: ${winnerLabel[m.winner]}`}
                      </span>
                      <span>
                        {new Date(m.created_at).toLocaleString('ru-RU')} · {formatDuration(m.duration_seconds)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
