import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
