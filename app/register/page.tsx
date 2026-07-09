'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { supabase } from '@/lib/supabaseClient';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;

    if (!captchaToken) {
      setError('Подождите, идёт проверка безопасности…');
      return;
    }

    setError('');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, captchaToken },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setNeedsConfirmation(true);
      return;
    }

    if (data.user) {
      await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }
    setLoading(false);
    router.push('/find');
  }

  if (needsConfirmation) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-felt2 px-4">
        <div className="bg-black/30 p-8 rounded-2xl w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-accent">Почти готово!</h1>
          <p className="text-white/80">
            Регистрация прошла успешно! Проверь почту (включая папку «Спам») и перейди по ссылке
            для подтверждения аккаунта.
          </p>
          <Link href="/login" className="inline-block text-accent hover:underline text-sm">
            ← Назад ко входу
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-felt2 px-4">
      <form onSubmit={handleSubmit} className="bg-black/30 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-accent mb-2">Регистрация</h1>
        <input
          type="text"
          placeholder="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          required
        />
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
          minLength={6}
        />

        <label className="flex items-start gap-2 text-white/70 text-xs leading-relaxed">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 shrink-0"
            required
          />
          <span>
            Я согласен с{' '}
            <Link href="/terms" target="_blank" className="text-accent hover:underline">
              Пользовательским соглашением
            </Link>{' '}
            и{' '}
            <Link href="/privacy" target="_blank" className="text-accent hover:underline">
              Политикой конфиденциальности
            </Link>
          </span>
        </label>

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
          disabled={loading || !agreed || !captchaToken}
          className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Создаём…' : 'Создать аккаунт'}
        </button>
        <p className="text-white/60 text-sm text-center">
          Уже есть аккаунт? <Link href="/login" className="text-accent">Войти</Link>
        </p>
      </form>
    </main>
  );
}
