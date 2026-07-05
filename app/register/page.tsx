'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
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
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="w-full p-3 rounded-lg bg-accent text-black font-semibold hover:opacity-90"
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
