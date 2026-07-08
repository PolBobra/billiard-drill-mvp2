import { getSupabaseAdmin } from './supabaseAdmin';

type UserCheckOk = { ok: true; userId: string };
type UserCheckFail = { ok: false; status: number };
export type UserCheck = UserCheckOk | UserCheckFail;

export function isUserFail(auth: UserCheck): auth is UserCheckFail {
  return auth.ok === false;
}

// Проверяет по Bearer-токену, что вызывающий — залогиненный пользователь
// (без требования is_admin). Используется в /api/trainer/* маршрутах,
// которым нужен service-role клиент, но не админские права.
export async function requireUser(req: Request): Promise<UserCheck> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401 };

  const admin = getSupabaseAdmin();
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return { ok: false, status: 401 };

  return { ok: true, userId: userData.user.id };
}
