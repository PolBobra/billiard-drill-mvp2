'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [debugError, setDebugError] = useState<string | null>(null);

  useEffect(() => {
    let redirected = false;

    const redirectOnce = (path: string) => {
      if (redirected) return;
      redirected = true;
      router.replace(path);
    };

    // ВРЕМЕННО: ловим вообще любые необработанные ошибки/промисы
    // на этой странице и показываем их прямо на экране — чтобы увидеть,
    // что реально падает на проблемных телефонах, раз консоль недоступна.
    const onError = (e: ErrorEvent) => {
      setDebugError(`Error: ${e.message} @ ${e.filename}:${e.lineno}`);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      setDebugError(`Unhandled rejection: ${String(e.reason)}`);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    const timeoutId = setTimeout(() => {
      redirectOnce('/login');
    }, 3000);

    try {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          clearTimeout(timeoutId);
          redirectOnce(session ? '/dashboard' : '/login');
        })
        .catch((err) => {
          setDebugError(`getSession rejected: ${String(err)}`);
        });
    } catch (err) {
      setDebugError(`getSession threw sync: ${String(err)}`);
    }

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
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-felt2 text-white/70 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p>Загрузка…</p>
        {debugError && (
          <pre className="mt-4 text-red-400 text-xs whitespace-pre-wrap break-words bg-black/40 p-3 rounded-lg text-left">
            {debugError}
          </pre>
        )}
      </div>
    </main>
  );
}
