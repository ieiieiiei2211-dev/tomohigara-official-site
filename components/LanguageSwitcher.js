"use client"; // ★ ブラウザの機能(URL)を使うため、クライアントコンポーネントにします

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function LanguageSwitcher() {
  const pathname = usePathname(); // (例: /ja/bug-report や /en など)

  // 1. 現在のURLから、現在の言語と、言語を除いた「基本パス」を取得します
  let currentLang = 'ja'; // デフォルトを 'ja' に
  let basePath = pathname;

  if (pathname.startsWith('/en')) {
    currentLang = 'en';
    basePath = pathname.substring(3); // "/en" の3文字を削除 (例: /bug-report)
  } else if (pathname.startsWith('/ja')) {
    currentLang = 'ja';
    basePath = pathname.substring(3); // "/ja" の3文字を削除
  }

  // basePathが空（=トップページ /ja や /en）だった場合、'/' を設定
  if (basePath === '') {
    basePath = '/';
  }

  // 2. ターゲットとなる言語のパスを生成します
  const jaPath = basePath === '/' ? '/ja' : `/ja${basePath}`;
  const enPath = basePath === '/' ? '/en' : `/en${basePath}`;

  // 3. スタイル（お好みで調整してください）
  const commonStyle = {
    color: '#e0e0e0',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '0 10px',
    fontSize: '1.1rem',
  };
  const activeStyle = {
    ...commonStyle,
    color: '#3b82f6', // 現在の言語の色
    textDecoration: 'underline',
  };

  return (
    // ★ サイト共通のヘッダーやフッターに配置することを想定しています
    <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #2f2f2f' }}>
      
      {currentLang === 'ja' ? (
        // 現在日本語ならテキスト表示
        <span style={activeStyle}>日本語</span>
      ) : (
        // それ以外なら日本語へのリンク
        <Link href={jaPath} style={commonStyle}>日本語</Link>
      )}

      <span style={{ color: '#aaa' }}>|</span>

      {currentLang === 'en' ? (
        // 現在英語ならテキスト表示
        <span style={activeStyle}>English</span>
      ) : (
        // それ以外なら英語へのリンク
        <Link href={enPath} style={commonStyle}>English</Link>
      )}
    </div>
  );
}