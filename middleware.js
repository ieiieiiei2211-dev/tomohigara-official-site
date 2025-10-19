// middleware.js (修正版)

import { NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

let locales = ['ja', 'en'];
let defaultLocale = 'ja';

function getLocale(request) {
  const negotiatorHeaders = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return match(languages, locales, defaultLocale);
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // 1. すでに /ja や /ja/bug-report のように言語コードが含まれているかチェック
  // ★↓ チェック条件を修正 (「/ja」と「/ja/」の両方に対応)
  if (
    locales.some(
      (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
    )
  ) {
    // 含まれている場合は、何もしない
    return NextResponse.next();
  }
  
  // 2. 静的ファイルやAPIへのアクセスは無視
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    /\.(gif|png|jpg|jpeg|svg|ico|css|js)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 3. 言語コードがない場合、ロケールを取得
  const locale = getLocale(request);
  
  // 4. URLを書き換えてリダイレクト
  // ★↓ ルートパス ("/") へのアクセスを /ja/ に正しくリダイレクトするように修正
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }

  // ★↓ /bug-report などを /ja/bug-report にリダイレクト
  return NextResponse.redirect(
    new URL(`/${locale}${pathname}`, request.url)
  );
}

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
  ],
};