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
        {/* ВРЕМЕННО: диагностика зависаний на мобильных — ловит ошибки/промисы
            ещё до инициализации React (в том числе из сторонних скриптов
            вроде Cloudflare Turnstile) и рисует их прямо на экране. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                var div = document.createElement('div');
                div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:999999;font-size:12px;white-space:pre-wrap;word-break:break-all;';
                div.textContent = 'EARLY ERROR: ' + e.message + ' @ ' + e.filename + ':' + e.lineno;
                document.body ? document.body.appendChild(div) : document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(div); });
              });
              window.addEventListener('unhandledrejection', function(e) {
                var div = document.createElement('div');
                div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:orange;color:black;padding:10px;z-index:999999;font-size:12px;white-space:pre-wrap;word-break:break-all;';
                div.textContent = 'EARLY REJECTION: ' + String(e.reason);
                document.body ? document.body.appendChild(div) : document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(div); });
              });
            `,
          }}
        />
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
