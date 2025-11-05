"use client";
import { devIndicatorServerState } from 'next/dist/server/dev/dev-indicator-server-state';
import { useState } from 'react';
// Netlifyへのデータ送信を簡単にするためのヘルパー関数
const encode = (data) => {
  return Object.keys(data)
    .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}
export default function FeedbackForm() {
  // 入力内容を管理するState
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  // ★★★フォームの送信状態を管理するStateを追加★★★
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'
  const [error, setError] = useState(''); // エラーメッセージを管理するState
  // 送信ボタンが押されたときの処理
  const handleSubmit = (event) => {
    event.preventDefault(); // ページのリロードを防ぐ
    setSubmissionStatus('submitting'); // 状態を「送信中」に更新
    // Netlifyにデータを送信
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({
        "form-name": "site-feedback",
        name: name,
        email: email,
        message: message,
      }),
    })
    .then(() => {
      setSubmissionStatus('success'); // 状態を「成功」に更新
      // 送信成功後に入力欄を空にする
      setName('');
      setEmail('');
      setMessage('');
    })
    .catch((error) => {
      setSubmissionStatus('error'); // 状態を「エラー」に更新
    });
     if (message.trim() === '') {
    setError('ご意見・ご感想を入力してください。'); // エラーメッセージをセット
    return; // ここで処理を中断
  }
  };
  // ★★★ 送信成功時の表示 ★★★
  if (submissionStatus === 'success') {
    return (
      <div style={{ textAlign: 'center' }}>
        <h3>ありがとうございます！</h3>
        <p>メッセージは正常に送信されました。</p>
      </div>
    );
  }
  // ★★★ 通常時・送信中・エラー時のフォーム表示 ★★★
  return (
    <form name="site-feedback" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit}>
      {/* 隠しフィールド */}
      <input type="hidden" name="form-name" value="site-feedback" />
      <p style={{ display: 'none' }}><label>Don’t fill this out if you’re human: <input name="bot-field" /></label></p>

      {/* 入力欄 */}
      <div className="form-group">
        <label htmlFor="name">お名前 (任意)</label>
        <input type="text" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="email">メールアドレス (任意)</label>
        <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="message">ご意見・ご感想</label>
        <textarea id="message" name="message" rows="5" required value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      {/* 送信ボタン */}
      <div className="form-group">
        <button type="submit" className="cta-button" disabled={submissionStatus === 'submitting'}>
          {submissionStatus === 'submitting' ? '送信中...' : '送信する'}
        </button>
      </div>
      {/* エラーメッセージ */}
      {submissionStatus === 'error' && <p style={{color: 'red'}}>エラーが発生しました。もう一度お試しください。</p>}
    </form>
  );
}