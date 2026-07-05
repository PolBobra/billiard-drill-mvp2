'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { findMatchingExercise } from '@/lib/matching';
import Nav from '@/components/Nav';
import BilliardTable, { ShotDiagram } from '@/components/BilliardTable';

const ERROR_TYPES = [
  { value: 'промах', label: 'Промах' },
  { value: 'недокрут', label: 'Недокрут' },
  { value: 'перекрут', label: 'Перекрут' },
  { value: 'слабый_удар', label: 'Слабый удар' },
  { value: 'сильный_удар', label: 'Сильный удар' },
  { value: 'плохой_выход', label: 'Плохой выход' },
  { value: 'ошибка_позиции', label: 'Ошибка позиции' },
];

const DISTANCE_LABELS: Record<string, string> = {
  close: 'Близко',
  medium: 'Средне',
  far: 'Далеко',
};

export default function FindExercise() {
  const [diagram, setDiagram] = useState<ShotDiagram | null>(null);
  const [errorType, setErrorType] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!diagram || !errorType) return;
    setLoading(true);
    setResult(null);

    const { exercise, matchQuality } = await findMatchingExercise({
      errorType,
      angle: diagram.angle,
      distance: diagram.distance,
    });

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (userId) {
      await supabase.from('shot_logs').insert({
        user_id: userId,
        error_type: errorType,
        angle: diagram.angle,
        distance: diagram.distance,
        matched_exercise_id: exercise?.id ?? null,
      });
    }

    setResult({ exercise, matchQuality });
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-felt2">
      <Nav />
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-2">⚡ Зафиксировать удар</h1>
        <p className="text-white/60 text-sm mb-6">
          Отметь на столе биток, прицельный шар и точку, куда целился — система сама посчитает угол и дистанцию.
        </p>

        <div className="bg-black/30 p-4 rounded-2xl">
          <BilliardTable onComplete={setDiagram} />
        </div>

        {diagram && (
          <div className="bg-black/30 p-6 rounded-2xl mt-4 space-y-5">
            <div className="grid grid-cols-2 gap-4 text-white/80">
              <div>
                Угол среза: <b className="text-accent">{diagram.angle}°</b>
              </div>
              <div>
                Дистанция: <b className="text-accent">{DISTANCE_LABELS[diagram.distance]}</b>
              </div>
            </div>

            <div>
              <label className="text-white/70 text-sm block mb-2">Что пошло не так?</label>
              <select
                value={errorType}
                onChange={(e) => setErrorType(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/10 text-white"
              >
                <option value="">Выбери тип ошибки…</option>
                {ERROR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !errorType}
              className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Ищем упражнение…' : 'Подобрать упражнение'}
            </button>
          </div>
        )}

        {result && (
          <div className="mt-4 bg-black/40 p-6 rounded-2xl">
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
