// Уведомления админу в Telegram о новых заявках (клубы/тренеры-справочник,
// верификация/правка резюме тренера), а также ответы бота поддержки
// произвольным пользователям (chatId передаётся явно). Без
// TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID просто молча ничего не отправляет —
// не должно ронять сам флоу заявки.
export async function sendTelegramMessage(text: string, chatId?: string | number) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId ?? process.env.TELEGRAM_CHAT_ID;
  if (!token || !targetChatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: targetChatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}
