import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyYandexCaptcha } from '@/lib/yandexCaptcha';
import { checkAuthRateLimit } from '@/lib/authRateLimit';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Капчу проверяем сами (Yandex SmartCaptcha), поэтому встроенную защиту
// капчой в Supabase Auth нужно выключить в дашборде — иначе Supabase
// отклонит вход без валидного Turnstile-токена, которого у нас больше нет.
export async function POST(req: Request) {
  const { email, password, captchaToken } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Введите email и пароль' }, { status: 400 });
  }
  if (!captchaToken) {
    return NextResponse.json({ error: 'Пройдите проверку безопасности' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const withinLimit = await checkAuthRateLimit(ip, 'login');
  if (!withinLimit) {
    return NextResponse.json({ error: 'Слишком много попыток, попробуйте позже' }, { status: 429 });
  }

  const captchaOk = await verifyYandexCaptcha(captchaToken, ip || undefined);
  if (!captchaOk) {
    return NextResponse.json({ error: 'Проверка безопасности не пройдена' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 400 });
  }

  // Если email-подтверждение было включено на момент регистрации, сессии
  // тогда ещё не было (см. app/api/auth/register) — согласие с условиями
  // так и осталось незаписанным. Раз человек смог войти, аккаунт подтверждён —
  // фиксируем задним числом, если это ещё не было сделано.
  if (data.user) {
    const admin = getSupabaseAdmin();
    await admin
      .from('profiles')
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq('id', data.user.id)
      .is('terms_accepted_at', null);
  }

  return NextResponse.json({ session: data.session });
}
