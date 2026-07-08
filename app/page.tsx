'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let redirected = false;

    const redirectOnce = (path: string) => {
      if (redirected) return;
      redirected = true;
      router.replace(path);
    };

    // Известная проблема: на некоторых версиях мобильного Safari
    // (особенно в приватном режиме) supabase-js использует
    // navigator.locks для синхронизации сессии между вкладками,
    // и getSession() может зависнуть навсегда без ответа.
    // Подстраховываемся таймаутом — если за 3 секунды ответа нет,
    // считаем, что сессии нет, и уходим на /login. Если сессия
    // реально была, onAuthStateChange ниже всё равно её поймает
    // и перекинет в /dashboard.
    const timeoutId = setTimeout(() => {
      redirectOnce('/login');
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      redirectOnce(session ? '/dashboard' : '/login');
    });

    // onAuthStateChange оставляем для случая перехода по ссылке из письма
    // подтверждения — тогда Supabase обработает токены из URL и создаст
    // сессию уже после того, как быстрая проверка выше могла отработать
    // с session = null (или сработал таймаут).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearTimeout(timeoutId);
        router.replace('/dashboard');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center">
      Загрузка…
    </main>
  );
}
