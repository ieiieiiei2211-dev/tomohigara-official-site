"use client";
import { useState, useRef, useEffect } from 'react';
import Recaptcha from 'react-google-recaptcha';
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
    const [submissionStatus, setSubmissionStatus] = useState('submitting');
    const [error, setError] = useState({}); // ★ nullではなく空オブジェクトを初期値にします
    const [frequency, setFrequency] = useState(''); // 発生頻度用
    const [severity, setSeverity] = useState('');   // 深刻度用
    const [steps, setSteps] = useState('');         // 再現手順用
    const [expectedBehavior, setExpectedBehavior] = useState(''); // 期待した動作
    const [gameVersion, setGameVersion] = useState(''); // ゲームバージョン用 (任意)
    const [contactInfo, setContactInfo] = useState(''); // 連絡先用
    const [consent, setConsent] = useState(false);       // 同意チェックボックス用
    const [operatingSystem, setOperatingSystem] = useState(''); // OS用
    const [pcSpecs, setPcSpecs] = useState('');                 // PCスペック用
    const [gameLog, setGameLog] = useState('');                 // ゲームログ用


  // --- Ref定義 ---
  const fileInputRef = useRef(null); // 隠しファイル入力への参照
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

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
            // ★ 既存のエラーを保持しつつ、ファイルエラーを追加/上書き ★
            setError(prev => ({ ...prev, file: '画像は最大10枚まで添付できます。' }));
            if (fileInputRef.current) { fileInputRef.current.value = ''; }
            return;
        }

        // ファイルサイズチェック
        if (sizeError) {
            // ★ 既存のエラーを保持しつつ、ファイルエラーを追加/上書き ★
            setError(prev => ({ ...prev, file: `ファイルサイズは10MBまでです。${validFiles.length > 0 ? '制限内のファイルのみ追加しました。' : ''}` }));
        } else {
            // ★ ファイル関連のエラーが解消された場合、fileキーのみを削除 ★
            setError(prev => {
                const { file, ...rest } = prev;
                return rest;
            });
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
        console.log("handleSubmitが実行されました！");
        event.preventDefault();
        if (!recaptchaToken) {
      setError(prev => ({ ...prev, form: '「私はロボットではありません」にチェックを入れてください。' }));
      return;
    }
        const errors = {}; // エラーを保持するオブジェクト
        if (frequency === '') {
            errors.frequency = '発生頻度を選択してください。';
        }
        if (severity === '') {
            errors.severity = '深刻度を選択してください。';
        }
        if (steps.trim() === '') {
            errors.steps = '再現手順を入力してください。';
        }

        // エラーが1つでもあれば、setErrorでまとめて更新し、処理を中断
        if (Object.keys(errors).length > 0) {
            console.log("エラーをセットしました:", errors);
            setError(errors); // ★ エラーオブジェクト全体をStateにセット ★
        } else {
            // ★ エラーがなかった場合のみ、このブロックを実行 ★
            // エラー表示をクリアし、送信ステータスを更新
            setError({});
            setSubmissionStatus('submitting');

            const formData = new FormData();
            formData.append('form-name', 'game-bug-report');
            formData.append('name', name);
            formData.append('message', message);
            formData.append('frequency', frequency);
            formData.append('severity', severity);
            formData.append('steps', steps);
            formData.append('expectedBehavior', expectedBehavior); // 期待した動作
            formData.append('message', message); // 補足情報
            formData.append('gameVersion', gameVersion);
            formData.append('os', operatingSystem);
            formData.append('pcSpecs', pcSpecs);
            formData.append('contactInfo', contactInfo); // 連絡先
            formData.append('consent', consent);       // 同意チェック (true/falseが文字列として送られます)
            formData.append('g-recaptcha-response', recaptchaToken);

            if (screenshots.length > 0) {
                screenshots.forEach(({ file }) => {
                    formData.append('screenshot', file);
                });
            }
            

            // 1. 実際の送信処理 (Promise)
      const fetchPromise = fetch("/", { method: "POST", body: formData })
        .then(response => {
          if (!response.ok) {
            // Netlifyサーバーがエラーを返した場合
            throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
          }
          // 成功レスポンスを次に渡す (ここではまだ state を変更しない)
          return response; 
        });

      // 2. 最低でも1.5秒間待つためのタイマー (1500ミリ秒)
      const minimumDisplayTimePromise = new Promise(resolve => {
        setTimeout(resolve, 500); 
      });

      // 3. 「送信処理」と「1.5秒タイマー」の両方が完了するのを待つ
      Promise.all([fetchPromise, minimumDisplayTimePromise])
        .then(([fetchResponse]) => {
          // ★ 両方完了したら（送信成功＆1.5秒経過）、成功画面に切り替える
          setSubmissionStatus('success');
          
          // ★ 成功時のリセット処理 (リセット項目をすべてここに集約)
          setName('');
          setMessage('');
          clearScreenshots();
          setFrequency('');
          setSeverity('');
          setSteps('');
          setExpectedBehavior('');
          setGameVersion('');
          setOperatingSystem('');
          setPcSpecs('');
          setGameLog('');
          setContactInfo('');
          setConsent(false);
          setRecaptchaToken(null);
          recaptchaRef.current?.reset();
        })
        .catch((fetchError) => { 
          // ★ ネットワークエラー、またはサーバーエラーのどちらかが発生した場合
          setSubmissionStatus('error');
          console.error("フォーム送信エラー:", fetchError); 

          if (fetchError.message.startsWith('サーバーエラー')) {
            setError({ form: 'サーバー側で問題が発生しました。時間をおいて再試行してください。' });
          } else {
            // fetch自体が失敗した場合（ネットワーク接続の問題など）
            setError({ form: '送信に失敗しました。ネットワーク接続を確認してください。' });
          }

          // エラー時も reCAPTCHA はリセット
          setRecaptchaToken(null);
          recaptchaRef.current?.reset();
        });
        } // elseブロックの閉じ括弧
    }

        
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
                    style={{ width: 'auto', marginTop: '20px' }} // 幅自動調整、上に余白
                >
                    さらに報告する
                </button>
            </div>
        );
    }

  // --- 通常時・送信中・エラー時のフォーム表示 ---
    return (
       <form name="game-bug-report" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit} encType="multipart/form-data">
            {/* 隠しフィールド */}
            <input type="hidden" name="form-name" value="game-bug-report" />

            {/* --- ★名前 (Input Text)★ --- */}
            {/* ... (隠しフィールド、名前入力) ... */}

            {/* --- ★発生頻度 (Select Box)★ --- */}
            <div className="form-group">
                <label htmlFor="frequency">発生頻度 *</label>
                <select
                    id="frequency"
                    name="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    required
                    className={error?.frequency ? 'is-invalid' : ''} // クラス名を動的に設定
                    aria-describedby={error?.frequency ? "frequency-error" : undefined} // エラーメッセージと関連付け
                    aria-invalid={error?.frequency ? "true" : "false"} // エラー状態を示す
                >
                    <option value="" disabled>選択してください</option>
                    <option value="always">必ず発生する</option>
                    <option value="sometimes">時々発生する</option>
                    <option value="once">一度だけ発生した</option>
                </select>
                {/* 発生頻度のエラーメッセージ */}
                {error?.frequency && <p id="frequency-error" className="error-message">{error.frequency}</p>}
            </div>

            {/* --- ★深刻度 (Select Box)★ --- */}
            <div className="form-group">
                <label htmlFor="severity">深刻度 *</label>
                <select
                    id="severity"
                    name="severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    required
                    className={error?.severity ? 'is-invalid' : ''} // クラス名を動的に設定
                    aria-describedby={error?.severity ? "severity-error" : undefined} // エラーメッセージと関連付け
                    aria-invalid={error?.severity ? "true" : "false"} // エラー状態を示す
                >
                    <option value="" disabled>選択してください</option>
                    <option value="crash">ゲームがクラッシュする (致命的)</option>
                    <option value="blocking">進行不能になる</option>
                    <option value="minor">表示/動作がおかしい (軽微)</option>
                    <option value="suggestion">改善提案</option>
                </select>
                {/* 深刻度のエラーメッセージ */}
                {error?.severity && <p id="severity-error" className="error-message">{error.severity}</p>}
            </div>

            {/* --- ★再現手順 (Textarea)★ --- */}
            <div className="form-group">
                <label htmlFor="steps">再現手順 *</label>
                <textarea
                    id="steps"
                    name="steps"
                    rows="5"
                    required
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    placeholder="例：電気の柵の前でハンマーを拾った時"
                    className={error?.steps ? 'is-invalid' : ''} // クラス名を動的に設定
                    aria-describedby={error?.steps ? "steps-error" : undefined} // エラーメッセージと関連付け
                    aria-invalid={error?.steps ? "true" : "false"} // エラー状態を示す
                />
                {/* 再現手順のエラーメッセージ */}
                {error?.steps && <p id="steps-error" className="error-message">{error.steps}</p>}
            </div>
            {/* --- ★期待した動作 (Textarea)★ --- */}
            <div className="form-group">
                <label htmlFor="expectedBehavior">期待した動作 (任意)</label>
                <textarea
                    id="expectedBehavior"
                    name="expectedBehavior" // Netlifyで認識される名前
                    rows="3" // 再現手順より少し短くても良いでしょう
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    placeholder="例: ハンマーがアイテム欄に追加される"
                // ★ placeholderの色を薄くするために globals.css を変更済みと仮定
                />
            </div>
            {/* --- スクリーンショット入力 --- */}
            <div className="form-group">
                <label htmlFor="screenshot-button">スクリーンショット (任意)</label>

                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px', marginBottom: '10px' }}>
                    最大10MBまでの画像ファイル (PNG, JPG, GIF) を添付できます。
                    <br />
                    <strong style={{ color: '#e0e0e0' }}>
                        もし動画を提供いただける場合は、お手数ですが
                        {/* ここがリンクです */}
                        <a
                            href="mailto:lv1norasubosutomohigara@gmail.com"
                            style={{
                                color: '#60a5fa', /* 明るい青色 */
                                textDecoration: 'underline' /* 下線 */
                            }}
                        >
                            lv1norasubosutomohigara@gmail.com
                        </a>
                        まで直接お送りください。
                    </strong>
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


            {/* ★★★ 補足情報のセクション ★★★ */}
            <div className="form-group">
                <label htmlFor="message-bug">補足情報 (任意)</label> {/* ラベルを変更 */}

                {/* ★ 前回のラッパーやimgタグは削除し、textareaだけに戻します ★ */}
                <textarea id="message-bug" name="message" rows="5" value={message} onChange={(e) => setMessage(e.target.value)} /> {/* requiredを削除 */}
            </div>

            {/* --- ★ゲームバージョン (Input Text)★ --- */}
            <div className="form-group">
                <label htmlFor="gameVersion">ゲームバージョン (任意)</label>
                <input
                    type="text"
                    id="gameVersion"
                    name="gameVersion" // Netlifyで認識される名前
                    value={gameVersion}
                    onChange={(e) => setGameVersion(e.target.value)}
                    placeholder="例: v1.0.1"
                />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px' }}>ゲームのタイトル画面の右下などに表示されています (例: v1.0.1)</p>
            {/* --- ★OS (Input Text)★ --- */}
            <div className="form-group">
                <label htmlFor="os">OS (任意)</label>
                <input
                    type="text"
                    id="os"
                    name="os" // Netlifyで認識される名前
                    value={operatingSystem}
                    onChange={(e) => setOperatingSystem(e.target.value)}
                    placeholder="例: Windows 11 Home"
                />
            </div>

            {/* --- ★PCスペック (Textarea)★ --- */}
            <div className="form-group">
                <label htmlFor="pcSpecs">PCスペック (任意)</label>
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px', marginBottom: '10px' }}>
                    可能であれば、CPU・GPU (グラフィックボード)・RAM (メモリ) をご記入ください。
                    <br />
                    (Windows: 「DxDiag」コマンド, Mac: 「このMacについて」で確認できます)
                </p>
                <textarea
                    id="pcSpecs"
                    name="pcSpecs" // Netlifyで認識される名前
                    rows="4"
                    value={pcSpecs}
                    onChange={(e) => setPcSpecs(e.target.value)}
                    placeholder={
                        `例:
CPU: Intel Core i7-12700
GPU: NVIDIA GeForce RTX 3070
RAM: 32GB`
                    }
                />
            </div>

            {/* --- ★↓ ここから追加 ↓★ --- */}
            {/* --- ★連絡先 (Input Text)★ --- */}
            <div className="form-group">
                <label htmlFor="contactInfo">連絡先 (任意)</label>
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px', marginBottom: '10px' }}>
                    バグの詳細について開発者から連絡する場合があります。
                </p>
                <input
                    type="text"
                    id="contactInfo"
                    name="contactInfo" // Netlifyで認識される名前
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="例: user@example.com または Twitter ID: @username"
                />
            </div>

            {/* --- ★同意チェックボックス★ --- */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                    type="checkbox"
                    id="consent"
                    name="consent" // Netlifyで認識される名前
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    style={{ width: 'auto', height: 'auto', margin: 0 }} // スタイルを調整
                />
                {/* チェックボックスの隣に配置し、マージンをリセット */}
                <label htmlFor="consent" style={{ marginBottom: 0, fontWeight: 'normal' }}>
                    上記連絡先に開発者が連絡することに同意します。
                </label>
            </div>

            {/* バリデーションエラーメッセージ */}
            {error?.form && (
                <p
                    id="form-error-message" // IDは残しても良い
                    className="error-message"
                    role="alert"
                >
                    {error.form}
                </p>
            )}
           <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
        <Recaptcha
          ref={recaptchaRef}
          // ★ 環境変数からサイトキーを読み込み
          sitekey={process.env.NEXT_PUBLIC_SITE_RECAPTCHA_KEY || ''}
          // ★ 検証成功時にトークンを state にセット
          onChange={(token) => setRecaptchaToken(token)}
          // ★ 期限切れ時に state をリセット
          onExpired={() => setRecaptchaToken(null)} 
        />
      </div>
            
            {/* 送信ボタン */}
            <div className="form-group">
                <button type="submit" className="cta-button" disabled={submissionStatus === 'submitting'}>
                    {submissionStatus === 'submitting' ? '送信中...' : '報告を送信する'}
                </button>
            </div>
            {/* ★★★ GIF画像をフォームの最後に追加 ★★★ */}
            {/* (publicフォルダに move.gif を配置してください) */}

            {/* move.gifを常に表示 */}
            <img
                src="/move.gif"
                alt="decorative animation"
                className="character-move"
            />

            {/* 発生頻度が「必ず発生する」の場合にkomarigao.pngを表示 */}
            {frequency === 'always' && (
                <img src="/komarigao.png" alt="decorative animation" className="character-komari" />
            )}

            {/* 深刻度が「クラッシュする」の場合にkomarigao2.pngを表示 */}
            {severity === 'crash' && (
                <img
                    src="/komarigao2.png"
                    alt="decorative animation"
                    className="character-komari2"
                />
            )}
           {submissionStatus === 'submitting' && (
        <img
          src="/transmission-unscreen.gif" /* ★ 新しいファイル名 */
          alt="Submitting..."
          className="character-transmission" /* ★ CSSクラスで制御 */
        />
      )}
        </form>
    );
}