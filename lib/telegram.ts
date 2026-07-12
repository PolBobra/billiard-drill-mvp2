// Уведомления админу в Telegram о новых заявках (клубы/тренеры-справочник,
// верификация/правка резюме тренера). Без TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID
// просто молча ничего не отправляет — не должно ронять сам флоу заявки.
export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}
