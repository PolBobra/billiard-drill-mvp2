import { NextResponse } from 'next/server';
import { requireAdmin, isAdminFail } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('addition_requests')
    .select('id, name, city, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { id, action } = await req.json();
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  if (action === 'reject') {
    const { error } = await admin.from('addition_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data: reqRow, error: reqError } = await admin
    .from('addition_requests')
    .select('name, city')
    .eq('id', id)
    .single();
  if (reqError || !reqRow) {
    return NextResponse.json({ error: reqError?.message || 'Заявка не найдена' }, { status: 404 });
  }

  const { error: insertError } = await admin
    .from('clubs')
    .insert({ name: reqRow.name, city: reqRow.city })
    .select()
    .single();
  // если такой клуб (name, city) уже есть — уникальный конфликт не считаем ошибкой
  if (insertError && insertError.code !== '23505') {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: statusError } = await admin
    .from('addition_requests')
    .update({ status: 'approved' })
    .eq('id', id);
  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
