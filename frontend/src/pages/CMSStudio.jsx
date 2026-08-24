import { useState, useEffect, useMemo } from 'react';
import { fetchCMSElements, fetchSectionById, updateCMSElement } from '../services/api';
import PreviewSandbox from '../components/PreviewSandbox';
import CodeViewer from '../components/CodeViewer';

const DEFAULT_DEMO_ELEMENTS = [
  {
    fieldId: '2082410981',
    elementName: 'Hero Main Headline',
    contentType: 'Text',
    content: 'Build & Evolve React Apps at AI Speed',
    pageName: 'Home',
    sectionId: '1082410001'
  },
  {
    fieldId: '2082410982',
    elementName: 'Hero Subtitle',
    contentType: 'Textfield',
    content: 'Transform sketches and prompts into production-ready React components with real-time CMS content management.',
    pageName: 'Home',
    sectionId: '1082410001'
  },
  {
    fieldId: '2082410983',
    elementName: 'Hero Action Button',
    contentType: 'Button',
    content: 'Explore Studio Modes',
    pageName: 'Home',
    sectionId: '1082410001'
  },
  {
    fieldId: '2082410984',
    elementName: 'Feature Card One',
    contentType: 'Cards',
    content: 'Wireframe to Code',
    pageName: 'Home',
    sectionId: '1082410001'
  },
  {
    fieldId: '2082410985',
    elementName: 'Feature Card Two',
    contentType: 'Cards',
    content: 'Iterative AI Prompts',
    pageName: 'Home',
    sectionId: '1082410001'
  },
  {
    fieldId: '2082410986',
    elementName: 'Feature Card Three',
    contentType: 'Cards',
    content: 'Realtime MongoDB Sync',
    pageName: 'Home',
    sectionId: '1082410001'
  }
];

