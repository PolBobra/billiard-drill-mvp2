import { NextResponse } from 'next/server';
import { requireAdmin, isAdminFail } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const admin = getSupabaseAdmin();
  // Удаляет аккаунт из auth.users; profiles и shot_logs удалятся каскадно (см. schema.sql)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
