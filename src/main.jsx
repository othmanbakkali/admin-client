import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Rechargement immédiat si un chunk est manquant après un nouveau déploiement
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[Admin PWA] Nouvelle version prête, actualisation automatique...');
    updateSW(true);
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Vérification toutes les minutes
      setInterval(() => {
        registration.update();
      }, 60 * 1000);

      // Vérification au retour sur l'onglet
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  }
});

// Écoute du changement de contrôleur SW
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

