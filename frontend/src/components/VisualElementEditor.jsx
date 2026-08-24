import { useState, useMemo } from 'react';

export default function VisualElementEditor({ jsx, onJsxChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  // Extract all editable text elements from JSX
  const elements = useMemo(() => {
    if (!jsx) return [];
    const items = [];
    // Regex matching text inside HTML elements like <h1>text</h1>, <button>text</button>, etc.
    const regex = /<(h[1-6]|p|button|a|span|li|strong|em|td|th)[^>]*>([^<>{}+]+)<\/\1>/gi;
    let match;
    let index = 0;
    while ((match = regex.exec(jsx)) !== null) {
      const tag = match[1].toLowerCase();
      const text = match[2].trim();
      if (text.length > 0 && !text.includes('React.') && !text.includes('function')) {
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

  const handleTextChange = (item, newText) => {
    if (!jsx) return;
    // Perform exact replace of old text inside the match
    const oldText = item.text;
    if (oldText === newText) return;
    const updatedJsx = jsx.replace(oldText, newText);
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
        <div className="visual-editor-header">
          <span className="eyebrow">DIRECT HAND EDITOR</span>
          <h3>Select Box & Edit Content</h3>
          <span className="visual-editor-count">{elements.length} editable elements found</span>
        </div>

        <div className="visual-editor-search">
          <input 
            type="text" 
            className="field-input" 
            placeholder="Search headline, button, or text..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="visual-editor-list">
          {filteredElements.length === 0 ? (
            <div className="cms-empty-state">No matching text elements found.</div>
          ) : (
            filteredElements.map((item) => (
              <div 
                key={item.id} 
                className={`visual-element-box ${selectedId === item.id ? 'active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="visual-box-header">
                  <span className={`tag-badge ${getTagBadgeClass(item.tag)}`}>
                    {item.tag.toUpperCase()}
                  </span>
                  <span className="visual-box-id">Box #{item.id.replace('el_', '')}</span>
                </div>

                <div className="visual-box-body">
                  {item.text.length > 50 || item.tag === 'p' ? (
                    <textarea 
                      className="field-textarea"
                      rows="2"
                      value={item.text}
                      onChange={(e) => handleTextChange(item, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className="field-input"
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
