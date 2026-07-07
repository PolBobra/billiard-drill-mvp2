import { getSupabaseAdmin } from './supabaseAdmin';

// Проверяет по Bearer-токену из запроса, что вызывающий — залогиненный
// пользователь с profiles.is_admin = true. Используется во всех /api/admin/* маршрутах.
export async function requireAdmin(
  req: Request
): Promise<{ ok: true; userId: string } | { ok: false; status: number }> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401 };

  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return { ok: false, status: 401 };

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.is_admin) return { ok: false, status: 403 };

  return { ok: true, userId: userData.user.id };
}
