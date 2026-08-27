import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import App from './App.jsx';
import WireframeStudio from './pages/WireframeStudio.jsx';
import PromptStudio from './pages/PromptStudio.jsx';
import CodeModifier from './pages/CodeModifier.jsx';
import CMSStudio from './pages/CMSStudio.jsx';

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Navigate to="/wireframe" replace /> },
      { path: '/wireframe', element: <WireframeStudio /> },
      { path: '/prompt-ui', element: <PromptStudio /> },
      { path: '/code-modifier', element: <CodeModifier /> },
      { path: '/cms', element: <CMSStudio /> },
      { path: '*', element: <div style={{ padding: '4rem', textAlign: 'center' }}><h2>Page Not Found</h2><p style={{ marginTop: '1rem' }}><a href="/wireframe" style={{ color: '#2a6f6f', fontWeight: 'bold' }}>Go to Wireframe Studio →</a></p></div> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>
);