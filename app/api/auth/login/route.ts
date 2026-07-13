import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyYandexCaptcha } from '@/lib/yandexCaptcha';

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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const captchaOk = await verifyYandexCaptcha(captchaToken, ip);
  if (!captchaOk) {
    return NextResponse.json({ error: 'Проверка безопасности не пройдена' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 400 });
  }

  return NextResponse.json({ session: data.session });
}
