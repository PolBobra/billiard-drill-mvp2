import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { userId, flagged } = await req.json();
  if (!userId || typeof flagged !== 'boolean') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('profiles').update({ flagged_suspicious: flagged }).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
