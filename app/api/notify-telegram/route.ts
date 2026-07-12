import { NextResponse } from 'next/server';
import { requireUser, isUserFail } from '@/lib/userAuth';
import { sendTelegramMessage } from '@/lib/telegram';

// Клиент дёргает это ПОСЛЕ того, как реальная заявка уже успешно вставлена
// напрямую в БД (через RLS) — этот роут только шлёт уведомление админу,
// сам ничего не пишет в базу. Требует авторизацию, чтобы не превратился
// в открытый способ слать боту произвольный текст.
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  await sendTelegramMessage(message);
  return NextResponse.json({ success: true });
}
