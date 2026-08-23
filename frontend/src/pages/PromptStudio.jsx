import { useState } from 'react';
import { generateFromPrompt, updatePromptUI } from '../services/api';
import PreviewSandbox from '../components/PreviewSandbox';
import CodeViewer from '../components/CodeViewer';

const INSPIRATIONS = [
  'SaaS Landing Page with Pricing',
  'Minimalist Coffee Shop Menu',
  'Developer Analytics Dashboard',
  'Creative Agency Portfolio Hero'
];

export default function PromptStudio() {
  const [prompt, setPrompt] = useState('');
  const [refinePrompt, setRefinePrompt] = useState('');
  const [jsx, setJsx] = useState('');
  const [css, setCss] = useState('');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('preview');
  const [viewport, setViewport] = useState('desktop');

  // Require meaningful input: at least 8 characters and at least 2 words
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

              {error && <div className="error-msg">{error}</div>}
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
            {tab === 'jsx' && <CodeViewer code={jsx} label="Generated React JSX" />}
            {tab === 'css' && <CodeViewer code={css} label="Generated CSS" />}
          </div>

          {jsx && (
            <form className="refine-bar" onSubmit={refine}>
              <input 
                className="refine-input"
                value={refinePrompt} 
                onChange={(e) => setRefinePrompt(e.target.value)} 
                placeholder="Refine: e.g. Make the CTA button larger, change accent color to muted teal..." 
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
