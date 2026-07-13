'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import YandexCaptcha, { type YandexCaptchaInstance } from '@/components/YandexCaptcha';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<YandexCaptchaInstance>(null);
  // синхронный флаг вместо (или в дополнение к) состояния loading — React
  // обновляет state асинхронно, и быстрый двойной клик/Enter+клик мог успеть
  // отправить два запроса с ОДНИМ И ТЕМ ЖЕ captchaToken до того, как кнопка
  // становилась disabled; Cloudflare отклоняет повторную проверку токена
  // как "duplicate", что раньше маскировалось под "неверный пароль"
  const submittingRef = useRef(false);

  useEffect(() => {
    setPasswordUpdated(new URLSearchParams(window.location.search).get('updated') === '1');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');

    if (!captchaToken) {
      setError('Подождите, идёт проверка безопасности…');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const json = await res.json();
    setLoading(false);
    submittingRef.current = false;

    if (!res.ok) {
      setError(json.error || 'Не удалось войти');
      captchaRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    if (json.session) {
      await supabase.auth.setSession({
        access_token: json.session.access_token,
        refresh_token: json.session.refresh_token,
      });
    }
    router.push('/find');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-felt2 px-4">
      <form onSubmit={handleSubmit} className="bg-black/30 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-accent mb-2">Вход</h1>
        {passwordUpdated && <p className="text-green-400 text-sm">Пароль обновлён — теперь можно войти.</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          required
        />
        <div className="text-right -mt-2">
          <Link href="/forgot-password" className="text-accent text-sm hover:underline">
            Забыли пароль?
          </Link>
        </div>

        <YandexCaptcha
          ref={captchaRef}
          siteKey={process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_SITE_KEY!}
          onSuccess={(token) => setCaptchaToken(token)}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={loading || !captchaToken}
          className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Входим…' : 'Войти'}
        </button>
        <p className="text-white/60 text-sm text-center">
          Нет аккаунта? <Link href="/register" className="text-accent">Зарегистрироваться</Link>
        </p>
      </form>
    </main>
  );
}
