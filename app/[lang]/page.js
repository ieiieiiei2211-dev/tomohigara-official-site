// app/[lang]/bug-report/page.js

// ▼▼▼ エイリアスパス (@/) を使ってインポート ▼▼▼
import BugReportForm from '@/components/BugReportForm';
// URLの [lang] に応じて辞書ファイル (ja.json, en.json) を読み込む関数
async function getDictionary(lang) {
  // 'en' 以外の不明な言語が指定されたら 'ja' を使う
  const langToLoad = ['en', 'ja'].includes(lang) ? lang : 'ja';
  // 動的インポートを使って辞書ファイルを読み込む
  return import(`@/dictionaries/${langToLoad}.json`).then((module) => module.default);
}
/**
 * トップページの本体 (Server Component)
 * このページが /ja や /en に対応します。
 */

export async function generateStaticParams() {
  // 'ja' と 'en' のページをビルド時に生成するよう指示
  return [
    { lang: 'ja' },
    { lang: 'en' },
  ];
}
export default async function BugReportPage({ params: { lang } }) {
  const dictionary = await getDictionary(lang);
  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <h1>{dictionary.page_title || "ゲームの不具合報告"}</h1>
      <p style={{ marginBottom: '40px' }}>
        {dictionary.page_description || "「トモヒガラ」をプレイ中に発生した不具合をご報告いただけます。スクリーンショットも添付できます。ご協力ありがとうございます。"}
      </p>
      <BugReportForm dict={dictionary} lang={lang} />
    </main>
  );
}
