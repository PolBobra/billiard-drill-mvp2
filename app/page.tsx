'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

    const timeoutId = setTimeout(() => {
      redirectOnce('/login');
    }, 3000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId);
        redirectOnce(session ? '/find' : '/login');
      })
      .catch(() => {
        clearTimeout(timeoutId);
        redirectOnce('/login');
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearTimeout(timeoutId);
        router.replace('/find');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-3">
        <p>Загрузка…</p>
        <p className="text-sm">
          Долго грузится?{' '}
          <Link href="/login" className="text-accent underline">
            Войти вручную
          </Link>
        </p>
      </div>
    </main>
  );
}
