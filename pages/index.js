import { useState, useRef, useCallback } from "react";
import Head from "next/head";

const fileToDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

function UploadZone({ dataUrl, label, icon, hint, onFile, onClear, inputRef, height = 200 }) {
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; }}
      />
      {!dataUrl ? (
        <div
          className="zone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="zone-icon">{icon}</div>
          <div className="zone-text">
            <strong>{label}</strong>
            <span>{hint}</span>
            <small>JPG · PNG · WEBP</small>
          </div>
        </div>
      ) : (
        <div className="preview">
          <img src={dataUrl} alt={label} style={{ height }} />
          <button className="clear-btn" onClick={onClear}>×</button>
          <div className="preview-tag">{label} · ready ✓</div>
        </div>
      )}
    </>
  );
}

export default function CrownAid() {
  const [userPhoto,  setUserPhoto]  = useState(null);
  const [wigPhoto,   setWigPhoto]   = useState(null);
  const [wigUrl,     setWigUrl]     = useState("");
  const [urlStatus,  setUrlStatus]  = useState(null);
  const [stage,      setStage]      = useState("idle");
  const [wigDesc,    setWigDesc]    = useState(null);
  const [resultImg,  setResultImg]  = useState(null);
  const [analysis,   setAnalysis]   = useState(null);
  const [error,      setError]      = useState(null);
  const userRef = useRef();
  const wigRef  = useRef();

  const handleUserFile = useCallback(async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setUserPhoto(await fileToDataUrl(file));
    setResultImg(null); setAnalysis(null); setError(null);
  }, []);

  const handleWigFile = useCallback(async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setWigPhoto(await fileToDataUrl(file));
    setUrlStatus(null); setResultImg(null); setAnalysis(null); setError(null);
  }, []);

  const handleUrlLoad = useCallback(async () => {
    if (!wigUrl.trim()) return;
    setUrlStatus("loading");
    try {
      const resp = await fetch(wigUrl.trim());
      const blob = await resp.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not-image");
      setWigPhoto(await fileToDataUrl(blob));
      setUrlStatus("ok");
    } catch {
      setUrlStatus("cors");
    }
  }, [wigUrl]);

  const stages = [
    { key: "analyzing_wig", label: "Claude reading your wig…" },
    { key: "transforming",  label: "AI applying style to your face…" },
    { key: "consulting",    label: "Writing your consultation…" },
  ];
  const stageIdx  = stages.findIndex(s => s.key === stage);
  const isLoading = stageIdx >= 0;

  const onAnalyze = useCallback(async () => {
    if (!userPhoto || !wigPhoto) return;
    setError(null); setResultImg(null); setAnalysis(null); setWigDesc(null);

    try {
      // Step 1: analyze wig
      setStage("analyzing_wig");
      const wigRes = await fetch("/api/analyze-wig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wigDataUrl: wigPhoto }),
      });
      if (!wigRes.ok) throw new Error(await wigRes.text());
      const desc = await wigRes.json();
      setWigDesc(desc);

      // Step 2: transform
      setStage("transforming");
      const txRes = await fetch("/api/hair-transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userDataUrl: userPhoto, wigDataUrl: wigPhoto, wigDesc: desc }),
      });
      if (!txRes.ok) throw new Error(await txRes.text());
      const { resultUrl } = await txRes.json();
      setResultImg(resultUrl);

      // Step 3: consultation
      setStage("consulting");
      const cRes = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userDataUrl: userPhoto, wigDataUrl: wigPhoto, wigSummary: desc.style_summary }),
      });
      if (!cRes.ok) throw new Error(await cRes.text());
      const { consultation } = await cRes.json();
      setAnalysis(consultation);
      setStage("done");

    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong — please try again.");
      setStage("idle");
    }
  }, [userPhoto, wigPhoto]);

  const reset = () => {
    setStage("idle"); setResultImg(null); setAnalysis(null);
    setWigPhoto(null); setWigDesc(null); setUrlStatus(null); setWigUrl(""); setError(null);
  };

  const ready = userPhoto && wigPhoto;

  return (
    <>
      <Head>
        <title>CrownAid — Virtual Wig Try-On</title>
        <meta name="description" content="Try any wig on your photo. AI-powered style consultation for women with medical hair loss." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="wrap">
        <header className="hdr">
          <div className="logo-mark">👑</div>
          <div>
            <div className="logo-name">CrownAid</div>
            <div className="logo-sub">Virtual Try-On Studio</div>
          </div>
          <div className="logo-badge">✨ AI-Powered</div>
        </header>

        <main className="main">
          <h1 className="page-title">See the wig<br /><em>on your face.</em></h1>
          <p className="page-sub">
            Upload your selfie + any wig image. AI reads the wig style and applies it
            directly to your photo — then gives you a full personalized consultation.
          </p>

          {stage === "idle" && (
            <div className="how">
              <div className="how-step"><b>1</b>Upload selfie</div>
              <div className="how-step"><b>2</b>Upload wig photo</div>
              <div className="how-step"><b>3</b>AI reads the style</div>
              <div className="how-step"><b>4</b>See it on your face</div>
            </div>
          )}

          {/* Upload grid — always rendered */}
          <div className="grid" style={{ display: isLoading || stage === "done" ? "none" : "grid" }}>
            <div className="panel">
              <div className="panel-label">📸 Your Photo</div>
              <UploadZone
                dataUrl={userPhoto} label="Your selfie" icon="🤳"
                hint="Front-facing works best"
                onFile={handleUserFile}
                onClear={() => { setUserPhoto(null); setResultImg(null); setAnalysis(null); }}
                inputRef={userRef} height={200}
              />
            </div>

            <div className="panel">
              <div className="panel-label">💇‍♀️ Wig Image</div>
              <div className="url-label">Paste a product URL</div>
              <div className="url-row">
                <input className="url-input" type="url" placeholder="https://wigs.com/product/..."
                  value={wigUrl}
                  onChange={(e) => { setWigUrl(e.target.value); setUrlStatus(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlLoad()} />
                <button className="url-btn" onClick={handleUrlLoad}
                  disabled={!wigUrl.trim() || urlStatus === "loading"}>
                  {urlStatus === "loading" ? "…" : "Load"}
                </button>
              </div>
              {urlStatus === "ok"   && <div className="pill ok">✓ Loaded from URL</div>}
              {urlStatus === "cors" && <div className="pill warn">URL saved · upload image below</div>}

              <div className="url-label" style={{ marginTop: 12 }}>Or upload wig image directly</div>
              <UploadZone
                dataUrl={wigPhoto} label="Wig image" icon="💇‍♀️"
                hint="Save from any product page"
                onFile={handleWigFile}
                onClear={() => { setWigPhoto(null); setUrlStatus(null); setResultImg(null); setAnalysis(null); }}
                inputRef={wigRef} height={145}
              />
            </div>
          </div>

          {!isLoading && stage !== "done" && (
            <>
              <button className="analyze-btn" disabled={!ready} onClick={onAnalyze}>
                👑 {ready ? "Apply Wig & Get Consultation" : "Upload your photo + a wig to continue"}
              </button>
              {ready && <p className="analyze-note">Claude reads the wig · AI applies it to your face · Full consultation follows</p>}
            </>
          )}

          {error && <div className="error-pill">⚠ {error}</div>}

          {isLoading && (
            <div className="loading">
              <span className="loading-crown">👑</span>
              <div className="loading-title">{stages[stageIdx]?.label}</div>
              <div className="loading-sub">Takes about 20–40 seconds — hang tight</div>
              <div className="progress-bar" />
              <div className="stage-list">
                {stages.map((s, i) => {
                  const status = i < stageIdx ? "done" : i === stageIdx ? "active" : "pending";
                  return (
                    <div key={s.key} className={`stage-row ${status}`}>
                      <div className="stage-dot" />
                      {status === "done" ? "✓ " : ""}{s.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stage === "done" && (
            <>
              {wigDesc && (
                <div className="wig-chip">
                  💇‍♀️ <strong>Wig detected:</strong> {wigDesc.hairstyle_description} · {wigDesc.color_description}
                </div>
              )}

              {resultImg && (
                <>
                  <div className="section-label">✨ Your Try-On Result</div>
                  <div className="result-wrap">
                    <img src={resultImg} alt="Your wig try-on" />
                    <div className="result-badge">✨ CrownAid Try-On</div>
                  </div>
                </>
              )}

              {analysis && (
                <div className="result-panel">
                  <div className="result-header">
                    <span className="result-header-icon">✨</span>
                    <div>
                      <h3>Your Style Consultation</h3>
                      <p>Personalized · CrownAid AI Stylist</p>
                    </div>
                  </div>
                  <div className="result-body">
                    <div className="result-text" dangerouslySetInnerHTML={{
                      __html: analysis
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\n/g, "<br/>")
                    }} />
                    <div className="insurance-nudge">
                      <span>💼</span>
                      <div>
                        <strong>INSURANCE REMINDER</strong><br />
                        This wig may qualify as a <strong>Cranial Prosthesis</strong> (HCPCS A9282).
                        Use CrownAid's Insurance Letter Generator to create your Letter of Medical Necessity in minutes.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="action-row">
                <button className="action-btn primary" onClick={reset}>👑 Try Another Wig</button>
                {resultImg && (
                  <button className="action-btn ghost" onClick={() => window.open(resultImg, "_blank")}>⬇️ Save Photo</button>
                )}
                {analysis && (
                  <button className="action-btn ghost" onClick={() => navigator.clipboard?.writeText(analysis)}>📋 Copy Consultation</button>
                )}
                <button className="action-btn ghost" onClick={() => { reset(); setUserPhoto(null); }}>↺ Start Over</button>
              </div>
            </>
          )}

          {!userPhoto && !wigPhoto && stage === "idle" && (
            <div className="empty">
              <div className="empty-icon">👑</div>
              <p>Upload your selfie and a wig image to get started.<br />Works with any retailer — Wigs.com, Amazon, UniWigs, and more.</p>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0F0818; --mid: #1A0F28;
          --gold: #C9A84C; --gl: #E8C97A; --gd: rgba(201,168,76,.12); --gb: rgba(201,168,76,.25);
          --rose: #C97A9A; --cream: #F5EFE6; --muted: rgba(245,239,230,.45); --ok: #7AC9A0;
        }
        body { background: var(--bg); color: var(--cream); font-family: 'DM Sans', sans-serif; }
        .wrap { min-height: 100vh; background: radial-gradient(ellipse at 20% 0%, #3D2455 0%, #1A0F28 55%, #0F0818 100%); }

        /* Header */
        .hdr { padding: 18px 24px; border-bottom: 1px solid var(--gb); display: flex; align-items: center; gap: 11px; }
        .logo-mark { width: 33px; height: 33px; border-radius: 50%; background: linear-gradient(135deg, var(--gold), var(--rose)); display: flex; align-items: center; justify-content: center; font-size: 15px; }
        .logo-name { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 600; color: var(--gl); letter-spacing: .04em; }
        .logo-sub { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
        .logo-badge { margin-left: auto; background: var(--gd); border: 1px solid var(--gb); border-radius: 20px; padding: 3px 12px; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); }

        /* Main */
        .main { padding: 24px; max-width: 820px; margin: 0 auto; }
        .page-title { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 300; line-height: 1.15; margin-bottom: 6px; }
        .page-title em { font-style: italic; color: var(--gl); }
        .page-sub { font-size: 12px; color: var(--muted); line-height: 1.65; margin-bottom: 22px; max-width: 480px; }

        /* How it works */
        .how { display: flex; margin-bottom: 22px; border: 1px solid var(--gb); border-radius: 11px; overflow: hidden; }
        .how-step { flex: 1; padding: 11px 12px; text-align: center; border-right: 1px solid var(--gb); font-size: 10px; color: var(--muted); line-height: 1.5; }
        .how-step:last-child { border-right: none; }
        .how-step b { display: block; color: var(--gold); font-size: 15px; margin-bottom: 3px; }

        /* Grid */
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 16px; }
        @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
        .panel { background: rgba(255,255,255,.03); border: 1px solid var(--gb); border-radius: 12px; padding: 17px; position: relative; overflow: hidden; }
        .panel::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: .28; }
        .panel-label { font-size: 9px; letter-spacing: .17em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .panel-label::after { content: ''; flex: 1; height: 1px; background: var(--gb); }

        /* Zone */
        .zone { border: 1.5px dashed var(--gb); border-radius: 9px; padding: 20px 12px; text-align: center; cursor: pointer; transition: all .2s; background: rgba(255,255,255,.02); }
        .zone:hover { border-color: var(--gold); background: var(--gd); }
        .zone-icon { font-size: 22px; margin-bottom: 7px; }
        .zone-text { font-size: 11px; color: var(--muted); line-height: 1.6; display: flex; flex-direction: column; gap: 2px; }
        .zone-text strong { color: var(--cream); font-weight: 500; font-size: 12px; }
        .zone-text small { font-size: 10px; }

        /* Preview */
        .preview { position: relative; border-radius: 9px; overflow: hidden; background: #0F0818; }
        .preview img { width: 100%; object-fit: cover; display: block; }
        .clear-btn { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,.8); border: 1px solid var(--gb); color: var(--cream); font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
        .clear-btn:hover { background: rgba(201,122,154,.6); }
        .preview-tag { position: absolute; bottom: 0; left: 0; right: 0; padding: 15px 10px 7px; background: linear-gradient(transparent, rgba(10,5,20,.9)); font-size: 9px; color: var(--muted); letter-spacing: .05em; }

        /* URL */
        .url-label { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
        .url-row { display: flex; gap: 6px; }
        .url-input { flex: 1; background: rgba(255,255,255,.05); border: 1px solid var(--gb); border-radius: 8px; padding: 9px 11px; color: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 11px; outline: none; transition: border-color .2s; }
        .url-input::placeholder { color: rgba(245,239,230,.2); }
        .url-input:focus { border-color: var(--gold); }
        .url-btn { background: var(--gd); border: 1px solid var(--gb); border-radius: 8px; padding: 9px 12px; color: var(--gold); font-size: 10px; font-family: 'DM Sans', sans-serif; cursor: pointer; white-space: nowrap; transition: all .2s; }
        .url-btn:hover { background: var(--gold); color: var(--mid); }
        .url-btn:disabled { opacity: .4; cursor: not-allowed; }
        .pill { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 10px; margin-top: 7px; }
        .pill.ok { background: rgba(122,201,160,.1); border: 1px solid rgba(122,201,160,.3); color: var(--ok); }
        .pill.warn { background: rgba(201,168,76,.1); border: 1px solid var(--gb); color: var(--gold); }

        /* Analyze btn */
        .analyze-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--gold), #A8722A); border: none; border-radius: 10px; color: var(--mid); font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 600; letter-spacing: .05em; cursor: pointer; transition: all .25s; margin-bottom: 9px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .analyze-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(201,168,76,.28); }
        .analyze-btn:disabled { opacity: .35; cursor: not-allowed; transform: none; }
        .analyze-note { text-align: center; font-size: 10px; color: var(--muted); margin-bottom: 4px; }
        .error-pill { background: rgba(201,122,122,.1); border: 1px solid rgba(201,122,122,.3); color: #C97A7A; padding: 8px 14px; border-radius: 8px; font-size: 11px; margin-top: 8px; }

        /* Loading */
        .loading { text-align: center; padding: 32px 20px; }
        .loading-crown { font-size: 34px; display: block; animation: float 2s ease-in-out infinite; margin-bottom: 12px; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        .loading-title { font-family: 'Cormorant Garamond', serif; font-size: 17px; color: var(--gl); margin-bottom: 4px; }
        .loading-sub { font-size: 11px; color: var(--muted); }
        .progress-bar { width: 150px; height: 2px; background: var(--gb); border-radius: 2px; margin: 12px auto 0; overflow: hidden; }
        .progress-bar::after { content: ''; display: block; height: 100%; width: 40%; background: var(--gold); border-radius: 2px; animation: sweep 1.4s ease-in-out infinite; }
        @keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        .stage-list { display: flex; flex-direction: column; gap: 7px; margin-top: 16px; text-align: left; max-width: 280px; margin-left: auto; margin-right: auto; }
        .stage-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
        .stage-row.done { color: var(--ok); }
        .stage-row.active { color: var(--gl); }
        .stage-row.pending { color: rgba(245,239,230,.22); }
        .stage-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .stage-row.active .stage-dot { animation: pulse 1s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

        /* Results */
        .section-label { font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
        .wig-chip { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--gd); border: 1px solid var(--gb); border-radius: 9px; margin-bottom: 13px; font-size: 11px; color: var(--gl); }
        .result-wrap { border-radius: 12px; overflow: hidden; margin-bottom: 15px; border: 1px solid var(--gb); position: relative; background: #0F0818; text-align: center; }
        .result-wrap img { max-width: 100%; max-height: 500px; object-fit: contain; display: block; margin: 0 auto; }
        .result-badge { position: absolute; top: 9px; left: 9px; background: rgba(0,0,0,.72); border: 1px solid var(--gb); border-radius: 20px; padding: 3px 11px; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); }
        .result-panel { background: rgba(255,255,255,.03); border: 1px solid var(--gb); border-radius: 12px; overflow: hidden; margin-bottom: 15px; animation: fadeUp .4s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .result-header { padding: 14px 18px; background: linear-gradient(135deg, rgba(201,168,76,.1), rgba(201,122,154,.07)); border-bottom: 1px solid var(--gb); display: flex; align-items: center; gap: 10px; }
        .result-header-icon { font-size: 22px; }
        .result-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 600; color: var(--gl); margin-bottom: 1px; }
        .result-header p { font-size: 10px; color: var(--muted); }
        .result-body { padding: 18px; }
        .result-text { font-size: 12px; line-height: 1.85; color: rgba(245,239,230,.85); }
        .result-text strong { color: var(--gl); font-weight: 500; }
        .insurance-nudge { padding: 12px 15px; background: rgba(122,201,160,.06); border: 1px solid rgba(122,201,160,.2); border-radius: 9px; margin-top: 14px; display: flex; align-items: flex-start; gap: 9px; font-size: 11px; line-height: 1.6; color: rgba(245,239,230,.75); }
        .insurance-nudge strong { color: var(--ok); font-size: 10px; letter-spacing: .05em; }

        /* Actions */
        .action-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .action-btn { flex: 1; min-width: 100px; padding: 10px 13px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 11px; cursor: pointer; transition: all .2s; text-align: center; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .action-btn.primary { background: var(--gd); border: 1px solid var(--gold); color: var(--gl); }
        .action-btn.primary:hover { background: var(--gold); color: var(--mid); }
        .action-btn.ghost { background: transparent; border: 1px solid var(--gb); color: var(--muted); }
        .action-btn.ghost:hover { border-color: var(--gold); color: var(--cream); }

        /* Empty */
        .empty { text-align: center; padding: 36px 20px; color: var(--muted); }
        .empty-icon { font-size: 34px; margin-bottom: 10px; opacity: .3; }
        .empty p { font-size: 12px; line-height: 1.7; }
      `}</style>
    </>
  );
}
