import { useState } from 'react';
import { generateFromWireframe, updatePromptUI } from '../services/api';
import PreviewSandbox from '../components/PreviewSandbox';
import CodeViewer from '../components/CodeViewer';

const PRESETS = [
  'E-commerce Hero with Cards',
  'Minimalist Agency Portfolio',
  'SaaS 3-Tier Pricing Grid',
  'Fitness Workout Landing Page'
];

export default function WireframeStudio() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [refinePrompt, setRefinePrompt] = useState('');
  const [jsx, setJsx] = useState('');
  const [css, setCss] = useState('');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('preview');
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
      setTab('preview');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
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
      setTab('preview');
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
        
        {/* Left Panel: Blueprint */}
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

              {error && <div className="error-msg">{error}</div>}
            </form>
          </div>

          {/* Tweak / Refine Section once generated */}
          {jsx && (
            <div className="blueprint-card" style={{ marginTop: '1rem' }}>
              <div className="blueprint-header">
                <span className="eyebrow">TWEAK GENERATED UI BY PROMPT</span>
                <h3 style={{ fontSize: '1.2rem', margin: '0.2rem 0', color: 'var(--text-main)' }}>Refine Layout with Prompts</h3>
              </div>
              <form onSubmit={refine} className="blueprint-form">
                <div className="field-group">
                  <textarea 
                    className="field-textarea"
                    value={refinePrompt} 
                    onChange={(e) => setRefinePrompt(e.target.value)} 
                    rows="3" 
                    placeholder="e.g. Add a pricing section below the features, change button to teal..." 
                  />
                </div>
                <button type="submit" className="action-btn" disabled={refining || !refinePrompt.trim()}>
                  {refining ? 'Applying Changes...' : 'Apply Prompt Changes'}
                </button>
              </form>
            </div>
          )}
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
            {tab === 'jsx' && <CodeViewer code={jsx} label="React JSX Component" />}
            {tab === 'css' && <CodeViewer code={css} label="Styles (CSS)" />}
          </div>

          {jsx && (
            <form className="refine-bar" onSubmit={refine}>
              <input 
                className="refine-input"
                value={refinePrompt} 
                onChange={(e) => setRefinePrompt(e.target.value)} 
                placeholder="Refine prompt: e.g. Add pricing section, change background color..." 
              />
              <button type="submit" className="refine-btn" disabled={refining || !refinePrompt.trim()}>
                {refining ? 'Updating...' : 'Refine UI'}
              </button>
            </form>
          )}
        </section>

      </div>
    </div>
  );
}
