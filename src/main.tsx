import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

/* Mounts the React app once and enables StrictMode checks in development. */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
