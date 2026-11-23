import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Fuentes servidas desde el propio sitio (sin Google Fonts): funcionan sin conexión en la app de iPhone
// y no bloquean el primer pintado. Inter variable para texto; Playfair Display solo para títulos y marca.
import '@fontsource-variable/inter/wght.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-500-italic.css';
import '@fontsource/playfair-display/latin-600-italic.css';
import './styles/app.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
