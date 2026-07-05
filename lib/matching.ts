import { supabase } from './supabaseClient';

export type ShotCriteria = {
  errorType: string;
  angle: number;
  distance: 'close' | 'medium' | 'far';
};

// Находит упражнение, максимально подходящее под зафиксированную ситуацию.
// Логика: сначала точное совпадение по типу ошибки + дистанции + попаданию в диапазон угла.
// Если ничего не найдено — постепенно ослабляем критерии (fallback).
export async function findMatchingExercise(criteria: ShotCriteria) {
  const { errorType, angle, distance } = criteria;

  // 1. Точное совпадение: тип ошибки + дистанция + угол внутри диапазона
  let { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('error_type', errorType)
    .eq('distance', distance)
    .lte('angle_min', angle)
    .gte('angle_max', angle)
    .order('difficulty', { ascending: true })
    .limit(1);

  if (data && data.length > 0) return { exercise: data[0], matchQuality: 'exact' as const };

  // 2. Ослабляем: тип ошибки + дистанция (без строгого угла)
  ({ data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('error_type', errorType)
    .eq('distance', distance)
    .limit(1));

  if (data && data.length > 0) return { exercise: data[0], matchQuality: 'partial' as const };

  // 3. Ослабляем ещё: только тип ошибки
  ({ data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('error_type', errorType)
    .limit(1));

  if (data && data.length > 0) return { exercise: data[0], matchQuality: 'loose' as const };

  return { exercise: null, matchQuality: 'none' as const, error };
}
