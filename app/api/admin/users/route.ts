import { NextResponse } from 'next/server';
import { requireAdmin, isAdminFail } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const admin = getSupabaseAdmin();

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, name, full_name, club, coach, cue, created_at, is_admin, flagged_suspicious')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const infoById = new Map(
    authData.users.map((u) => [u.id, { email: u.email ?? '', verified: !!u.email_confirmed_at }])
  );

  const users = (profiles || []).map((p) => ({
    ...p,
    email: infoById.get(p.id)?.email ?? '',
    verified: infoById.get(p.id)?.verified ?? false,
  }));

  return NextResponse.json({ users });
}
