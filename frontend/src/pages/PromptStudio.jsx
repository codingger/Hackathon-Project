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
  const ids = {
    headlineMain: "2082410981",
    subheading: "2082410982",
    ctaButton: "2082410983"
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-gray-900">
      <header className="text-center p-8 bg-amber-50/50 border border-amber-200/60 rounded-xl shadow-sm mb-8">
        <span className="text-xs font-bold tracking-widest text-teal-800 bg-teal-100/70 px-3 py-1 rounded-full uppercase">
          CREATIVE AGENCY PORTFOLIO — DEMO PRESET
        </span>
        <h1 id={ids.headlineMain} className="dynamicStyle text-3xl font-serif font-extrabold mt-4 mb-2 text-gray-900">
          We Design Digital Experiences That Scale
        </h1>
        <p id={ids.subheading} className="dynamicStyle text-base text-gray-600 max-w-xl mx-auto mb-6 leading-relaxed">
          Transforming complex brand challenges into intuitive, high-converting digital products.
        </p>
        <button id={ids.ctaButton} className="dynamicStyle px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-md transition" aria-label="Start a Project CTA">
          Start a Project
        </button>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="dynamicStyle p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">UI/UX Architecture</h3>
          <p className="text-xs text-gray-600">Research-backed design systems.</p>
        </div>
        <div className="dynamicStyle p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">React Engineering</h3>
          <p className="text-xs text-gray-600">Blazing fast component architecture.</p>
        </div>
        <div className="dynamicStyle p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">Brand Strategy</h3>
          <p className="text-xs text-gray-600">Positioning for market leadership.</p>
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
  const [sectionId, setSectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('preview');
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
      setSectionId(data.sectionId || '');
      setTab('editor');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const loadInstantDemo = () => {
    setJsx(DEMO_PROMPT_JSX);
    setCss('');
    setSectionId('1082410001');
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
              {sectionId && (
                <a 
                  href={`/cms?sectionId=${sectionId}`}
                  className="preset-chip" 
                  style={{ background: '#2a6f6f', color: '#fff', textDecoration: 'none', border: 'none' }}
                >
                  ⚙️ Open in CMS Studio (#{sectionId})
                </a>
              )}
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