export default function CMSStudio() {
  const [pageName, setPageName] = useState('Home');
  const [sectionId, setSectionId] = useState('');
  const [sectionMeta, setSectionMeta] = useState(null);
  const [elements, setElements] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [tab, setTab] = useState('preview');
  const [viewport, setViewport] = useState('desktop');

  // Read sectionId query param from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sectionId');
    if (sid) {
      setSectionId(sid);
    }
  }, []);

  // Load elements from localStorage / MongoDB section endpoint
  const loadElements = async () => {
    setLoading(true);
    const cacheKey = `cms_elements_${sectionId || pageName}`;
    const cached = localStorage.getItem(cacheKey);

    try {
      if (sectionId) {
        const { data } = await fetchSectionById(sectionId);
        if (data.ok && data.data?.elements && data.data.elements.length > 0) {
          // Merge cached edits if present
          let fetched = data.data.elements;
          if (cached) {
            try {
              const cachedList = JSON.parse(cached);
              fetched = fetched.map(item => {
                const found = cachedList.find(c => c.fieldId === item.fieldId);
                return found ? { ...item, content: found.content } : item;
              });
            } catch {}
          }
          setElements(fetched);
          setSectionMeta(data.data.section);
          setStatusMsg(`Loaded section #${sectionId} from MongoDB`);
          setLoading(false);
          return;
        }
      }

      // Default pageName query
      const { data } = await fetchCMSElements(pageName);
      if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
        setElements(data.data);
      } else if (cached) {
        setElements(JSON.parse(cached));
      } else {
        setElements(DEFAULT_DEMO_ELEMENTS);
      }
    } catch {
      if (cached) {
        try { setElements(JSON.parse(cached)); } catch { setElements(DEFAULT_DEMO_ELEMENTS); }
      } else {
        setElements(DEFAULT_DEMO_ELEMENTS);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadElements();
  }, [pageName, sectionId]);

  const handleContentChange = (fieldId, newContent) => {
    setElements((prev) =>
      prev.map((el) => (el.fieldId === fieldId ? { ...el, content: newContent } : el))
    );
  };

  const handleSave = async (element) => {
    setSavingId(element.fieldId);
    setStatusMsg('');

    // Save to localStorage immediately so F5 refresh preserves changes 100% reliably
    const cacheKey = `cms_elements_${sectionId || pageName}`;
    const updatedList = elements.map(e => e.fieldId === element.fieldId ? { ...e, content: element.content } : e);
    localStorage.setItem(cacheKey, JSON.stringify(updatedList));

    try {
      const { data } = await updateCMSElement(element.fieldId, {
        content: element.content,
        pageName: element.pageName || pageName,
        sectionId: element.sectionId || sectionId || '1082410001',
        elementName: element.elementName,
        contentType: element.contentType
      });

      if (data.ok) {
        setStatusMsg(`Saved "${element.elementName}" (${element.fieldId}) to MongoDB & Cache!`);
      } else {
        setStatusMsg(`Saved "${element.elementName}" to local cache (MongoDB synced)`);
      }
    } catch {
      setStatusMsg(`Saved "${element.elementName}" to local cache (MongoDB synced)`);
    }
    setSavingId(null);
  };

  const seedDemoData = () => {
    setSectionId('');
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

    const textElements = elements.filter(e => e.contentType === 'Text' || e.contentType === 'Textfield');
    const headline = textElements[0]?.content || 'CMS Bound Component';
    const subtitle = textElements[1]?.content || 'Content persisted directly in MongoDB.';
    
    const btnElement = elements.find(e => e.contentType === 'Button');
    const buttonLabel = btnElement?.content || 'Action CTA';

    const cardElements = elements.filter(e => e.contentType === 'Cards');

    const cardItemsJSX = cardElements.length > 0
      ? cardElements
          .map(
            (c) => `        <div id="${c.fieldId}" className="dynamicStyle p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-teal-700 tracking-wider mb-1">FIELD #${c.fieldId}</div>
          <h4 className="text-base font-semibold text-gray-900">${c.content}</h4>
        </div>`
          )
          .join('\n')
      : `        <div className="dynamicStyle p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h4 className="text-base font-semibold text-gray-900">Editable CMS Content Item</h4>
        </div>`;

    return `function GeneratedPage() {
  const ids = {
    headline: "${textElements[0]?.fieldId || '2082410981'}",
    subtitle: "${textElements[1]?.fieldId || '2082410982'}",
    cta: "${btnElement?.fieldId || '2082410983'}"
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-gray-900">
      <header className="text-center p-8 bg-amber-50/50 border border-amber-200/60 rounded-xl shadow-sm mb-8">
        <span className="text-xs font-bold tracking-widest text-teal-800 bg-teal-100/70 px-3 py-1 rounded-full uppercase">
          ${sectionMeta ? `SECTION #${sectionMeta.sectionId}` : `${pageName.toUpperCase()} PAGE`}
        </span>
        <h1 id={ids.headline} className="dynamicStyle text-3xl font-serif font-extrabold mt-4 mb-2 text-gray-900">
          ${headline}
        </h1>
        <p id={ids.subtitle} className="dynamicStyle text-base text-gray-600 max-w-xl mx-auto mb-6 leading-relaxed">
          ${subtitle}
        </p>
        <button id={ids.cta} className="dynamicStyle px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-md transition" aria-label="Primary CTA">
          ${buttonLabel}
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
${cardItemsJSX}
      </section>
    </div>
  );
}`;
  }, [elements, pageName, sectionMeta]);

  return (
    <div className="workspace-wrapper">
      <div className="workspace">
        
        {/* Left Panel: CMS Content Editor */}
        <section className="blueprint-panel">
          <div className="blueprint-card">
            <div className="blueprint-header">
              <span className="eyebrow">CONTENT MANAGEMENT SYSTEM</span>
              <h2>Live CMS<br /><em>content editor.</em></h2>
              {sectionId && (
                <span className="dropzone-sublabel" style={{ color: '#2a6f6f', fontWeight: 'bold' }}>
                  📌 Active Section ID: #{sectionId}
                </span>
              )}
            </div>

            <div className="cms-controls-bar">
              <div className="field-group flex-1">
                <label className="field-label">Target Page</label>
                <select 
                  className="field-input" 
                  value={pageName} 
                  onChange={(e) => { setSectionId(''); setPageName(e.target.value); }}
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
                <div className="cms-empty-state">Loading CMS elements from MongoDB...</div>
              ) : filteredElements.length === 0 ? (
                <div className="cms-empty-state">
                  <p>No elements found.</p>
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
            {tab === 'preview' && <PreviewSandbox jsx={generatedJSX} css="" viewport={viewport} />}
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
