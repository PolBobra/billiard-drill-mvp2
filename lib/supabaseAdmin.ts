import { createClient } from '@supabase/supabase-js';

// Серверный клиент с service-role ключом — обходит RLS, использовать
// ТОЛЬКО в серверных маршрутах (app/api/**), никогда на клиенте.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
