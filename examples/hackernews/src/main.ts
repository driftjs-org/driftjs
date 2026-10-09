import { mount, hydrate } from 'driftjs-dom';
import App from './App.drift';
import './style.css';

declare global {
  interface Window {
    __INITIAL_DATA__?: Record<string, any>;
  }
}

const root = document.getElementById('app');

if (root) {
  // If server pre-rendered HTML exists in root, claim and hydrate it
  if (window.__INITIAL_DATA__ && root.hasChildNodes()) {
    hydrate(App, root, {
      scope: window.__INITIAL_DATA__,
    });
  } else {
    // Standalone client mount (e.g. during pure Vite dev mode)
    mount(App, root, {
      scope: window.__INITIAL_DATA__ || {},
    });
  }
}
