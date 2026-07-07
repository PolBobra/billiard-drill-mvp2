'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-felt2 px-4">
        <div className="bg-black/30 p-8 rounded-2xl w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-accent">Проверь почту</h1>
          <p className="text-white/80">
            Мы отправили ссылку для сброса пароля на {email}. Перейди по ней, чтобы задать новый
            пароль.
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
        <h1 className="text-2xl font-bold text-accent mb-2">Восстановление пароля</h1>
        <p className="text-white/60 text-sm">
          Укажи email, привязанный к аккаунту — пришлём ссылку для сброса пароля.
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Отправляем…' : 'Отправить ссылку для сброса'}
        </button>
        <p className="text-white/60 text-sm text-center">
          Вспомнил пароль? <Link href="/login" className="text-accent">Войти</Link>
        </p>
      </form>
    </main>
  );
}
