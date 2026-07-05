'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      setChecking(false);
    });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-felt2">
      <p className="text-white/70">{checking ? 'Загрузка…' : ''}</p>
    </main>
  );
}
