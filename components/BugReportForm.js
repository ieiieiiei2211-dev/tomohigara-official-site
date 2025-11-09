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

export default function BugReportForm({ dict, lang}) {
    // --- State定義 ---
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [screenshots, setScreenshots] = useState([]);
    const [submissionStatus, setSubmissionStatus] = useState('idle'); // ★ 'submitting' から 'idle' に戻しました
    const [error, setError] = useState({}); 
    const [frequency, setFrequency] = useState(''); 
    const [severity, setSeverity] = useState('');   
    const [steps, setSteps] = useState('');         
    const [expectedBehavior, setExpectedBehavior] = useState(''); 
    const [gameVersion, setGameVersion] = useState(''); 
    const [contactInfo, setContactInfo] = useState(''); 
    const [consent, setConsent] = useState(false);       
    const [operatingSystem, setOperatingSystem] = useState(''); 
    const [pcSpecs, setPcSpecs] = useState('');                 
    const [gameLog, setGameLog] = useState('');                 

  // --- Ref定義 ---
  const fileInputRef = useRef(null); 
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  // --- スクリーンショット関連の関数 ---
    const handleFiles = (files) => {
        const rawFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (rawFiles.length === 0) return;

        const validFiles = []; 
        let sizeError = false; 

        rawFiles.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                sizeError = true;
            } else {
                validFiles.push(file);
            }
        });

        // 合計枚数チェック
        if (screenshots.length + validFiles.length > 10) {
            setError(prev => ({ ...prev, file: dict.error_file_limit })); // ★ 辞書
            if (fileInputRef.current) { fileInputRef.current.value = ''; }
            return;
        }

        // ファイルサイズチェック
        if (sizeError) {
            // ★ 辞書 (エラーメッセージを結合)
            const fileSizeError = `${dict.error_file_size} ${validFiles.length > 0 ? dict.error_file_size_partial : ''}`;
            setError(prev => ({ ...prev, file: fileSizeError }));
        } else {
            setError(prev => {
                const { file, ...rest } = prev;
                return rest;
            });
        }

        if (validFiles.length === 0) {
            if (fileInputRef.current) { fileInputRef.current.value = ''; }
            return;
        }

        const newScreenshotPromises = validFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onerror = () => {
                    console.error("FileReader error");
                    resolve(null);
                };
                reader.onload = (e) => resolve({ file, previewUrl: e.target.result });
                reader.readAsDataURL(file);
            });
        });

        Promise.all(newScreenshotPromises).then(newScreenshots => {
            const validScreenshots = newScreenshots.filter(s => s !== null);
            setScreenshots(prev => [...prev, ...validScreenshots]);
        });
    };

    const handleDeleteScreenshot = (indexToDelete) => {
        const screenshotToDelete = screenshots[indexToDelete];
        if (screenshotToDelete?.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(screenshotToDelete.previewUrl);
        }
        setScreenshots(prev => prev.filter((_, index) => index !== indexToDelete));
    };

    const clearScreenshots = () => {
        screenshots.forEach(s => {
            if (s.previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(s.previewUrl)
            }
        });
        setScreenshots([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const handlePaste = (event) => {
            handleFiles(event.clipboardData.files);
        };
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('paste', handlePaste);
            screenshots.forEach(s => {
                if (s.previewUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(s.previewUrl);
                }
            });
        };
    }, [screenshots, dict]); // ★ dict を依存配列に追加

  // --- 送信処理 ---
    const handleSubmit = (event) => {
        console.log("handleSubmitが実行されました！");
        event.preventDefault();
        if (!recaptchaToken) {
          setError(prev => ({ ...prev, form: dict.error_recaptcha })); // ★ 辞書
          return;
        }
        
        const errors = {}; 
        if (frequency === '') {
            errors.frequency = dict.error_frequency_required; // ★ 辞書
        }
        if (severity === '') {
            errors.severity = dict.error_severity_required; // ★ 辞書
        }
        if (steps.trim() === '') {
            errors.steps = dict.error_steps_required; // ★ 辞書
        }

        if (Object.keys(errors).length > 0) {
            console.log("エラーをセットしました:", errors);
            setError(errors); 
        } else {
            setError({});
            setSubmissionStatus('submitting');

            const formData = new FormData();
            formData.append('form-name', 'game-bug-report');
            formData.append('name', name);
            formData.append('message', message);
            formData.append('frequency', frequency);
            formData.append('severity', severity);
            formData.append('steps', steps);
            formData.append('expectedBehavior', expectedBehavior); 
            formData.append('message', message); 
            formData.append('gameVersion', gameVersion);
            formData.append('os', operatingSystem);
            formData.append('pcSpecs', pcSpecs);
            formData.append('contactInfo', contactInfo); 
            formData.append('consent', consent);       
            formData.append('g-recaptcha-response', recaptchaToken);
            // ★ language は <input type="hidden"> で送信されます

            if (screenshots.length > 0) {
                screenshots.forEach(({ file }) => {
                    formData.append('screenshot', file);
                });
            }
            
      const fetchPromise = fetch("/", { method: "POST", body: formData })
        .then(response => {
          if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
          }
          return response; 
        });

      // ★ 500ms から 3000ms (3秒) に変更
      const minimumDisplayTimePromise = new Promise(resolve => {
        setTimeout(resolve, 3000); 
      });

      Promise.all([fetchPromise, minimumDisplayTimePromise])
        .then(([fetchResponse]) => {
          setSubmissionStatus('success');
          
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
          setSubmissionStatus('error');
          console.error("フォーム送信エラー:", fetchError); 

          if (fetchError.message.startsWith('サーバーエラー')) {
            setError({ form: dict.error_server }); // ★ 辞書
          } else {
            setError({ form: dict.error_network }); // ★ 辞書
          }
          setRecaptchaToken(null);
          recaptchaRef.current?.reset();
        });
        } 
    }

        
  // --- 送信成功時の表示 ---
