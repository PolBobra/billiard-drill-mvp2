import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyYandexCaptcha } from '@/lib/yandexCaptcha';
import { checkAuthRateLimit } from '@/lib/authRateLimit';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Та же логика, что в /api/auth/login — капчу проверяем сами (Yandex),
// встроенная защита капчой в Supabase Auth должна быть выключена в дашборде.
export async function POST(req: Request) {
  const { name, email, password, captchaToken } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }
  if (!captchaToken) {
    return NextResponse.json({ error: 'Пройдите проверку безопасности' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const withinLimit = await checkAuthRateLimit(ip, 'register');
  if (!withinLimit) {
    return NextResponse.json({ error: 'Слишком много попыток, попробуйте позже' }, { status: 429 });
  }

  const captchaOk = await verifyYandexCaptcha(captchaToken, ip || undefined);
  if (!captchaOk) {
    return NextResponse.json({ error: 'Проверка безопасности не пройдена' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 400 });
  }

  if (data.session && data.user) {
    const admin = getSupabaseAdmin();
    await admin
      .from('profiles')
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  return NextResponse.json({ session: data.session, user: data.user });
}
