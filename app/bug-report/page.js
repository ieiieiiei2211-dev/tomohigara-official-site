// ▼▼▼ Import the CORRECT component ▼▼▼
import BugReportForm from '../../components/BugReportForm';

export default function BugReportPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <h1>ゲームの不具合報告</h1>
      <p style={{ marginBottom: '40px' }}>
        「トモヒガラ」をプレイ中に発生した不具合をご報告いただけます。<br />
        スクリーンショットも添付できます。ご協力ありがとうございます。
      </p>
      
      {/* ▼▼▼ Call the CORRECT component ▼▼▼ */}
      <BugReportForm />
    </main>
  );
}