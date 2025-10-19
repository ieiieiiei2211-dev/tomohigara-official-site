// app/[lang]/bug-report/page.js
// ★ このコードで丸ごと置き換えてください ★

import { promises as fs } from 'fs';
import path from 'path';
// ▼▼▼ エイリアスパス (@/) を使ってインポート ▼▼▼
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
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      
      {/* ja.json に "page_title" と "page_description" を
        追加すれば、ここのテキストも多言語化できます。
      */}
      <h1>{dictionary.page_title || "ゲームの不具合報告"}</h1>
      <p style={{ marginBottom: '40px' }}>
        {dictionary.page_description || "「トモヒガラ」をプレイ中に発生した不具合をご報告いただけます。スクリーンショットも添付できます。ご協力ありがとうございます。"}
      </p>
      
      {/* dict と lang はそのまま渡します */}
      <BugReportForm dict={dictionary} lang={lang} />
    </main>
  );
}
