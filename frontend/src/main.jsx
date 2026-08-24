import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
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
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);