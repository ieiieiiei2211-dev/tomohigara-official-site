// 作成したフォームコンポーネントを読み込みます
import FeedbackForm from '../components/FeedbackForm';

export default function Home() {
  return (
    <div>
      {/* ページのメインコンテンツ */}
      <main>
        {/* ...ここにヒーローセクションやゲーム紹介などを追加していく... */}
        <h1>トモヒガラ公式サイト</h1>
      </main>

      {/* お問い合わせセクション */}
      <section id="contact">
        <h2>CONTACT</h2>
        <p>
          このウェブサイトのデザインや機能に関するご意見・ご感想はこちらのフォームからお願いします。
        </p>
        
        {/* ここで作成したフォーム部品を呼び出します */}
        <FeedbackForm />
      </section>
この文字を追加
      {/* フッター */}
      <footer>
        <p>© 2025 Tomohigara Studio</p>
        <p>運営者: トモヒガラ / お問い合わせ: info@tomohigara.com</p>
      </footer>
    </div>
  );
}