import { useState } from 'react';
import { generateFromPrompt, updatePromptUI } from '../services/api';
import PreviewSandbox from '../components/PreviewSandbox';
import CodeViewer from '../components/CodeViewer';
import VisualElementEditor from '../components/VisualElementEditor';

const INSPIRATIONS = [
  'SaaS Landing Page with Pricing',
  'Minimalist Coffee Shop Menu',
  'Developer Analytics Dashboard',
  'Creative Agency Portfolio Hero'
];

const DEMO_PROMPT_JSX = `function GeneratedPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "960px", margin: "0 auto", fontFamily: "Georgia, serif", color: "#161c1b" }}>
      <header style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.1em", color: "#2a6f6f", marginBottom: "8px", fontWeight: "bold" }}>
        CREATIVE AGENCY PORTFOLIO — DEMO PRESET
      </header>
      <h1 style={{ fontSize: "2.4rem", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
        We Design Digital Experiences That Scale
      </h1>
      <p style={{ fontSize: "1.1rem", color: "#5c5952", maxWidth: "600px", lineHeight: "1.6", marginBottom: "24px" }}>
        Transforming complex brand challenges into intuitive, high-converting digital products.
      </p>
      <div style={{ display: "flex", gap: "12px", marginBottom: "40px" }}>
        <button style={{ padding: "12px 24px", background: "#2a6f6f", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Start a Project
        </button>
        <button style={{ padding: "12px 24px", background: "transparent", color: "#161c1b", border: "1px solid #d6d0c4", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          View Recent Case Studies
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <div style={{ padding: "20px", background: "#fffdf8", border: "1px solid #d6d0c4", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>UI/UX Architecture</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#5c5952" }}>Research-backed design systems.</p>
        </div>
        <div style={{ padding: "20px", background: "#fffdf8", border: "1px solid #d6d0c4", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>React Engineering</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#5c5952" }}>Blazing fast component architecture.</p>
        </div>
        <div style={{ padding: "20px", background: "#fffdf8", border: "1px solid #d6d0c4", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>Brand Strategy</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#5c5952" }}>Positioning for market leadership.</p>
        </div>
      </div>
    </div>
  );
}`;

export default function PromptStudio() {
  const [prompt, setPrompt] = useState('');
  const [refinePrompt, setRefinePrompt] = useState('');
  const [jsx, setJsx] = useState('');
  const [css, setCss] = useState('');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('preview'); // 'preview' | 'editor' | 'jsx' | 'css'
  const [viewport, setViewport] = useState('desktop');

  const isMeaningfulPrompt = prompt.trim().length >= 8 && prompt.trim().split(/\s+/).filter(Boolean).length >= 2;
  const canGenerate = !loading && isMeaningfulPrompt;

  const generate = async (e) => {
    e.preventDefault();
    if (!isMeaningfulPrompt) { 
      setError('Please provide a brief description with at least a few words.'); 
      return; 
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await generateFromPrompt(prompt);
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
    setJsx(DEMO_PROMPT_JSX);
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

  return (
    <div className="workspace-wrapper">
      <div className="workspace">
        
        {/* Left Panel: Prompt Composer */}
        <section className="blueprint-panel">
          <div className="blueprint-card">
            <div className="blueprint-header">
              <span className="eyebrow">PROMPT / UI</span>
              <h2>Describe it.<br /><em>We build it.</em></h2>
            </div>

            <form onSubmit={generate} className="blueprint-form">
              <div className="field-group">
                <label className="field-label">UI Blueprint Description</label>
                <textarea 
                  className="field-textarea"
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  rows="5" 
                  placeholder="Example: Create a modern landing page for a developer tool with a hero banner, feature cards, and a get started button..." 
                />
              </div>

              <div className="field-group">
                <label className="field-label">Quick Starters</label>
                <div className="preset-chips">
                  {INSPIRATIONS.map((item, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      className="preset-chip" 
                      onClick={() => setPrompt(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="action-btn" disabled={!canGenerate}>
                {loading ? 'Crafting UI Layout...' : 'Generate UI'}
              </button>

              <div className={`btn-hint ${canGenerate ? 'ready' : ''}`}>
                {!prompt.trim() ? (
                  'Describe your UI or pick a quick starter to enable generation'
                ) : !isMeaningfulPrompt ? (
                  'Add a few words describing what you want to build'
                ) : (
                  <span>✓ Blueprint ready for AI generation</span>
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
                  title="Desktop"
                >
                  Desktop
                </button>
                <button 
                  className={`viewport-btn ${viewport === 'mobile' ? 'active' : ''}`} 
                  onClick={() => setViewport('mobile')} 
                  title="Mobile"
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
            {tab === 'jsx' && <CodeViewer code={jsx} label="Generated React JSX" />}
            {tab === 'css' && <CodeViewer code={css} label="Generated CSS" />}
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
