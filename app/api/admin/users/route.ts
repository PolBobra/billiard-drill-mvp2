import { NextResponse } from 'next/server';
import { requireAdmin, isAdminFail } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const admin = getSupabaseAdmin();

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, name, full_name, club_id, coach, cue, created_at, is_admin, flagged_suspicious, clubs(name, city)')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const infoById = new Map(
    authData.users.map(
      (u): [string, { email: string; verified: boolean }] => [
        u.id,
        { email: u.email ?? '', verified: !!u.email_confirmed_at },
      ]
    )
  );

  const users = (profiles || []).map((p) => {
    const club = Array.isArray(p.clubs) ? p.clubs[0] : p.clubs;
    return {
      ...p,
      club_name: club?.name ?? null,
      club_city: club?.city ?? null,
      email: infoById.get(p.id)?.email ?? '',
      verified: infoById.get(p.id)?.verified ?? false,
    };
  });

  return NextResponse.json({ users });
}
