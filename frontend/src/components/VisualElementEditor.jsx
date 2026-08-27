import { useState, useMemo } from 'react';

export default function VisualElementEditor({ jsx, onJsxChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  // Extract all editable text elements from JSX (including empty tags so boxes don't vanish)
  const elements = useMemo(() => {
    if (!jsx) return [];
    const items = [];
    // Match HTML tags like <h1>...</h1>, <button>...</button>, etc. (allowing empty text)
    const regex = /<(h[1-6]|p|button|a|span|li|strong|em|td|th)[^>]*>([^<>{}+]*)<\/\1>/gi;
    let match;
    let index = 0;
    while ((match = regex.exec(jsx)) !== null) {
      const tag = match[1].toLowerCase();
      const text = match[2];
      // Skip React code, functions, and empty decorative span/container tags
      const isDecorativeSpan = tag === 'span' && text.trim().length === 0;
      if (!text.includes('React.') && !text.includes('function') && !isDecorativeSpan) {
        items.push({
          id: `el_${index++}`,
          tag: tag,
          text: text,
          fullMatch: match[0]
        });
      }
    }
    return items;
  }, [jsx]);

  const filteredElements = useMemo(() => {
    if (!search.trim()) return elements;
    const s = search.toLowerCase();
    return elements.filter(
      (el) => el.text.toLowerCase().includes(s) || el.tag.toLowerCase().includes(s)
    );
  }, [elements, search]);

  // Handle live text edits (keeps box even if text is empty)
  const handleTextChange = (item, newText) => {
    if (!jsx) return;
    const oldFullMatch = item.fullMatch;
    if (!oldFullMatch) return;

    // Construct new tag match: <tag attr...>newText</tag>
    const openingTagMatch = oldFullMatch.match(/^<[a-z0-9]+[^>]*>/i);
    if (!openingTagMatch) return;

    const openingTag = openingTagMatch[0];
    const closingTag = `</${item.tag}>`;
    const newFullMatch = `${openingTag}${newText}${closingTag}`;

    if (oldFullMatch === newFullMatch) return;

    const updatedJsx = jsx.replace(oldFullMatch, newFullMatch);

    // Update item reference for live typing continuity
    item.fullMatch = newFullMatch;
    item.text = newText;

    onJsxChange(updatedJsx);
  };

  // Explicitly delete element from React JSX when Trash Icon is clicked
  const handleDeleteElement = (item, e) => {
    e.stopPropagation();
    if (!jsx || !item.fullMatch) return;
    const updatedJsx = jsx.replace(item.fullMatch, '');
    onJsxChange(updatedJsx);
  };

  // Add new element to React JSX
  const handleAddElement = (tagType) => {
    if (!jsx) return;
    let newElementTag = '';
    if (tagType === 'heading') newElementTag = '<h2>New Custom Heading</h2>';
    else if (tagType === 'button') newElementTag = '<button style={{ padding: "10px 20px", background: "#2a6f6f", color: "#fff", border: "none", borderRadius: "6px" }}>New Button Action</button>';
    else if (tagType === 'paragraph') newElementTag = '<p>New paragraph description text...</p>';

    // Insert before the last closing </div> or at the end of return statement
    let updatedJsx = jsx;
    const lastDivIndex = jsx.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
      updatedJsx = jsx.slice(0, lastDivIndex) + `\n      ${newElementTag}\n` + jsx.slice(lastDivIndex);
    } else {
      updatedJsx += `\n${newElementTag}`;
    }
    onJsxChange(updatedJsx);
  };

  const getTagBadgeClass = (tag) => {
    if (tag.startsWith('h')) return 'tag-badge-heading';
    if (tag === 'button' || tag === 'a') return 'tag-badge-btn';
    return 'tag-badge-text';
  };

  if (!jsx) {
    return (
      <div className="visual-editor-empty">
        <p>No UI component generated yet. Generate a layout to open visual editing.</p>
      </div>
    );
  }

  return (
    <div className="visual-editor-container">
      <div className="visual-editor-sidebar">
        
        {/* Header & Add Actions */}
        <div className="visual-editor-header">
          <span className="eyebrow">DIRECT HAND EDITOR</span>
          <h3>Edit Text, Add & Delete</h3>
          <span className="visual-editor-count">{elements.length} editable boxes</span>
        </div>

        {/* Quick Add Element Buttons */}
        <div className="visual-add-bar">
          <span className="visual-add-label">+ Add New:</span>
          <button type="button" className="preset-chip" onClick={() => handleAddElement('heading')}>
            + Heading
          </button>
          <button type="button" className="preset-chip" onClick={() => handleAddElement('button')}>
            + Button
          </button>
          <button type="button" className="preset-chip" onClick={() => handleAddElement('paragraph')}>
            + Text
          </button>
        </div>

        {/* Search */}
        <div className="visual-editor-search">
          <input 
            type="text" 
            className="field-input" 
            placeholder="Search boxes..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        {/* Element Boxes List */}
        <div className="visual-editor-list">
          {filteredElements.length === 0 ? (
            <div className="cms-empty-state">No matching element boxes found.</div>
          ) : (
            filteredElements.map((item) => (
              <div 
                key={item.id} 
                className={`visual-element-box ${selectedId === item.id ? 'active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="visual-box-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`tag-badge ${getTagBadgeClass(item.tag)}`}>
                      {item.tag.toUpperCase()}
                    </span>
                    <span className="visual-box-id">Box #{item.id.replace('el_', '')}</span>
                  </div>

                  {/* Explicit Trash Delete Icon */}
                  <button 
                    type="button" 
                    className="visual-delete-btn"
                    onClick={(e) => handleDeleteElement(item, e)}
                    title="Delete box from UI"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>

                <div className="visual-box-body">
                  {item.tag === 'p' || item.text.length > 50 ? (
                    <textarea 
                      className="field-textarea"
                      rows="2"
                      placeholder="(Empty content - type text here...)"
                      value={item.text}
                      onChange={(e) => handleTextChange(item, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className="field-input"
                      placeholder="(Empty content - type text here...)"
                      value={item.text}
                      onChange={(e) => handleTextChange(item, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
