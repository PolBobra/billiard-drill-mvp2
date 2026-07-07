'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // onAuthStateChange (а не разовый getSession()) — чтобы поймать момент,
    // когда Supabase обработает токены подтверждения из URL после перехода
    // по ссылке из письма, и сразу пустить в дашборд без ручного логина.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      router.replace(session ? '/dashboard' : '/login');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center">
      Загрузка…
    </main>
  );
}
