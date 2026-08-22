import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { store } from './redux/store';
import { Provider } from 'react-redux';
import './index.css';
import App from './App.jsx';
import Reactfeature from "./reactfeature.jsx";
import Home from "./home.jsx";

const router = createBrowserRouter([
  {
    path:"/",
    element:<Home/>
  },
  {
    path: "/wireframe",
    element: <App />
  },
   {
    path: "/react-feature",
    element: <Reactfeature />
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>
);