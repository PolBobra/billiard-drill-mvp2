import { supabase } from './supabaseClient';

// Группы ошибок, которые влияют на соответствующий навык.
const ACCURACY_ERRORS = ['недокрут', 'перекрут'];
const POWER_ERRORS = ['слабый_удар', 'сильный_удар'];
const SPIN_ERRORS = ['винт'];
const POSITION_ERRORS = ['плохой_выход', 'ошибка_позиции'];

function scoreFromRatio(errorCount: number, total: number) {
  if (total === 0) return 50;
  return Math.max(10, Math.round(100 - (errorCount / total) * 100));
}

// Пересчитывает навыки игрока на основе ВСЕЙ истории его ударов.
// Логика простая: чем чаще встречается ошибка определённого типа среди всех
// зафиксированных ударов — тем ниже соответствующий навык.
export async function recomputeSkills(userId: string) {
  const { data: logs } = await supabase
    .from('shot_logs')
    .select('error_type')
    .eq('user_id', userId);

  if (!logs || logs.length === 0) return;

  const total = logs.length;
  const count = (types: string[]) => logs.filter((l) => types.includes(l.error_type)).length;

  const accuracy = scoreFromRatio(count(ACCURACY_ERRORS), total);
  const power_control = scoreFromRatio(count(POWER_ERRORS), total);
  const cue_ball_control = scoreFromRatio(count(SPIN_ERRORS), total);
  const positioning = scoreFromRatio(count(POSITION_ERRORS), total);
  const stability = Math.round((accuracy + power_control + cue_ball_control + positioning) / 4);

  await supabase
    .from('profiles')
    .update({ accuracy, power_control, cue_ball_control, positioning, stability })
    .eq('id', userId);
}
