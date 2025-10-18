"use client";
import { useState, useRef, useEffect } from 'react';
// 10MBをバイト単位で定義 (10 * 1024 * 1024)
const MAX_FILE_SIZE = 10485760;
// encode関数はNetlifyのフォーム送信に必要
const encode = (data) => {
  return Object.keys(data)
    .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}

export default function BugReportForm() {
  // --- State定義 ---
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  // { file: File, previewUrl: string } の配列としてスクリーンショットを管理
  const [screenshots, setScreenshots] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState('idle');
  const [error, setError] = useState('');

  // --- Ref定義 ---
  const fileInputRef = useRef(null); // 隠しファイル入力への参照

  // --- スクリーンショット関連の関数 ---

  // 選択またはペーストされたファイル（複数可）を処理する
  const handleFiles = (files) => {
    const rawFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (rawFiles.length === 0) return;

    const validFiles = []; // サイズ制限をクリアしたファイルを入れる配列
    let sizeError = false; // サイズオーバーのファイルがあったかどうかのフラグ

    rawFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        sizeError = true;
      } else {
        validFiles.push(file);
      }
    });

    // 合計枚数チェック
    if (screenshots.length + validFiles.length > 10) {
      setError('画像は最大10枚まで添付できます。');
      if (fileInputRef.current) { fileInputRef.current.value = ''; }
      return;
    }

    // ファイルサイズチェック
    if (sizeError) {
      setError(`ファイルサイズは10MBまでです。${validFiles.length > 0 ? '制限内のファイルのみ追加しました。' : ''}`);
    } else {
      setError(''); // エラーがなければクリア
    }

    if (validFiles.length === 0) {
       if (fileInputRef.current) { fileInputRef.current.value = ''; }
       return;
    }

    // FileReaderを使ってプレビューURLを生成 (非同期処理)
    const newScreenshotPromises = validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onerror = () => {
            console.error("FileReader error");
            resolve(null);
        };
        reader.onload = (e) => resolve({ file, previewUrl: e.target.result }); // Data URLとしてプレビューを生成
        reader.readAsDataURL(file);
      });
    });

    // 全てのプレビューURLが生成されたらStateを更新 (エラーでnullが返ってきた場合は除外)
    Promise.all(newScreenshotPromises).then(newScreenshots => {
      const validScreenshots = newScreenshots.filter(s => s !== null); // nullを除外
      setScreenshots(prev => [...prev, ...validScreenshots]);
    });
  };

  // 特定のインデックスの画像を削除
  const handleDeleteScreenshot = (indexToDelete) => {
    const screenshotToDelete = screenshots[indexToDelete];
    if (screenshotToDelete?.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(screenshotToDelete.previewUrl);
    }
    setScreenshots(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  // すべてのスクリーンショットをクリア
  const clearScreenshots = () => {
    screenshots.forEach(s => {
        // createObjectURLで生成されたURLのみを解放
        if (s.previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(s.previewUrl)
        }
    });
    setScreenshots([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // ファイル入力をクリア
    }
  };

  // --- useEffect フック (ペースト処理とクリーンアップ) ---
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handlePaste = (event) => {
      handleFiles(event.clipboardData.files);
    };
    document.addEventListener('paste', handlePaste);

    // クリーンアップ関数
    return () => {
      document.removeEventListener('paste', handlePaste);
      screenshots.forEach(s => {
          if (s.previewUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(s.previewUrl);
          }
      });
    };
  }, [screenshots]); // screenshotsが更新されるたびにイベントリスナーを再設定

  // --- 送信処理 ---
  const handleSubmit = (event) => {
    event.preventDefault();
    if (message.trim() === '') { setError('不具合の詳細を入力してください。'); return; }
    setSubmissionStatus('submitting'); setError('');

    const formData = new FormData();
    formData.append('form-name', 'game-bug-report');
    formData.append('name', name);
    formData.append('message', message);
    if (screenshots.length > 0) {
      screenshots.forEach(({ file }) => {
        formData.append('screenshot', file);
      });
    }

    fetch("/", { method: "POST", body: formData })
      .then(response => { // ★ responseオブジェクトを受け取ります ★
        // ★ Netlifyがエラーを返した場合 (例: フォームが見つからない等) をチェック ★
        if (!response.ok) {
          // fetch自体は成功したが、HTTPステータスがエラー (4xx or 5xx)
          // エラー情報を付加して、意図的にエラーを発生させます
          throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }
        // ★ HTTPステータスが成功 (2xx) の場合 ★
        setSubmissionStatus('success');
        setName('');
        setMessage('');
        clearScreenshots();
      })
      .catch((fetchError) => { // ★ ネットワークエラー、または上記で投げたエラーの両方を捕捉 ★
        setSubmissionStatus('error');
        console.error("フォーム送信エラー:", fetchError); // デバッグ用にコンソールにエラー出力

        // ★ エラーメッセージを少し具体的に分岐 ★
        if (fetchError.message.startsWith('サーバーエラー')) {
          // 上記で throw したエラーの場合
          setError('サーバー側で問題が発生しました。時間をおいて再試行してください。');
        } else {
          // fetch自体が失敗した場合（ネットワーク接続の問題など）
          setError('送信に失敗しました。ネットワーク接続を確認してください。');
        }
      });
  };

  // --- 送信成功時の表示 ---
  if (submissionStatus === 'success') {
    return (
      <div className="submission-success" style={{ textAlign: 'center' }}>
        <h3>ご報告ありがとうございます！</h3>
        <p>不具合報告が正常に送信されました。ご協力に感謝いたします。</p>
        <button
          type="button"
          // ★ クリックされたらフォームの状態を 'idle' (初期状態) に戻す ★
          onClick={() => setSubmissionStatus('idle')}
          className="cta-button" // 既存のボタンスタイルを流用
          style={{width:'auto', marginTop:'20px'}} // 幅自動調整、上に余白
        >
          さらに報告する
        </button>
      </div>
    );
  }

  // --- 通常時・送信中・エラー時のフォーム表示 ---
  return (
    <form name="game-bug-report" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit} encType="multipart/form-data">
      <input type="hidden" name="form-name" value="game-bug-report" />
      <p style={{ display: 'none' }}>
        <label>
          Don’t fill this out if you’re human: <input name="bot-field" />
        </label>
      </p>

      {/* --- 名前入力 --- */}
      <div className="form-group">
        <label htmlFor="name-bug">お名前 (任意)</label>
        <input type="text" id="name-bug" name="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* --- スクリーンショット入力 --- */}
      
      <div className="form-group">
        <label htmlFor="screenshot-button">スクリーンショット (任意)</label>

        <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px', marginBottom: '10px' }}>
          最大10MBまでの画像ファイル (PNG, JPG, GIF) を添付できます。
        </p>
        
        <div className="screenshot-input-wrapper">
          {/* 隠しファイル入力 */}
          <input
            type="file"
            id="screenshot-input"
            name="screenshot" // Netlifyが認識する名前
            accept="image/png, image/jpeg, image/gif"
            style={{ display: 'none' }}
            ref={fileInputRef}
            multiple // 複数ファイル選択を許可
            onChange={(e) => handleFiles(e.target.files)} // 共通のファイル処理関数を呼ぶ
          />
          {/* ファイル選択ボタン */}
          <button
            type="button"
            id="screenshot-button"
            className="cta-button file-select-button"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: 'auto', marginBottom: '10px' }}
          >
            ファイルを選択...
          </button>

          {/* プレビューエリア (Reactでレンダリング) */}
          <div className="paste-area">
            {screenshots.length > 0 ? (
              // screenshots配列をmapしてプレビューを表示
              screenshots.map((screenshot, index) => (
                <div key={index} className="preview-item">
                  <img
                    src={screenshot.previewUrl}
                    alt={`Screenshot preview ${index + 1}`}
                    className="pasted-image-preview"
                  />
                  {/* 削除ボタン (×印) */}
                  <button
                    type="button"
                    onClick={() => handleDeleteScreenshot(index)} // クリックで削除関数を呼ぶ
                    className="delete-preview-button"
                    aria-label={`スクリーンショット ${index + 1} を削除`} // アクセシビリティのため
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              // 画像がない場合はプレースホルダーを表示
              <p className="paste-area-placeholder">または、ここに画像をペースト (Ctrl+V)</p>
            )}
          </div>
        </div>
      </div>

      {/* --- 不具合詳細入力 --- */}
      <div className="form-group">
        <label htmlFor="message-bug">不具合の詳細</label>
        <textarea
          id="message-bug"
          name="message"
          rows="8"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          // ★ aria-describedbyを追加。エラーがある時だけ関連付ける ★
          aria-describedby={error ? "form-error-message" : undefined}
          // ★ エラーがある場合に、入力欄自体もエラー状態であることを示す (任意) ★
          aria-invalid={error ? "true" : "false"}
        />
      </div>

     {/* バリデーションエラーメッセージ */}
      {error && (
        <p
          id="form-error-message" // ★ idを追加 ★
          className="error-message"
          style={{ color: 'red' }}
          // ★ アクセシビリティ向上のため、エラー発生時にフォーカスを当てる役割も持たせる ★
          role="alert"
        >
          {error}
        </p>
      )}

      {/* 送信ボタン */}
      <div className="form-group">
        <button type="submit" className="cta-button" disabled={submissionStatus === 'submitting'}>
          {submissionStatus === 'submitting' ? '送信中...' : '報告を送信する'}
        </button>
      </div>
    </form>
  );
}