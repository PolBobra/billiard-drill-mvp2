'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { findMatchingExercise } from '@/lib/matching';
import Nav from '@/components/Nav';

const ERROR_TYPES = [
  { value: 'промах', label: 'Промах' },
  { value: 'недокрут', label: 'Недокрут' },
  { value: 'перекрут', label: 'Перекрут' },
  { value: 'слабый_удар', label: 'Слабый удар' },
  { value: 'сильный_удар', label: 'Сильный удар' },
  { value: 'плохой_выход', label: 'Плохой выход' },
  { value: 'ошибка_позиции', label: 'Ошибка позиции' },
];

const DISTANCES = [
  { value: 'close', label: 'Близко' },
  { value: 'medium', label: 'Средне' },
  { value: 'far', label: 'Далеко' },
];

export default function FindExercise() {
  const router = useRouter();
  const [errorType, setErrorType] = useState('');
  const [angle, setAngle] = useState(30);
  const [distance, setDistance] = useState<'close' | 'medium' | 'far'>('medium');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const { exercise, matchQuality } = await findMatchingExercise({ errorType, angle, distance });

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (userId) {
      await supabase.from('shot_logs').insert({
        user_id: userId,
        error_type: errorType,
        angle,
        distance,
        matched_exercise_id: exercise?.id ?? null,
      });
    }

    setResult({ exercise, matchQuality });
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">⚡ Зафиксировать удар</h1>

        <form onSubmit={handleSubmit} className="bg-black/30 p-6 rounded-2xl space-y-5">
          <div>
            <label className="text-white/70 text-sm block mb-2">Тип ошибки</label>
            <select
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-white/10 text-white"
            >
              <option value="">Выбери ошибку…</option>
              {ERROR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-white/70 text-sm block mb-2">
              Угол удара: {angle}°
            </label>
            <input
              type="range"
              min={0}
              max={90}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm block mb-2">Дистанция до шара</label>
            <div className="flex gap-2">
              {DISTANCES.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => setDistance(d.value as any)}
                  className={`flex-1 p-3 rounded-lg font-medium ${
                    distance === d.value ? 'bg-accent text-black' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={loading || !errorType}
            className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90"
          >
            {loading ? 'Ищем упражнение…' : 'Подобрать упражнение'}
          </button>
        </form>

        {result && (
          <div className="mt-6 bg-black/40 p-6 rounded-2xl">
            {result.exercise ? (
              <>
                <h2 className="text-xl font-bold text-accent mb-2">{result.exercise.name}</h2>
                <p className="text-white/80 mb-3">{result.exercise.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
                  <div>Повторений: <b className="text-white">{result.exercise.reps}</b></div>
                  <div>Сложность: <b className="text-white">{result.exercise.difficulty}</b></div>
                </div>
                <p className="text-white/60 text-sm mt-3">
                  Критерий успеха: {result.exercise.success_criteria}
                </p>
                {result.matchQuality !== 'exact' && (
                  <p className="text-yellow-400 text-xs mt-3">
                    ⚠ Точного совпадения не нашлось — показано ближайшее подходящее упражнение.
                  </p>
                )}
              </>
            ) : (
              <p className="text-white/60">
                Подходящее упражнение пока не найдено в базе. Добавь больше упражнений для этого типа ошибки.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
