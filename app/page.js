// app/[lang]/bug-report/page.js

// ★↓ fs, path, BugReportForm の import をこの3行に書き換える ↓★
import { promises as fs } from 'fs';
import path from 'path';
import BugReportForm from '../../components/BugReportForm';

// URLの [lang] に応じて辞書を読み込む非同期関数
async function getDictionary(lang) {
  // 'en' 以外の不明な言語が指定されたら 'ja' を使う
  const langSafe = ['en', 'ja'].includes(lang) ? lang : 'ja';
  const filePath = path.join(process.cwd(), `dictionaries/${langSafe}.json`);
  try {
    const jsonString = await fs.readFile(filePath, 'utf8');
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('Could not read dictionary file:', err);
    // エラー時は日本語をフォールバック
    const fallbackPath = path.join(process.cwd(), 'dictionaries/ja.json');
    const jsonString = await fs.readFile(fallbackPath, 'utf8');
    return JSON.parse(jsonString);
  }
}

// ★↓ この export default async function も丸ごと書き換える ↓★
export default async function BugReportPage({ params: { lang } }) {
  // URL (params.lang) に応じた辞書を取得
  const dictionary = await getDictionary(lang);

  return (
    // globals.css のスタイルを適用するため
    <section id="contact">
      {/* <h2>{dictionary.form_title}</h2> */} {/* まだ辞書がないので、いったんタイトルを削除 */}
      {/* フォームコンポーネントに辞書と言語コードを渡す */}
      <BugReportForm dict={dictionary} lang={lang} />
    </section>
  );
}