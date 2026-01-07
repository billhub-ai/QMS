import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import Fonts (Offline Ready)
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/noto-nastaliq-urdu/400.css';
import '@fontsource/noto-nastaliq-urdu/700.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Worker Logic
if ('serviceWorker' in navigator) {
  // Use a safer check for PROD
  const isProd = (import.meta as any).env ? (import.meta as any).env.PROD : false;
  
  if (isProd) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.log('SW failed', err));
    });
  } else {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for(let registration of registrations) {
        registration.unregister();
        console.log('SW unregistered for dev/preview');
      }
    });
  }
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("React Mount Failed:", e);
  document.body.innerHTML = `<div style="color:red; padding:20px;"><h1>App Crash</h1><pre>${e}</pre></div>`;
}