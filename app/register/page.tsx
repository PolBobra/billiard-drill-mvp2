'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import YandexCaptcha, { type YandexCaptchaInstance } from '@/components/YandexCaptcha';
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
  const captchaRef = useRef<YandexCaptchaInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;

    if (!captchaToken) {
      setError('Подождите, идёт проверка безопасности…');
      return;
    }

    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, captchaToken }),
    });
    const json = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(json.error || 'Не удалось зарегистрироваться');
      captchaRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    if (!json.session) {
      setLoading(false);
      setNeedsConfirmation(true);
      return;
    }

    await supabase.auth.setSession({
      access_token: json.session.access_token,
      refresh_token: json.session.refresh_token,
    });
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

        <YandexCaptcha
          ref={captchaRef}
          siteKey={process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_SITE_KEY!}
          onSuccess={(token) => setCaptchaToken(token)}
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
