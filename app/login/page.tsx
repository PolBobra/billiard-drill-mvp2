'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    setPasswordUpdated(new URLSearchParams(window.location.search).get('updated') === '1');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!captchaToken) {
      setError('Подождите, идёт проверка безопасности…');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    setLoading(false);

    if (error) {
      // временно показываем реальный текст ошибки от Supabase — "Неверный
      // email или пароль" был жёстко захардкожен для любой ошибки, из-за
      // чего сбой проверки капчи выглядел неотличимо от неверного пароля
      setError(`${error.message} (${error.status ?? '?'})`);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    } else {
      router.push('/dashboard');
    }
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

        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
          options={{ theme: 'dark' }}
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
