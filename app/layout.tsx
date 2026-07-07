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
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
