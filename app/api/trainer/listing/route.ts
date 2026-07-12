import { NextResponse } from 'next/server';
import { requireUser, isUserFail } from '@/lib/userAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendTelegramMessage } from '@/lib/telegram';

// Тренер сам правит текст своего объявления (звание/школа/телефон/telegram/
// дисциплины) — эти поля тоже в revoke-списке в schema.sql, поэтому через
// service-role. Флаг is_verified_trainer и trainer_secret_code этот роут не
// трогает — верификация с нуля по-прежнему только через админа.
export async function PATCH(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const { fullName, rank, phone, school, telegram, disciplines } = await req.json();
  if (!rank?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Заполните звание и телефон' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('is_verified_trainer')
    .eq('id', auth.userId)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!profile?.is_verified_trainer) return NextResponse.json({ error: 'Not a trainer' }, { status: 404 });

  const { error } = await admin
    .from('profiles')
    .update({
      full_name: fullName?.trim() || null,
      trainer_rank: rank.trim(),
      trainer_school: school?.trim() || null,
      trainer_disciplines: Array.isArray(disciplines) ? disciplines : [],
      phone: phone.trim(),
      telegram: telegram?.trim() || null,
    })
    .eq('id', auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// Тренер сам снимает своё объявление с маркетплейса (is_verified_trainer
// стоит в revoke-списке в schema.sql, поэтому напрямую через клиент это
// не сделать — только через service-role здесь).
export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('is_verified_trainer, full_name')
    .eq('id', auth.userId)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!profile?.is_verified_trainer) return NextResponse.json({ error: 'Not a trainer' }, { status: 404 });

  const { error } = await admin
    .from('profiles')
    .update({ is_verified_trainer: false })
    .eq('id', auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendTelegramMessage(`🗑 Тренер удалил своё объявление на маркетплейсе: ${profile.full_name || auth.userId}`);

  return NextResponse.json({ success: true });
}
