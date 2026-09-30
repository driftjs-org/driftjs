import { ext } from './utils/ext.js';

// 1. Inject injected.js into the main document context
function injectScript(filePath: string) {
  try {
    const container = document.head || document.documentElement;
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', ext.runtime.getURL(filePath));
    script.onload = function () {
      script.remove();
    };
    container.appendChild(script);
  } catch (e) {
    console.error('[DriftDevTools ContentScript] Failed to inject hook:', e);
  }
}

injectScript('injected.js');

// 2. Connect to background script
let port: any = null;
function connectToBackground() {
  try {
    port = ext.runtime.connect({ name: 'drift-content-script' });

    port.onMessage.addListener((msg: any) => {
      // Forward messages from DevTools panel to injected hook in page
      window.postMessage({ ...msg, source: 'drift-devtools-panel' }, '*');
    });

    port.onDisconnect.addListener(() => {
      port = null;
      // Reconnect after delay
      setTimeout(connectToBackground, 1000);
    });
  } catch (err) {
    console.warn('[DriftDevTools ContentScript] Failed connecting to background:', err);
  }
}

connectToBackground();

// 3. Listen for messages from injected.js in the page and relay to background
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== 'drift-devtools-injected') {
    return;
  }

  if (port) {
    try {
      port.postMessage(event.data);
    } catch {
      // Port closed or disconnecting
    }
  }
});
