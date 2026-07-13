import { getSupabaseAdmin } from './supabaseAdmin';

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 10;

// Простой рейт-лимит по IP для /api/auth/login и /api/auth/register —
// до успешного входа user_id ещё нет, поэтому ключ именно IP, а не юзер.
export async function checkAuthRateLimit(ip: string | null, route: string): Promise<boolean> {
  if (!ip) return true;

  const admin = getSupabaseAdmin();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await admin
    .from('auth_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('route', route)
    .gte('created_at', windowStart);

  if ((count || 0) >= MAX_ATTEMPTS) return false;

  await admin.from('auth_attempts').insert({ ip, route });
  return true;
}
