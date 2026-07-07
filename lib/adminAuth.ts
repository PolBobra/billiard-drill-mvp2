import { getSupabaseAdmin } from './supabaseAdmin';

type AdminCheckOk = { ok: true; userId: string };
type AdminCheckFail = { ok: false; status: number };
export type AdminCheck = AdminCheckOk | AdminCheckFail;

// Явный type guard — чтобы TypeScript гарантированно сужал AdminCheck
// до AdminCheckFail в маршрутах (иначе доступ к .status на объединении падал
// с ошибкой сборки на Vercel).
export function isAdminFail(auth: AdminCheck): auth is AdminCheckFail {
  return auth.ok === false;
}

// Проверяет по Bearer-токену из запроса, что вызывающий — залогиненный
// пользователь с profiles.is_admin = true. Используется во всех /api/admin/* маршрутах.
export async function requireAdmin(req: Request): Promise<AdminCheck> {
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