if (submissionStatus === 'success') {
    return (
      <div className="submission-success" style={{ textAlign: 'center' }}>
        <h3>{dict.submit_success_title}</h3>
        <p>{dict.submit_success_message}</p>
        <button
          type="button"
          onClick={() => setSubmissionStatus('idle')}
          className="cta-button" 
          style={{width:'auto', marginTop:'20px'}}
        >
          {dict.submit_another_button} {/* ★ 辞書 */}
        </button>
      </div>
    );
  }

  // --- 通常時・送信中・エラー時のフォーム表示 ---
    return (
       <form name="game-bug-report" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit} encType="multipart/form-data">
            <input type="hidden" name="form-name" value="game-bug-report" />
            <input type="hidden" name="language" value={lang} />
            <p className="hidden" style={{ display: 'none' }}>
                <label>
                    Don’t fill this out if you’re human: <input name="bot-field" />
                </label>
            </p>
      
      {/* --- ★発生頻度 (Select Box)★ --- */}
      <div className="form-group">
        <label htmlFor="frequency">{dict.frequency_label}</label>
        <select
          id="frequency"
          name="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          required
          className={error?.frequency ? 'is-invalid' : ''}
          aria-invalid={error?.frequency ? "true" : "false"}
        >
          <option value="" disabled>{dict.frequency_placeholder}</option>
          <option value="always">{dict.frequency_always}</option>
          <option value="sometimes">{dict.frequency_sometimes}</option>
          <option value="once">{dict.frequency_once}</option>
        </select>
        {error?.frequency && <p id="frequency-error" className="error-message">{error.frequency}</p>}
      </div>

      {/* --- ★深刻度 (Select Box)★ --- */}
      <div className="form-group">
        <label htmlFor="severity">{dict.severity_label}</label>
        <select
          id="severity"
          name="severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          required
          className={error?.severity ? 'is-invalid' : ''}
          aria-invalid={error?.severity ? "true" : "false"}
        >
          <option value="" disabled>{dict.severity_placeholder}</option>
          <option value="crash">{dict.severity_crash}</option>
          <option value="blocking">{dict.severity_blocking}</option>
          <option value="minor">{dict.severity_minor}</option>
          <option value="suggestion">{dict.severity_suggestion}</option>
        </select>
        {error?.severity && <p id="severity-error" className="error-message">{error.severity}</p>}
      </div>

      {/* --- ★再現手順 (Textarea)★ --- */}
      <div className="form-group">
        <label htmlFor="steps">{dict.steps_label}</label>
        <textarea
          id="steps"
          name="steps"
          rows="5"
          required
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder={dict.steps_placeholder} 
          className={error?.steps ? 'is-invalid' : ''}
          aria-invalid={error?.steps ? "true" : "false"}
        />
        {error?.steps && <p id="steps-error" className="error-message">{error.steps}</p>}
      </div>

      {/* --- ★期待した動作 (Textarea)★ --- */}
      <div className="form-group">
        <label htmlFor="expectedBehavior">{dict.expected_label}</label>
        <textarea
          id="expectedBehavior"
          name="expectedBehavior"
          rows="3"
          value={expectedBehavior}
          onChange={(e) => setExpectedBehavior(e.target.value)}
          placeholder={dict.expected_placeholder} 
        />
      </div>
            {/* --- スクリーンショット入力 --- */}
            <div className="form-group">
                <label htmlFor="screenshot-button">{dict.screenshot_label}</label>

                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px', marginBottom: '10px' }}>
                    {dict.screenshot_desc_1}
                    <br />
                    <strong style={{ color: '#e0e0e0' }}>
                        {dict.screenshot_desc_2}
                        <a
                            href="mailto:lv1norasubosutomohigara@gmail.com"
                            style={{
                                color: '#60a5fa', 
                                textDecoration: 'underline' 
                            }}
                        >
                            lv1norasubosutomohigara@gmail.com
                        </a>
                         {dict.screenshot_desc_3}
                    </strong>
                </p>

                <div className="screenshot-input-wrapper">
                    <input
                        type="file"
                        id="screenshot-input"
                        name="screenshot" 
                        accept="image/png, image/jpeg, image/gif"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        multiple 
                        onChange={(e) => handleFiles(e.target.files)} 
                    />
                    <button
                        type="button"
                        id="screenshot-button"
                        className="cta-button file-select-button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ width: 'auto', marginBottom: '10px' }}
                    >
                        {dict.screenshot_button}
                    </button>

                    <div className="paste-area">
                        {screenshots.length > 0 ? (
                            screenshots.map((screenshot, index) => (
                                <div key={index} className="preview-item">
                                    <img
                                        src={screenshot.previewUrl}
                                        alt={`Screenshot preview ${index + 1}`}
                                        className="pasted-image-preview"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteScreenshot(index)} 
                                        className="delete-preview-button"
                                        aria-label={dict.screenshot_delete_aria.replace('{index}', index + 1)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="paste-area-placeholder">{dict.screenshot_paste_placeholder}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="message-bug">{dict.message_label}</label>
                <textarea id="message-bug" name="message" rows="5" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            <div className="form-group">
                <label htmlFor="gameVersion">{dict.version_label}</label>
                <input
                    type="text"
                    id="gameVersion"
                    name="gameVersion" 
                    value={gameVersion}
                    onChange={(e) => setGameVersion(e.target.value)}
                    placeholder={dict.version_placeholder}
                />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px' }}>{dict.version_desc}</p>
            
            <div className="form-group">
                <label htmlFor="os">{dict.os_label}</label>
                <input
                    type="text"
                    id="os"
                    name="os" 
                    value={operatingSystem}
                    onChange={(e) => setOperatingSystem(e.target.value)}
                    placeholder={dict.os_placeholder}
                />
            </div>

            <div className="form-group">
                <label htmlFor="pcSpecs">{dict.specs_label}</label>
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px', marginBottom: '10px' }}>
                    {dict.specs_desc_1}
                    <br />
                    {dict.specs_desc_2}
                </p>
                <textarea
                    id="pcSpecs"
                    name="pcSpecs" 
                    rows="4"
                    value={pcSpecs}
                    onChange={(e) => setPcSpecs(e.target.value)}
                    placeholder={dict.specs_placeholder.replace(/\\n/g, '\n')}
                />
            </div>

            <div className="form-group">
                <label htmlFor="contactInfo">{dict.contact_label}</label>
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '-5px', marginBottom: '10px' }}>
                    {dict.contact_desc}
                </p>
                <input
                    type="text"
                    id="contactInfo"
                    name="contactInfo" 
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder={dict.contact_placeholder}
                />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                    type="checkbox"
                    id="consent"
                    name="consent" 
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    style={{ width: 'auto', height: 'auto', margin: 0 }} 
                />
                <label htmlFor="consent" style={{ marginBottom: 0, fontWeight: 'normal' }}>
                    {dict.consent_label}
                </label>
            </div>

            {error?.form && (
                <p
                    id="form-error-message" 
                    className="error-message"
                    role="alert"
                >
                    {error.form}
                </p>
            )}
           <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
        <Recaptcha
          ref={recaptchaRef}
          sitekey={process.env.NEXT_PUBLIC_SITE_RECAPTCHA_KEY || ''}
          onChange={(token) => setRecaptchaToken(token)}
          onExpired={() => setRecaptchaToken(null)} 
        />
      </div>
            
            <div className="form-group">
        <button type="submit" className="cta-button" disabled={submissionStatus === 'submitting'}>
          {submissionStatus === 'submitting' ? dict.submitting_button : dict.submit_button}
        </button>
      </div>

      {/* 
        <img
            src="/move.gif"
            alt="decorative animation"
            className="character-move"
        />
        {frequency === 'always' && (
            <img src="/komarigao.png" alt="decorative animation" className="character-komari" />
        )}
        {severity === 'crash' && (
            <img
                src="/komarigao2.png"
                alt="decorative animation"
                className="character-komari2"
            />
        )}
        {submissionStatus === 'submitting' && (
          <img
            src="/transmission-unscreen.gif" 
            alt="Submitting..."
            className="character-transmission" 
          />
        )}
      */}
        </form>
    );
}