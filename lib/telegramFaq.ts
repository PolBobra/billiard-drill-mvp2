// Базовые вопросы бота поддержки — простой поиск по ключевым словам.
// Если ни один пункт не подошёл, вопрос уходит в Claude (см. app/api/telegram-webhook).
// Черновой список по функциям сайта — правь/дополняй прямо здесь под реальные
// вопросы клиентов.
type FaqEntry = { keywords: string[]; answer: string };

const FAQ: FaqEntry[] = [
  {
    keywords: ['/start', 'привет', 'здравств', 'начать'],
    answer:
      'Привет! Я бот поддержки BreakRun — тренажёра для бильярда. Спрашивай про упражнения, тренеров, подписки или вход в аккаунт, постараюсь помочь.',
  },
  {
    keywords: ['подписк', 'тариф', 'цена', 'стоимост', 'оплат', 'сколько стоит'],
    answer:
      'Подписки ("С тренером" и "Маркетплейс") подключает администратор вручную — напиши сюда, что тебя интересует, и мы всё оформим.',
  },
  {
    keywords: ['тренер', 'маркетплейс', 'найти тренера', 'коуч'],
    answer:
      'Найти тренера можно в разделе «Тренер» → вкладка «Маркетплейс» на сайте. Там же, если у тебя уже есть тренер, можно привязаться к нему по секретному коду от него.',
  },
  {
    keywords: ['упражнен', 'ошиб', 'ошибка', 'угол', 'трениров'],
    answer:
      'В разделе «Найти упражнение» зафиксируй свою ошибку на столе (тип удара, угол, дистанцию) — система подберёт подходящее упражнение для отработки именно этой ошибки.',
  },
  {
    keywords: ['парол', 'вход', 'логин', 'зарегистрир', 'аккаунт', 'войти'],
    answer:
      'Если не получается войти — попробуй «Забыли пароль?» на странице входа. Если и это не помогает, напиши сюда email аккаунта, разберёмся.',
  },
];

// Простое расстояние Левенштейна — допускает 1-2 опечатки в слове, чтобы
// "ошиок"/"ошибк" всё равно попадали в FAQ, а не улетали в платный AI-fallback.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function matchFaq(text: string): string | null {
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-zа-яё0-9/]+/i).filter(Boolean);

  for (const entry of FAQ) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) return entry.answer;
      // Короткие корни (<5 символов) и составные фразы с пробелом слишком
      // легко случайно совпадают почти с чем угодно при нечётком сравнении —
      // разрешаем typo-допуск только на достаточно длинных словах-эталонах.
      if (keyword.length < 5 || keyword.includes(' ') || keyword.startsWith('/')) continue;
      const maxDistance = 2;
      if (words.some((w) => Math.abs(w.length - keyword.length) <= maxDistance && levenshtein(w, keyword) <= maxDistance)) {
        return entry.answer;
      }
    }
  }
  return null;
}
