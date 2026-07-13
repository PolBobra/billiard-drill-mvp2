import { Metadata } from 'next';
import './globals.css';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.breakrun.ru'),
  title: 'BreakRun — тренажёр для бильярда',
  description: 'BreakRun — система тренировки бильярда с подбором упражнений под твои ошибки.',
  openGraph: {
    title: 'BreakRun — тренажёр для бильярда',
    description: 'Система тренировки бильярда с подбором упражнений под твои ошибки.',
    url: 'https://www.breakrun.ru',
    siteName: 'BreakRun',
    locale: 'ru_RU',
    type: 'website',
  },
  verification: {
    yandex: '935e06423eef1df0',
    google: 'QegYpKMKmAtwZ0ZvoCWUByRLUfxJbZ3NztFGqV0k25w',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang="ru">
      <head>
        {/* Preconnect начинает DNS/TLS-рукопожатие с Supabase параллельно
            с загрузкой JS, а не после неё — на мобильном 4G это заметно
            сокращает время до первого auth-запроса (проверка сессии на "/"). */}
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
      </head>
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
