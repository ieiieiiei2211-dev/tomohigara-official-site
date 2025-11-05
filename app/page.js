// app/[lang]/bug-report/page.js

import { promises as fs } from 'fs';
import path from 'path';
// ▼▼▼ パスを ../../../ に修正 ▼▼▼
import BugReportForm from '@/components/BugReportForm';
/**
 * URLの [lang] に応じて辞書ファイル (ja.json, en.json) を読み込む関数
 */
async function getDictionary(lang) {
  // 'en' 以外の不明な言語が指定されたら 'ja' を使う (フォールバック)
  const langSafe = ['en', 'ja'].includes(lang) ? lang : 'ja';
  // dictionaries/ja.json や dictionaries/en.json へのパスを構築
  const filePath = path.join(process.cwd(), `dictionaries/${langSafe}.json`);
  try {
    // ファイルを読み込む
    const jsonString = await fs.readFile(filePath, 'utf8');
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('Could not read dictionary file:', err);
    // もしen.jsonの読み込みに失敗したら、代わりにja.jsonを読み込む
    const fallbackPath = path.join(process.cwd(), 'dictionaries/ja.json');
    const jsonString = await fs.readFile(fallbackPath, 'utf8');
    return JSON.parse(jsonString);
  }
}
/**
 * バグ報告ページの本体 (Server Component)
 * URLの /ja/ や /en/ を params: { lang } で受け取る
 */
export default async function BugReportPage({ params: { lang } }) {
  // 1. URLに応じた辞書 (ja.json または en.json) を非同期で読み込む
  const dictionary = await getDictionary(lang);
  return (
    // globals.css のスタイル (#contact) を適用するために section タグを使用
    <section id="contact">
      {/* ▼ 辞書からフォームのタイトルを読み込む ▼ */}
      <h2>{dictionary.form_title || 'Bug Report Form'}</h2>
      {/* ▼ 子コンポーネントに辞書(dict)と言語コード(lang)を渡す ▼
        (BugReportForm.js 側で props として受け取る必要があります)
      */}
      <BugReportForm dict={dictionary} lang={lang} />
    </section>
  );
}