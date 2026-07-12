import { supabase } from './supabaseClient';

// Клиентский хелпер: дёргает /api/notify-telegram после того, как заявка
// уже успешно ушла в базу. Намеренно "fire and forget" — если уведомление
// не отправится, сама заявка уже сохранена, флоу пользователя не ломаем.
export async function notifyAdmin(message: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  fetch('/api/notify-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  }).catch(() => {});
}
