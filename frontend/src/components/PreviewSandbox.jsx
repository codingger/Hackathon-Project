import { useMemo } from 'react';

const VIEWPORTS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px'
};

function buildPreviewHTML(jsx, css) {
  if (!jsx) return '';

  let code = jsx;

  // Strip imports
  code = code.replace(/^\s*import\b.*$/gm, '');

  // Detect component name (default: GeneratedPage)
  let name = 'GeneratedPage';
  const m = code.match(/(?:export\s+default\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (m) name = m[1];

  // Strip exports
  code = code.replace(/export\s+default\s+/g, '');
  code = code.replace(/export\s+(?=(function|const|let|var|class))/g, '');

  // Escape closing script tags inside user code
  code = code.replace(/<\/script>/gi, '<\\/script>');

  const safeCode = JSON.stringify(code);

  return '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<script src="https://cdn.tailwindcss.com"></script>'
    + '<style>'
    + 'body{margin:0;font-family:Arial,sans-serif;overflow-x:hidden}*{box-sizing:border-box}'
    + (css || '')
    + '</style></head><body><div id="root"></div>'
    + '<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>'
    + '<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>'
    + '<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>'
    + '<script>window.onload=function(){try{'
    + 'var c=' + safeCode + ';'
    + 'var t=Babel.transform(c,{presets:[["react",{runtime:"classic"}]]}).code;'
    + 'var run=new Function("React","ReactDOM","useState","useEffect","useContext","useReducer","useRef","useMemo","useCallback","useLayoutEffect",'
    + 't+"\\nreturn ' + name + ';");'
    + 'var C=run(React,ReactDOM,React.useState,React.useEffect,React.useContext,React.useReducer,React.useRef,React.useMemo,React.useCallback,React.useLayoutEffect);'
    + 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(C));'
    + '}catch(e){'
    + 'document.getElementById("root").innerHTML="<div style=\\"padding:20px;font-family:Arial;color:#b00020\\"><h3>Preview Error</h3><pre style=\\"white-space:pre-wrap\\">"+(e.stack||e.message)+"</pre></div>";'
    + 'console.error(e)}}<\/script></body></html>';
}

export default function PreviewSandbox({ jsx, css, viewport = 'desktop' }) {
  const html = useMemo(() => buildPreviewHTML(jsx, css), [jsx, css]);

  if (!jsx) {
    return (
      <div className="preview-sandbox">
        <div className={`preview-frame-wrapper viewport-${viewport}`}>
          <div className={`preview-empty-card ${viewport}`}>
            <div className="empty-card-header">
              <span className="empty-tag">Live Canvas ({viewport.toUpperCase()})</span>
              <span className="empty-status-text">Awaiting Generation</span>
            </div>

            <div className="ghost-wireframe">
              <div className="ghost-nav">
                <div className="ghost-bar" style={{ width: '80px' }} />
                <div className="ghost-bar" style={{ width: '160px' }} />
              </div>

              <div className="ghost-hero">
                <div className="ghost-title" />
                <div className="ghost-desc" />
                <div className="ghost-desc-short" />
                <div className="ghost-btn" />
              </div>

              <div className="ghost-grid">
                <div className="ghost-card" />
                <div className="ghost-card" />
                <div className="ghost-card" />
              </div>
            </div>

            <div className="empty-card-footer">
              Set your directives on the left and generate to render the interactive React component.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-sandbox">
      <div className={`preview-frame-wrapper viewport-${viewport}`}>
        <div className={`device-container ${viewport}`}>
          {viewport === 'mobile' && (
            <div className="phone-notch">
              <div className="phone-camera"></div>
              <div className="phone-speaker"></div>
            </div>
          )}
          <iframe
            title="Live Preview"
            srcDoc={html}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
