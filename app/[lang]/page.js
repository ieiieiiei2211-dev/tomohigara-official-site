// app/[lang]/page.js
// ★ このコードで新しくファイルを作成（または上書き）してください ★

// 辞書ファイルを動的に読み込むための設定
async function getDictionary(lang) {
  // 'en' 以外の不明な言語が指定されたら 'ja' を使う
  const langToLoad = ['en', 'ja'].includes(lang) ? lang : 'ja';
  // 動的インポートを使って辞書ファイルを読み込む
  return import(`@/dictionaries/${langToLoad}.json`).then((module) => module.default);
}

// 静的エクスポート ('output: export') のために必須
// /ja と /en のページをビルド時に生成するよう指示
export async function generateStaticParams() {
  return [
    { lang: 'ja' },
    { lang: 'en' },
  ];
}

/**
 * サイトのトップページ本体 (Server Component)
 * このページが /ja や /en に対応します。
 */
export default async function Home({ params: { lang } }) {
  // ★ Next.js v15 のルールに従い、{ params } で受け取り、中で lang を取り出す

  
  // 辞書 (ja.json や en.json) を読み込む
  const dictionary = await getDictionary(lang);

  // ja.json や en.json に "top_title" や "top_description", "bug_report_link" を
  // 追加すれば、ここのテキストも多言語化できます。
  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
      
      <h1>{dictionary.top_title || "トモヒガラ 公式サイト"}</h1>
      
      <p style={{ margin: '20px 0 40px', lineHeight: 1.7 }}>
        {dictionary.top_description || "「トモヒガラ」の公式サイトへようこそ。"}
      </p>

      {/* 今後、ここにゲームの紹介やスクリーンショット、
        ダウンロードリンクなどを追加できます。
      */}

      <a 
        href={`/${lang}/bug-report`} 
        style={{
          display: 'inline-block',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          color: '#fff',
          background: 'linear-gradient(180deg, #1e6bff, #155de6)',
          textDecoration: 'none'
        }}
      >
        {dictionary.bug_report_link || "不具合を報告する"}
      </a>
    </main>
  );
}