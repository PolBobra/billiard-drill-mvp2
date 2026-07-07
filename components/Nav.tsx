'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Nav() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-black/40 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm sm:text-base text-white/80">
        <Link href="/dashboard" className="hover:text-accent">Дашборд</Link>
        <Link href="/find" className="hover:text-accent">Зафиксировать удар</Link>
        <Link href="/errors" className="hover:text-accent">Мои ошибки</Link>
        <Link href="/exercises" className="hover:text-accent">База упражнений</Link>
      </div>
      <button onClick={handleLogout} className="text-white/60 hover:text-red-400 text-sm">
        Выйти
      </button>
    </nav>
  );
}
