import { useState, useEffect, useMemo } from 'react';
import { fetchCMSElements, updateCMSElement } from '../services/api';
import PreviewSandbox from '../components/PreviewSandbox';
import CodeViewer from '../components/CodeViewer';

const DEFAULT_DEMO_ELEMENTS = [
  {
    fieldId: 'hero_title_1',
    elementName: 'Hero Main Headline',
    contentType: 'Text',
    content: 'Build & Evolve React Apps at AI Speed',
    pageName: 'Home',
    sectionId: 'sec_hero'
  },
  {
    fieldId: 'hero_subtitle_1',
    elementName: 'Hero Subtitle',
    contentType: 'Textfield',
    content: 'Transform sketches and prompts into production-ready React components with real-time CMS content management.',
    pageName: 'Home',
    sectionId: 'sec_hero'
  },
  {
    fieldId: 'hero_cta_btn',
    elementName: 'Hero Action Button',
    contentType: 'Button',
    content: 'Explore Studio Modes',
    pageName: 'Home',
    sectionId: 'sec_hero'
  },
  {
    fieldId: 'feature_card_1',
    elementName: 'Feature Card One',
    contentType: 'Cards',
    content: 'Wireframe to Code',
    pageName: 'Home',
    sectionId: 'sec_features'
  },
  {
    fieldId: 'feature_card_2',
    elementName: 'Feature Card Two',
    contentType: 'Cards',
    content: 'Iterative AI Prompts',
    pageName: 'Home',
    sectionId: 'sec_features'
  },
  {
    fieldId: 'feature_card_3',
    elementName: 'Feature Card Three',
    contentType: 'Cards',
    content: 'Realtime MongoDB Sync',
    pageName: 'Home',
    sectionId: 'sec_features'
  }
];

