import { ext } from './utils/ext.js';

// Map of tabId -> DevTools Panel port
const devtoolsPorts = new Map<number, any>();
// Map of tabId -> Content Script port
const contentPorts = new Map<number, any>();

ext.runtime.onConnect.addListener((port: any) => {
  if (port.name === 'drift-devtools-panel') {
    let panelTabId: number | null = null;

    const panelListener = (message: any) => {
      if (message.type === 'INIT_PANEL' && message.tabId) {
        const id = Number(message.tabId);
        panelTabId = id;
        devtoolsPorts.set(id, port);

        // Notify content script that devtools panel has opened
        const contentPort = contentPorts.get(id);
        if (contentPort) {
          contentPort.postMessage({ type: 'INIT_PANEL' });
        }
        return;
      }

      const targetTabId = message.tabId || panelTabId;
      if (targetTabId) {
        const contentPort = contentPorts.get(targetTabId);
        if (contentPort) {
          contentPort.postMessage(message);
        }
      }
    };

    port.onMessage.addListener(panelListener);

    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(panelListener);
      if (panelTabId !== null) {
        devtoolsPorts.delete(panelTabId);
      }
    });
  } else if (port.name === 'drift-content-script') {
    const tabId = port.sender?.tab?.id;
    if (tabId !== undefined) {
      contentPorts.set(tabId, port);

      const contentListener = (message: any) => {
        const devtoolsPort = devtoolsPorts.get(tabId);
        if (devtoolsPort) {
          devtoolsPort.postMessage(message);
        }
      };

      port.onMessage.addListener(contentListener);

      port.onDisconnect.addListener(() => {
        port.onMessage.removeListener(contentListener);
        contentPorts.delete(tabId);
      });
    }
  }
});

// Detect tab navigation/reload to refresh devtools panel
if (ext.tabs && ext.tabs.onUpdated) {
  ext.tabs.onUpdated.addListener((tabId: number, changeInfo: any) => {
    if (changeInfo.status === 'loading') {
      const panel = devtoolsPorts.get(tabId);
      if (panel) {
        panel.postMessage({
          source: 'drift-devtools-injected',
          type: 'TAB_RELOADED',
          payload: { tabId },
        });
      }
    }
  });
}
