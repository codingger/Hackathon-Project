import { useState } from 'react';

export default function CodeViewer({ code, label }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-viewer">
      <div className="code-viewer-header">
        <span className="code-label">{label}</span>
        <button className="copy-btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <pre><code>{code || 'Nothing generated yet.'}</code></pre>
    </div>
  );
}