export default function CMSStudio() {
  const [pageName, setPageName] = useState('Home');
  const [elements, setElements] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [tab, setTab] = useState('preview');
  const [viewport, setViewport] = useState('desktop');

  // Load elements from MongoDB backend or fallback to demo items
  const loadElements = async () => {
    setLoading(true);
    try {
      const { data } = await fetchCMSElements(pageName);
      if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
        setElements(data.data);
      } else {
        // Database is empty or disconnected, use fallback demo elements
        setElements(DEFAULT_DEMO_ELEMENTS.filter(e => e.pageName === pageName));
      }
    } catch {
      setElements(DEFAULT_DEMO_ELEMENTS.filter(e => e.pageName === pageName));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadElements();
  }, [pageName]);

  const handleContentChange = (fieldId, newContent) => {
    setElements((prev) =>
      prev.map((el) => (el.fieldId === fieldId ? { ...el, content: newContent } : el))
    );
  };

  const handleSave = async (element) => {
    setSavingId(element.fieldId);
    setStatusMsg('');
    try {
      const { data } = await updateCMSElement(element.fieldId, {
        content: element.content,
        pageName: element.pageName
      });
      if (data.ok) {
        setStatusMsg(`Saved "${element.elementName}" successfully!`);
      } else {
        setStatusMsg(`Updated locally (MongoDB offline)`);
      }
    } catch {
      setStatusMsg(`Updated locally (MongoDB offline)`);
    }
    setSavingId(null);
  };

  const seedDemoData = () => {
    setElements(DEFAULT_DEMO_ELEMENTS);
    setStatusMsg('Demo CMS elements loaded into studio!');
  };

  const filteredElements = useMemo(() => {
    if (!search.trim()) return elements;
    const s = search.toLowerCase();
    return elements.filter(
      (el) =>
        el.elementName.toLowerCase().includes(s) ||
        el.fieldId.toLowerCase().includes(s) ||
        el.content.toLowerCase().includes(s)
    );
  }, [elements, search]);

  // Construct dynamic React JSX & CSS from current CMS elements state for live preview
  const generatedJSX = useMemo(() => {
    if (!elements || elements.length === 0) return '';

    const heroTitle = elements.find((e) => e.fieldId === 'hero_title_1')?.content || 'CMS Studio Page';
    const heroSubtitle = elements.find((e) => e.fieldId === 'hero_subtitle_1')?.content || 'Manage website content live.';
    const heroBtn = elements.find((e) => e.fieldId === 'hero_cta_btn')?.content || 'Get Started';
    const cards = elements.filter((e) => e.contentType === 'Cards');

    const cardItemsJSX = cards
      .map(
        (c) => `<div className="cms-card">
          <div className="cms-card-badge">CMS ITEM</div>
          <h4>${c.content}</h4>
          <p>Field ID: <code>${c.fieldId}</code></p>
        </div>`
      )
      .join('\n');

    return `function GeneratedPage() {
  return (
    <div className="cms-demo-wrapper">
      <header className="cms-demo-hero">
        <span className="cms-tag">${pageName.toUpperCase()} PAGE</span>
        <h1>${heroTitle}</h1>
        <p>${heroSubtitle}</p>
        <button className="cms-demo-btn">${heroBtn}</button>
      </header>

      <section className="cms-demo-grid">
        ${cardItemsJSX || '<div className="cms-card"><h4>Editable CMS Content Card</h4></div>'}
      </section>
    </div>
  );
}`;
  }, [elements, pageName]);

  const generatedCSS = `
.cms-demo-wrapper { padding: 40px 24px; max-width: 900px; margin: 0 auto; font-family: Georgia, serif; color: #161c1b; }
.cms-demo-hero { text-align: center; padding: 40px 20px; background: #fffdf8; border: 1px solid #d6d0c4; border-radius: 8px; box-shadow: 4px 4px 0 #d0ddd8; margin-bottom: 30px; }
.cms-tag { font: 700 0.65rem system-ui, sans-serif; letter-spacing: 0.12em; color: #2a6f6f; background: rgba(42, 111, 111, 0.1); padding: 3px 8px; border-radius: 4px; }
.cms-demo-hero h1 { font-size: 2.2rem; margin: 12px 0 8px; color: #161c1b; letter-spacing: -0.02em; }
.cms-demo-hero p { font-size: 1.05rem; color: #5c5952; max-width: 580px; margin: 0 auto 20px; line-height: 1.5; }
.cms-demo-btn { padding: 12px 24px; font: 700 0.8rem system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; background: #2a6f6f; color: #fff; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(42, 111, 111, 0.25); }
.cms-demo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.cms-card { background: #fffdf8; border: 1px solid #d6d0c4; border-radius: 8px; padding: 20px; text-align: center; }
.cms-card-badge { font: 700 0.6rem system-ui, sans-serif; color: #8a847a; letter-spacing: 0.08em; margin-bottom: 6px; }
.cms-card h4 { margin: 4px 0; font-size: 1.1rem; color: #161c1b; }
.cms-card p { font-size: 0.75rem; color: #8a847a; margin: 4px 0 0; }
.cms-card code { background: #ebe6db; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
`;

  return (
    <div className="workspace-wrapper">
      <div className="workspace">
        
        {/* Left Panel: CMS Content Editor */}
        <section className="blueprint-panel">
          <div className="blueprint-card">
            <div className="blueprint-header">
              <span className="eyebrow">CONTENT MANAGEMENT SYSTEM</span>
              <h2>Live CMS<br /><em>content editor.</em></h2>
            </div>

            <div className="cms-controls-bar">
              <div className="field-group flex-1">
                <label className="field-label">Target Page</label>
                <select 
                  className="field-input" 
                  value={pageName} 
                  onChange={(e) => setPageName(e.target.value)}
                >
                  <option value="Home">Home Page</option>
                  <option value="Landing">Landing Page</option>
                  <option value="Pricing">Pricing Page</option>
                </select>
              </div>

              <div className="field-group flex-1">
                <label className="field-label">Filter Elements</label>
                <input 
                  type="text" 
                  className="field-input" 
                  placeholder="Search field ID or content..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
            </div>

            {statusMsg && <div className="btn-hint ready">{statusMsg}</div>}

            <div className="cms-elements-list">
              {loading ? (
                <div className="cms-empty-state">Loading CMS elements from database...</div>
              ) : filteredElements.length === 0 ? (
                <div className="cms-empty-state">
                  <p>No elements found for page "{pageName}".</p>
                  <button type="button" className="preset-chip" onClick={seedDemoData} style={{ marginTop: '0.8rem' }}>
                    + Load Demo Page Elements
                  </button>
                </div>
              ) : (
                filteredElements.map((el) => (
                  <div key={el.fieldId} className="cms-element-card">
                    <div className="cms-element-header">
                      <span className="cms-element-name">{el.elementName}</span>
                      <span className="cms-type-badge">{el.contentType}</span>
                    </div>

                    <div className="cms-field-meta">
                      <span>Field ID: <code>{el.fieldId}</code></span>
                    </div>

                    <div className="cms-field-body">
                      {el.contentType === 'Textfield' ? (
                        <textarea 
                          className="field-textarea" 
                          rows="3" 
                          value={el.content} 
                          onChange={(e) => handleContentChange(el.fieldId, e.target.value)} 
                        />
                      ) : (
                        <input 
                          type="text" 
                          className="field-input" 
                          value={el.content} 
                          onChange={(e) => handleContentChange(el.fieldId, e.target.value)} 
                        />
                      )}
                    </div>

                    <button 
                      type="button" 
                      className="copy-btn" 
                      onClick={() => handleSave(el)} 
                      disabled={savingId === el.fieldId}
                      style={{ alignSelf: 'flex-end', marginTop: '0.4rem' }}
                    >
                      {savingId === el.fieldId ? 'Saving...' : 'Save & Sync'}
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </section>

        {/* Right Panel: Synchronized Live Preview & Inspector */}
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
                className={`stage-tab ${tab === 'json' ? 'active' : ''}`} 
                onClick={() => setTab('json')}
              >
                Content Data (JSON)
              </button>
              <button 
                className={`stage-tab ${tab === 'jsx' ? 'active' : ''}`} 
                onClick={() => setTab('jsx')}
              >
                React Integration
              </button>
            </div>

            {tab === 'preview' && (
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
            )}
          </header>

          <div className="stage-body">
            {tab === 'preview' && <PreviewSandbox jsx={generatedJSX} css={generatedCSS} viewport={viewport} />}
            {tab === 'json' && (
              <CodeViewer 
                code={JSON.stringify(elements, null, 2)} 
                label={`MongoDB CMS Records (${elements.length} items)`} 
              />
            )}
            {tab === 'jsx' && <CodeViewer code={generatedJSX} label="Dynamic React Integration Code" />}
          </div>
        </section>

      </div>
    </div>
  );
}
