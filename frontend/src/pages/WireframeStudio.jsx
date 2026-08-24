import { useState } from 'react';
import { generateFromWireframe, updatePromptUI } from '../services/api';
import PreviewSandbox from '../components/PreviewSandbox';
import CodeViewer from '../components/CodeViewer';
import VisualElementEditor from '../components/VisualElementEditor';

const PRESETS = [
  'E-commerce Hero with Cards',
  'Minimalist Agency Portfolio',
  'SaaS 3-Tier Pricing Grid',
  'Fitness Workout Landing Page'
];

const DEMO_WIREFRAME_JSX = `function GeneratedPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "960px", margin: "0 auto", fontFamily: "Georgia, serif", color: "#161c1b" }}>
      <header style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.1em", color: "#2a6f6f", marginBottom: "8px", fontWeight: "bold" }}>
        PRECISION COFFEE GRINDER — DEMO PRESET
      </header>
      <h1 style={{ fontSize: "2.4rem", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
        Crafted for Coffee Connoisseurs
      </h1>
      <p style={{ fontSize: "1.1rem", color: "#5c5952", maxWidth: "600px", lineHeight: "1.6", marginBottom: "24px" }}>
        Experience uniform extraction with stepless ceramic burrs and ultra-quiet motor engineering.
      </p>
      <div style={{ display: "flex", gap: "12px", marginBottom: "40px" }}>
        <button style={{ padding: "12px 24px", background: "#2a6f6f", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Order Now — $249
        </button>
        <button style={{ padding: "12px 24px", background: "transparent", color: "#161c1b", border: "1px solid #d6d0c4", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Explore Specifications
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <div style={{ padding: "20px", background: "#fffdf8", border: "1px solid #d6d0c4", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>Ceramic Burrs</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#5c5952" }}>Zero heat transfer during grinding.</p>
        </div>
        <div style={{ padding: "20px", background: "#fffdf8", border: "1px solid #d6d0c4", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>Stepless Dial</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#5c5952" }}>Micron-level espresso precision.</p>
        </div>
        <div style={{ padding: "20px", background: "#fffdf8", border: "1px solid #d6d0c4", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>Whisper Quiet</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#5c5952" }}>Low-RPM high-torque motor.</p>
        </div>
      </div>
    </div>
  );
}`;

