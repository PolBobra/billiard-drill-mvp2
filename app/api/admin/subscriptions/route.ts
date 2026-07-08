import { NextResponse } from 'next/server';
import { requireAdmin, isAdminFail } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  const admin = getSupabaseAdmin();
  let query = admin
    .from('subscriptions')
    .select('id, user_id, tier, status, started_at, expires_at')
    .order('started_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data });
}

// Ручное управление подпиской до появления платёжного шлюза: админ ставит
// tier/status/expiresAt конкретному пользователю. Один активный tier на
// пользователя — если строка с таким tier уже есть, обновляем её, иначе
// создаём новую (у пользователя может быть и with_trainer, и
// trainer_marketplace одновременно — например, тренер, у которого есть свой тренер).
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { userId, tier, status, expiresAt } = await req.json();
  if (!userId || (tier !== 'with_trainer' && tier !== 'trainer_marketplace')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (status !== 'active' && status !== 'expired' && status !== 'cancelled') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('tier', tier)
    .maybeSingle();

  const result = existing
    ? await admin
        .from('subscriptions')
        .update({ status, expires_at: expiresAt || null, updated_at: now })
        .eq('id', existing.id)
    : await admin
        .from('subscriptions')
        .insert({ user_id: userId, tier, status, expires_at: expiresAt || null, updated_at: now });

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
