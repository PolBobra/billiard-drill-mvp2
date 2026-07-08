import { NextResponse } from 'next/server';
import { requireAdmin, isAdminFail } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateTrainerCode } from '@/lib/trainerCode';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (isAdminFail(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('trainer_verification_requests')
    .select('id, user_id, request_type, full_name, email, rank, phone, school, telegram, disciplines, status, created_at')
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
    const { error } = await admin.from('trainer_verification_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data: reqRow, error: reqError } = await admin
    .from('trainer_verification_requests')
    .select('user_id, request_type, rank, phone, school, telegram, disciplines')
    .eq('id', id)
    .single();
  if (reqError || !reqRow) {
    return NextResponse.json({ error: reqError?.message || 'Заявка не найдена' }, { status: 404 });
  }

  const profileUpdate: Record<string, unknown> = {
    trainer_rank: reqRow.rank,
    trainer_school: reqRow.school,
    trainer_disciplines: reqRow.disciplines || [],
    phone: reqRow.phone,
    telegram: reqRow.telegram,
  };

  if (reqRow.request_type === 'initial') {
    profileUpdate.is_verified_trainer = true;
    // код уникальный — при редкой коллизии просто пробуем ещё раз
    let attempts = 0;
    let saved = false;
    while (attempts < 5 && !saved) {
      const code = generateTrainerCode();
      const { error: codeError } = await admin
        .from('profiles')
        .update({ ...profileUpdate, trainer_secret_code: code })
        .eq('id', reqRow.user_id);
      if (!codeError) {
        saved = true;
      } else if (codeError.code !== '23505') {
        return NextResponse.json({ error: codeError.message }, { status: 500 });
      }
      attempts++;
    }
    if (!saved) {
      return NextResponse.json({ error: 'Не удалось сгенерировать уникальный код' }, { status: 500 });
    }
  } else {
    const { error: updateError } = await admin.from('profiles').update(profileUpdate).eq('id', reqRow.user_id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: statusError } = await admin
    .from('trainer_verification_requests')
    .update({ status: 'approved' })
    .eq('id', id);
  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
