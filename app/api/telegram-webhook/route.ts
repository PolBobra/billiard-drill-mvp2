import { NextResponse } from 'next/server';
import { getAnthropic } from '@/lib/anthropic';
import { sendTelegramMessage } from '@/lib/telegram';
import { matchFaq } from '@/lib/telegramFaq';

const SUPPORT_SYSTEM_PROMPT =
  'Ты — бот поддержки BreakRun, тренажёра для бильярда. Отвечай кратко (2-4 предложения), дружелюбно, на русском. ' +
  'Сайт помогает игрокам фиксировать свои ошибки на столе и получать подходящие упражнения для тренировки, а также ' +
  'найти тренера через маркетплейс или привязаться к своему тренеру по секретному коду. Подписки подключает администратор ' +
  'вручную. Если не знаешь точного ответа (например, про цены, аккаунт конкретного пользователя, технические баги) — ' +
  'честно скажи, что передашь вопрос администратору, и не выдумывай факты.';

// Telegram зовёт этот роут при каждом входящем сообщении в бота (после
// setWebhook). Секретный токен в заголовке — единственная защита от того,
// что этот публичный эндпоинт дёрнет кто угодно и заставит нас платить за
// вызовы Claude чужими сообщениями.
export async function POST(req: Request) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;

  if (!chatId || typeof text !== 'string' || !text.trim() || text.length > 1000) {
    return NextResponse.json({ ok: true });
  }

  const faqAnswer = matchFaq(text);
  if (faqAnswer) {
    await sendTelegramMessage(faqAnswer, chatId);
    return NextResponse.json({ ok: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    await sendTelegramMessage('Не получилось ответить автоматически — передал вопрос администратору, скоро ответим.', chatId);
    await sendTelegramMessage(`❓ Вопрос в поддержку (chat ${chatId}): ${text}`);
    return NextResponse.json({ ok: true });
  }

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      system: SUPPORT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    const answer =
      textBlock?.type === 'text' && textBlock.text.trim()
        ? textBlock.text.trim()
        : 'Не смог сформулировать ответ — передал вопрос администратору.';
    await sendTelegramMessage(answer, chatId);
  } catch (err) {
    console.error('telegram-webhook AI fallback error:', err);
    await sendTelegramMessage('Не получилось ответить автоматически — передал вопрос администратору, скоро ответим.', chatId);
  }

  await sendTelegramMessage(`❓ Вопрос в поддержку (chat ${chatId}): ${text}`);
  return NextResponse.json({ ok: true });
}
