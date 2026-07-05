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
    <nav className="flex items-center justify-between bg-black/40 px-6 py-4">
      <div className="flex gap-6 text-white/80">
        <Link href="/dashboard" className="hover:text-accent">Дашборд</Link>
        <Link href="/find" className="hover:text-accent">Зафиксировать удар</Link>
        <Link href="/exercises" className="hover:text-accent">База упражнений</Link>
      </div>
      <button onClick={handleLogout} className="text-white/60 hover:text-red-400 text-sm">
        Выйти
      </button>
    </nav>
  );
}
