// FeedbackFormのimportも不要になるので削除
// import FeedbackForm from '../components/FeedbackForm';

export default function Home() {
  return (
    <div>
      {/* ページのメインコンテンツ */}
      <main>
        {/* ...ここにヒーローセクションやゲーム紹介などを追加していく... */}
        <h1>トモヒガラ公式サイト (Next.js版)</h1>
        <p>ここはNext.jsサイトのトップページです。</p>
        <p><a href="/bug-report">バグ報告ページへ</a></p> {/* バグ報告ページへのリンクを設置 */}
      </main>

      {/* お問い合わせセクションは削除 */}

      {/* フッター */}
      <footer>
        <p>© 2025 Tomohigara Studio</p>
        <p>運営者: トモヒガラ / お問い合わせ: info@tomohigara.com</p>
      </footer>
    </div>
  );
}