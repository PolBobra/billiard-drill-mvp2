'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

declare global {
  interface Window {
    smartCaptcha?: {
      render: (
        container: HTMLElement,
        params: { sitekey: string; callback: (token: string) => void; hl?: string }
      ) => number;
      reset: (widgetId: number) => void;
      destroy: (widgetId: number) => void;
    };
  }
}

export type YandexCaptchaInstance = { reset: () => void };

// Виджет Yandex SmartCaptcha — замена Cloudflare Turnstile (у него домен
// challenges.cloudflare.com плохо доступен в РФ без VPN, у Yandex такой
// проблемы нет). Скрипт грузится один раз и переиспользуется между
// рендерами формы логина/регистрации.
const YandexCaptcha = forwardRef<
  YandexCaptchaInstance,
  { siteKey: string; onSuccess: (token: string) => void }
>(({ siteKey, onSuccess }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current !== null && window.smartCaptcha) {
        window.smartCaptcha.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.smartCaptcha) return;
      widgetIdRef.current = window.smartCaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onSuccess(token),
      });
    }

    if (window.smartCaptcha) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-yandex-smartcaptcha]');
      if (existing) {
        existing.addEventListener('load', renderWidget);
      } else {
        const script = document.createElement('script');
        script.src = 'https://smartcaptcha.yandexcloud.net/captcha.js';
        script.async = true;
        script.dataset.yandexSmartcaptcha = 'true';
        script.addEventListener('load', renderWidget);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.smartCaptcha) {
        window.smartCaptcha.destroy(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return <div ref={containerRef} />;
});
YandexCaptcha.displayName = 'YandexCaptcha';

export default YandexCaptcha;
