'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Nav from '@/components/Nav';

type Exercise = {
  id: string;
  name: string;
  error_type: string;
  distance: string;
  angle_min: number;
  angle_max: number;
  description: string;
  reps: number;
  difficulty: number;
};

export default function ExercisesList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('exercises').select('*').order('name');
      setExercises(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter
    ? exercises.filter((e) => e.error_type === filter)
    : exercises;

  const errorTypes = Array.from(new Set(exercises.map((e) => e.error_type)));

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">📚 База упражнений</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-full text-sm ${!filter ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
          >
            Все ({exercises.length})
          </button>
          {errorTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm ${filter === t ? 'bg-accent text-black' : 'bg-white/10 text-white/70'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/60">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className="text-white/60">Упражнений пока нет — добавь их в Supabase.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((ex) => (
              <div key={ex.id} className="bg-black/30 p-5 rounded-xl">
                <h3 className="font-bold text-accent mb-1">{ex.name}</h3>
                <p className="text-white/70 text-sm mb-3">{ex.description}</p>
                <div className="flex gap-3 text-xs text-white/50">
                  <span>{ex.error_type}</span>
                  <span>·</span>
                  <span>{ex.angle_min}–{ex.angle_max}°</span>
                  <span>·</span>
                  <span>{ex.distance}</span>
                  <span>·</span>
                  <span>{ex.reps} повторений</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
