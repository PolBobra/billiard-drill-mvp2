import Link from 'next/link';

export const metadata = { title: 'Политика конфиденциальности — Бильярд Тренер' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-felt2 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-black/30 rounded-2xl p-6 sm:p-10 text-white/80 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Политика конфиденциальности</h1>
          <p className="text-white/50 text-sm">Последнее обновление: 7 июля 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-accent">1. Какие данные мы собираем</h2>
          <p>При использовании Сервиса мы можем собирать следующие данные:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>адрес электронной почты (при регистрации);</li>
            <li>имя, фамилию (если указаны в профиле);</li>
            <li>фотографию профиля (если загружена);</li>
            <li>информацию о клубе, тренере, инвентаре (если указаны добровольно);</li>
            <li>статистику использования Сервиса: зафиксированные удары, ошибки, выполненные упражнения, серии активности.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-accent">2. Для чего используются данные</h2>
          <p>Собранные данные используются для:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>обеспечения работы аккаунта и входа на Сайт;</li>
            <li>подбора подходящих тренировочных упражнений;</li>
            <li>отображения статистики и рейтинга (при согласии пользователя на публичное отображение никнейма);</li>
            <li>улучшения качества Сервиса.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-accent">3. Где хранятся данные</h2>
          <p>
            Данные хранятся с использованием стороннего облачного провайдера (Supabase). Мы
            принимаем разумные меры для защиты данных, включая ограничение доступа к персональной
            информации других пользователей.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-accent">4. Передача данных третьим лицам</h2>
          <p>Мы не передаём персональные данные третьим лицам, за исключением случаев:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>это требуется по закону;</li>
            <li>это необходимо для обработки платежей (данные передаются платёжному провайдеру в объёме, необходимом для проведения платежа);</li>
            <li>пользователь дал явное согласие.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-accent">5. Права пользователя</h2>
          <p>Пользователь имеет право:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>запросить копию своих персональных данных;</li>
            <li>запросить исправление неточных данных;</li>
            <li>запросить полное удаление аккаунта и связанных данных, написав на [email появится позже].</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-accent">6. Изменения политики</h2>
          <p>
            Мы можем время от времени обновлять данную Политику. Актуальная версия всегда доступна
            на этой странице.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-accent">7. Контакты</h2>
          <p>По вопросам обработки персональных данных обращайтесь: [email появится позже]</p>
        </section>

        <Link href="/register" className="inline-block text-accent hover:underline text-sm">
          ← Назад к регистрации
        </Link>
      </div>
    </main>
  );
}
