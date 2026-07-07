'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { findMatchingExercise } from '@/lib/matching';
import { recomputeSkills } from '@/lib/skills';
import { ERROR_TYPES, errorLabel } from '@/lib/errorTypes';
import Nav from '@/components/Nav';
import BilliardTable, { ShotDiagram } from '@/components/BilliardTable';

const DISTANCE_LABELS: Record<string, string> = {
  close: 'Близко',
  medium: 'Средне',
  far: 'Далеко',
};

export default function FindExercise() {
  const router = useRouter();
  const [diagram, setDiagram] = useState<ShotDiagram | null>(null);
  const [errorType, setErrorType] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    // подставляем подсказку по отклонению только если игрок ещё сам не выбрал
    if (diagram?.suggestedError && !errorType) {
      setErrorType(diagram.suggestedError);
    }
  }, [diagram, errorType]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center">
        Загрузка…
      </main>
    );
  }

  async function handleSubmit() {
    if (!diagram || !errorType) return;
    setLoading(true);
    setResult(null);

    const { exercise, matchQuality } = await findMatchingExercise({
      errorType,
      angle: diagram.intendedAngle,
      distance: diagram.distance,
    });

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (userId) {
      await supabase.from('shot_logs').insert({
        user_id: userId,
        error_type: errorType,
        angle: diagram.intendedAngle,
        distance: diagram.distance,
        matched_exercise_id: exercise?.id ?? null,
        diagram: diagram,
      });
      await recomputeSkills(userId);
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
          Отметь биток, прицельный шар, точку удара по битку, куда целился и куда шар покатился на самом деле.
        </p>

        <div className="bg-black/30 p-4 rounded-2xl">
          <BilliardTable onComplete={setDiagram} />
        </div>

        {diagram && (
          <div className="bg-black/30 p-6 rounded-2xl mt-4 space-y-5">
            <div className="grid grid-cols-2 gap-4 text-white/80 text-sm">
              <div>Планировал срезать: <b className="text-accent">{diagram.intendedAngle}°</b></div>
              <div>По факту получилось: <b className="text-accent">{diagram.actualAngle}°</b></div>
              <div>Отклонение: <b className="text-accent">{diagram.deviation > 0 ? '+' : ''}{diagram.deviation}°</b></div>
              <div>Дистанция: <b className="text-accent">{DISTANCE_LABELS[diagram.distance]}</b></div>
            </div>

            {diagram.suggestedError && (
              <p className="text-yellow-400 text-xs">
                По отклонению похоже на «{errorLabel(diagram.suggestedError)}» — можно поменять ниже, если это не так.
              </p>
            )}

            <div>
              <label className="text-white/70 text-sm block mb-2">Что пошло не так?</label>
              <div className="flex gap-2 flex-wrap">
                {ERROR_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setErrorType(t.value)}
                    className={`px-4 py-2 rounded-full text-sm ${errorType === t.value ? 'bg-accent text-black' : 'bg-white/10 text-white/70 hover:text-white'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !errorType}
              className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Добавляем…' : 'Добавить ошибку'}
            </button>
          </div>
        )}

        {result && (
          <div className="mt-4 bg-black/40 p-6 rounded-2xl">
            <p className="text-green-400 text-sm mb-4">✓ Ошибка добавлена — смотри её в разделе «Мои ошибки».</p>
            {result.exercise ? (
              <>
                <p className="text-white/50 text-xs mb-1">Рекомендуемое упражнение:</p>
                <h2 className="text-xl font-bold text-accent mb-2">{result.exercise.name}</h2>
                <p className="text-white/80 mb-3">{result.exercise.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
                  <div>Повторений: <b className="text-white">{result.exercise.reps}</b></div>
                  <div>Сложность: <b className="text-white">{result.exercise.difficulty}</b></div>
                </div>
                <p className="text-white/60 text-sm mt-3">Критерий успеха: {result.exercise.success_criteria}</p>
                {result.matchQuality !== 'exact' && (
                  <p className="text-yellow-400 text-xs mt-3">⚠ Точного совпадения не нашлось — показано ближайшее подходящее упражнение.</p>
                )}
              </>
            ) : (
              <p className="text-white/60">Подходящее упражнение пока не найдено в базе.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
