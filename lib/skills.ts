import { supabase } from './supabaseClient';

// Группы ошибок, которые влияют на соответствующий навык.
const ACCURACY_ERRORS = ['недокрут', 'перекрут'];
const POWER_ERRORS = ['слабый_удар', 'сильный_удар'];
const SPIN_ERRORS = ['винт'];
const POSITION_ERRORS = ['плохой_выход', 'ошибка_позиции'];

// Сколько ударов нужно, чтобы навык начал заметно расти (чем больше — тем медленнее).
const VOLUME_K = 120;

// Навык стартует с 50 и очень медленно растёт к 100.
// Растёт только за счёт «чистой» игры: доля ударов БЕЗ ошибки этого типа,
// дополнительно приглушённая объёмом истории. Чтобы дойти до 100, нужна
// почти безошибочная игра на огромной дистанции — таких игроков < 1%.
function skillScore(errorCount: number, total: number) {
  if (total === 0) return 50;
  const clean = Math.max(0, 1 - errorCount / total); // 0..1
  const volume = total / (total + VOLUME_K); // медленно приближается к 1
  const raw = 50 + 50 * Math.pow(clean, 3) * volume;
  return Math.round(Math.min(100, Math.max(50, raw)));
}

// Пересчитывает навыки игрока на основе ВСЕЙ истории его ударов.
export async function recomputeSkills(userId: string) {
  const { data: logs } = await supabase
    .from('shot_logs')
    .select('error_type')
    .eq('user_id', userId);

  if (!logs || logs.length === 0) return;

  const total = logs.length;
  const count = (types: string[]) => logs.filter((l) => types.includes(l.error_type)).length;

  const accuracy = skillScore(count(ACCURACY_ERRORS), total);
  const power_control = skillScore(count(POWER_ERRORS), total);
  const cue_ball_control = skillScore(count(SPIN_ERRORS), total);
  const positioning = skillScore(count(POSITION_ERRORS), total);
  const stability = Math.round((accuracy + power_control + cue_ball_control + positioning) / 4);

  await supabase
    .from('profiles')
    .update({ accuracy, power_control, cue_ball_control, positioning, stability })
    .eq('id', userId);
}
