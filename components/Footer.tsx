import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="text-center text-white/40 text-xs py-6 px-4">
      © 2026 Бильярд Тренер. Все права защищены.{' '}
      <Link href="/terms" className="hover:text-white/70 underline">
        Условия использования
      </Link>{' '}
      ·{' '}
      <Link href="/privacy" className="hover:text-white/70 underline">
        Политика конфиденциальности
      </Link>{' '}
      ·{' '}
      <a
        href="https://t.me/Polka_bober_bot"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-white/70 underline"
      >
        Поддержка в Telegram
      </a>
    </footer>
  );
}
