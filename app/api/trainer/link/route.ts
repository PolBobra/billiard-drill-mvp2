import { NextResponse } from 'next/server';
import { requireUser, isUserFail } from '@/lib/userAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_ATTEMPTS_PER_HOUR = 5;

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    }),
  });
  const json = await res.json();
  return json.success === true;
}

// Привязка ученика к тренеру по секретному коду. 6 символов — небольшое
// пространство, поэтому реальная защита от подбора это рейтлимит +
// капча, а не длина кода самого по себе (см. память о плане фичи).
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const { code, captchaToken } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Введите код' }, { status: 400 });
  }
  if (!captchaToken) {
    return NextResponse.json({ error: 'Пройдите проверку безопасности' }, { status: 400 });
  }

  const captchaOk = await verifyTurnstile(captchaToken);
  if (!captchaOk) {
    return NextResponse.json({ error: 'Проверка безопасности не пройдена' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('trainer_link_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .gte('created_at', hourAgo);

  if ((count || 0) >= MAX_ATTEMPTS_PER_HOUR) {
    return NextResponse.json({ error: 'Слишком много попыток, попробуйте через час' }, { status: 429 });
  }

  await admin.from('trainer_link_attempts').insert({ user_id: auth.userId });

  const normalizedCode = code.trim().toUpperCase();
  const { data: trainer, error: trainerError } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('trainer_secret_code', normalizedCode)
    .eq('is_verified_trainer', true)
    .maybeSingle();

  if (trainerError) return NextResponse.json({ error: trainerError.message }, { status: 500 });
  if (!trainer) return NextResponse.json({ error: 'Неверный код' }, { status: 400 });

  const { error: updateError } = await admin
    .from('profiles')
    .update({ linked_trainer_id: trainer.id })
    .eq('id', auth.userId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true, trainerName: trainer.full_name });
}
