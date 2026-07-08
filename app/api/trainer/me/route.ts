import { NextResponse } from 'next/server';
import { requireUser, isUserFail } from '@/lib/userAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// trainer_secret_code закрыт от прямого select даже для владельца строки
// (см. revoke в supabase/schema.sql) — этот роут единственный способ
// тренеру узнать собственный код.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('profiles')
    .select('trainer_secret_code, is_verified_trainer')
    .eq('id', auth.userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.is_verified_trainer) return NextResponse.json({ error: 'Not a trainer' }, { status: 404 });

  return NextResponse.json({ code: data.trainer_secret_code });
}
