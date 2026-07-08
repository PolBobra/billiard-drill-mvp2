import './globals.css';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Бильярд Тренер',
  description: 'Система тренировки бильярда с подбором упражнений',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang="ru">
      {/* Next.js хостит теги link/meta откуда угодно в дереве в <head> сам.
          Preconnect начинает DNS/TLS-рукопожатие с Supabase параллельно
          с загрузкой JS, а не после неё — на мобильном 4G это заметно
          сокращает время до первого auth-запроса (проверка сессии на "/"). */}
      {supabaseUrl && (
        <>
          <link rel="preconnect" href={supabaseUrl} />
          <link rel="dns-prefetch" href={supabaseUrl} />
        </>
      )}
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
