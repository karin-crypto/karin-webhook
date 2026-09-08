import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { CompareProvider } from './lib/compare.jsx';
import './index.css';

// Ensure RTL/Hebrew even when the host document does not set it (e.g. single-file previews)
document.documentElement.setAttribute('dir', 'rtl');
document.documentElement.setAttribute('lang', 'he');
// VITE_ROUTER=hash builds a hash-routed bundle that works from any static URL without server fallback
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <CompareProvider>
        <App />
      </CompareProvider>
    </Router>
  </React.StrictMode>
);