export default function WireframeStudio() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [refinePrompt, setRefinePrompt] = useState('');
  const [jsx, setJsx] = useState('');
  const [css, setCss] = useState('');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('preview'); // 'preview' | 'editor' | 'jsx' | 'css'
  const [viewport, setViewport] = useState('desktop');

  const canGenerate = !loading && !!file;

  const generate = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please upload or drop a wireframe image first.'); return; }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('wireframe', file);
      formData.append('prompt', prompt);
      const { data } = await generateFromWireframe(formData);
      if (!data.ok) throw new Error(data.error);
      setJsx(data.jsx);
      setCss(data.css || '');
      setTab('editor');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const loadInstantDemo = () => {
    setJsx(DEMO_WIREFRAME_JSX);
    setCss('');
    setError('');
    setTab('editor');
  };

  const refine = async (e) => {
    e.preventDefault();
    if (!refinePrompt.trim()) return;
    setRefining(true);
    setError('');
    try {
      const { data } = await updatePromptUI(jsx, css, refinePrompt);
      if (!data.ok) throw new Error(data.error);
      setJsx(data.jsx);
      setCss(data.css || '');
      setRefinePrompt('');
      setTab('editor');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setRefining(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="workspace-wrapper">
      <div className="workspace">
        
        {/* Left Panel: Blueprint Generator */}
        <section className="blueprint-panel">
          <div className="blueprint-card">
            <div className="blueprint-header">
              <span className="eyebrow">WIREFRAME / REACT</span>
              <h2>From sketch<br /><em>to component.</em></h2>
            </div>

            <form onSubmit={generate} className="blueprint-form">
              <div className="field-group">
                <label className="field-label">Wireframe Sketch (Required)</label>
                <div 
                  className="dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => !file && document.getElementById('wireframe-input').click()}
                >
                  {file ? (
                    <div className="dropzone-preview-container">
                      <img src={URL.createObjectURL(file)} alt="Wireframe preview" className="dropzone-preview" />
                      <button 
                        type="button" 
                        className="dropzone-clear" 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        title="Remove image"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div className="dropzone-content">
                      <svg className="dropzone-svg" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span className="dropzone-label">Drop sketch here or browse</span>
                      <span className="dropzone-sublabel">PNG, JPG, WEBP up to 10MB</span>
                    </div>
                  )}
                  <input 
                    id="wireframe-input" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} 
                    hidden 
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Design Directives (Optional)</label>
                <textarea 
                  className="field-textarea"
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  rows="3" 
                  placeholder="e.g., Clean typography, muted teal accents, modern card grid..." 
                />
              </div>

              <div className="field-group">
                <label className="field-label">Quick Starters</label>
                <div className="preset-chips">
                  {PRESETS.map((p, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      className="preset-chip" 
                      onClick={() => setPrompt(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="action-btn" disabled={!canGenerate}>
                {loading ? 'Generating Component...' : 'Generate React Component'}
              </button>

              <div className={`btn-hint ${canGenerate ? 'ready' : ''}`}>
                {!file ? (
                  'Upload a wireframe sketch to enable generation'
                ) : (
                  <span>✓ Sketch loaded & ready for AI generation</span>
                )}
              </div>

              {/* Instant Demo Bypass Button when Gemini Rate Limit (429) occurs */}
              {error && (
                <div className="error-msg">
                  <div>{error}</div>
                  <button 
                    type="button" 
                    className="action-btn" 
                    onClick={loadInstantDemo}
                    style={{ marginTop: '0.6rem', background: '#2a6f6f', color: '#fff', width: '100%' }}
                  >
                    ⚡ Load Demo Layout (Bypass API Wait)
                  </button>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Right Panel: Live Stage */}
        <section className="live-stage">
          <header className="stage-header">
            <div className="stage-tabs">
              <button 
                className={`stage-tab ${tab === 'preview' ? 'active' : ''}`} 
                onClick={() => setTab('preview')}
              >
                Live Preview
              </button>
              <button 
                className={`stage-tab ${tab === 'editor' ? 'active' : ''}`} 
                onClick={() => setTab('editor')}
              >
                ✏️ Visual Hand Editor
              </button>
              <button 
                className={`stage-tab ${tab === 'jsx' ? 'active' : ''}`} 
                onClick={() => setTab('jsx')}
              >
                React JSX
              </button>
              <button 
                className={`stage-tab ${tab === 'css' ? 'active' : ''}`} 
                onClick={() => setTab('css')}
              >
                CSS
              </button>
            </div>

            <div className="stage-actions">
              <div className="viewport-toggles">
                <button 
                  className={`viewport-btn ${viewport === 'desktop' ? 'active' : ''}`} 
                  onClick={() => setViewport('desktop')} 
                  title="Desktop View"
                >
                  Desktop
                </button>
                <button 
                  className={`viewport-btn ${viewport === 'mobile' ? 'active' : ''}`} 
                  onClick={() => setViewport('mobile')} 
                  title="Mobile View"
                >
                  Mobile
                </button>
              </div>
            </div>
          </header>

          <div className="stage-body">
            {tab === 'preview' && <PreviewSandbox jsx={jsx} css={css} viewport={viewport} />}
            {tab === 'editor' && (
              <div className="integrated-editor-layout">
                <VisualElementEditor jsx={jsx} onJsxChange={setJsx} />
                <div className="integrated-editor-preview">
                  <PreviewSandbox jsx={jsx} css={css} viewport={viewport} />
                </div>
              </div>
            )}
            {tab === 'jsx' && <CodeViewer code={jsx} label="React JSX Component" />}
            {tab === 'css' && <CodeViewer code={css} label="Styles (CSS)" />}
          </div>

          {jsx && (
            <form className="refine-bar" onSubmit={refine}>
              <input 
                className="refine-input"
                value={refinePrompt} 
                onChange={(e) => setRefinePrompt(e.target.value)} 
                placeholder="Message AI for prompt tweaks, or switch to Visual Hand Editor above to edit text boxes directly..." 
              />
              <button type="submit" className="refine-btn" disabled={refining || !refinePrompt.trim()}>
                {refining ? 'Updating...' : 'Tweak Current UI'}
              </button>
            </form>
          )}
        </section>

      </div>
    </div>
  );
}
