import './globals.css';

export const metadata = {
  title: 'Бильярд Тренер',
  description: 'Система тренировки бильярда с подбором упражнений',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
