// Серверная проверка Yandex SmartCaptcha — замена Cloudflare Turnstile,
// у которого домен challenges.cloudflare.com плохо доступен в РФ без VPN.
// Задействуется в /api/auth/login, /api/auth/register и /api/trainer/link.
export async function verifyYandexCaptcha(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.YANDEX_CAPTCHA_SERVER_KEY;
  if (!secret || !token) return false;

  const params = new URLSearchParams({ secret, token });
  if (ip) params.set('ip', ip);

  try {
    const res = await fetch(`https://smartcaptcha.yandexcloud.net/validate?${params.toString()}`);
    const json = await res.json();
    return json?.status === 'ok';
  } catch {
    return false;
  }
}
