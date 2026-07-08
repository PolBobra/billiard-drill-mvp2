import { SupabaseClient } from '@supabase/supabase-js';

// Общая проверка для /api/trainer/notes и /api/trainer/students/[id]/shot-logs.
// Базовое условие доступа (verified + привязка) не зависит от подписки —
// подписку with_trainer оплачивает ученик (не путать с trainer_marketplace,
// которую оплачивает тренер за листинг). Если подписка неактивна, доступ не
// закрывается целиком: тренер продолжает видеть накопленные до момента
// отключения shot_logs/заметки ("заморозка"), но не новые записи и не может
// писать новые заметки — см. `cutoff`.
export async function getTrainerStudentAccess(
  admin: SupabaseClient,
  trainerId: string,
  studentId: string
): Promise<{ allowed: boolean; canWrite: boolean; cutoff: string | null; reason?: string }> {
  const deny = { allowed: false, canWrite: false, cutoff: null as string | null };

  const { data: trainer } = await admin
    .from('profiles')
    .select('is_verified_trainer')
    .eq('id', trainerId)
    .single();
  if (!trainer?.is_verified_trainer) return { ...deny, reason: 'Не верифицированный тренер' };

  const { data: student } = await admin
    .from('profiles')
    .select('linked_trainer_id')
    .eq('id', studentId)
    .single();
  if (student?.linked_trainer_id !== trainerId) return { ...deny, reason: 'Ученик не привязан к этому тренеру' };

  const { data: sub } = await admin
    .from('subscriptions')
    .select('status, expires_at, updated_at')
    .eq('user_id', studentId)
    .eq('tier', 'with_trainer')
    .maybeSingle();

  if (!sub) {
    // подписки никогда не было — данные "заморожены" в самом начале, т.е. пусто
    return { allowed: true, canWrite: false, cutoff: new Date(0).toISOString() };
  }

  const notExpired = !sub.expires_at || new Date(sub.expires_at) > new Date();
  if (sub.status === 'active' && notExpired) {
    return { allowed: true, canWrite: true, cutoff: null };
  }

  // подписка была, но сейчас неактивна — граница "заморозки" это либо явная
  // дата окончания (если она уже в прошлом), либо момент, когда админ
  // последний раз поменял статус/дату
  const cutoff =
    sub.expires_at && new Date(sub.expires_at) <= new Date() ? sub.expires_at : sub.updated_at;
  return { allowed: true, canWrite: false, cutoff };
}
