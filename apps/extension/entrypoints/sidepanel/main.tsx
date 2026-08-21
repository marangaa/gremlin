import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidepanelApp } from './SidepanelApp';
import '@/entrypoints/popup/App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidepanelApp />
  </React.StrictMode>,
);
