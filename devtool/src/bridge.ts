import { ext } from './utils/ext.js';
import type { VMSnapshot, ReactivityEvent, BridgeMessage } from './types/bridge.js';

export interface BridgeCallbacks {
  onDetected?: (version: string, vmCount: number) => void;
  onTree?: (vms: VMSnapshot[]) => void;
  onVMUpdated?: (vmId: string, scope: Record<string, any>, dirtyVars: string[]) => void;
  onVMMounted?: (vm: VMSnapshot) => void;
  onVMUnmounted?: (vmId: string) => void;
  onEvent?: (event: ReactivityEvent) => void;
  onReload?: () => void;
}

export class DevToolsBridge {
  private port: any = null;
  private tabId: number | null = null;
  private callbacks: BridgeCallbacks = {};

  constructor(callbacks: BridgeCallbacks = {}) {
    this.callbacks = callbacks;
    this.init();
  }

  private init() {
    try {
      this.tabId = ext?.devtools?.inspectedWindow?.tabId ?? null;
      if (ext?.runtime?.connect) {
        this.port = ext.runtime.connect({ name: 'drift-devtools-panel' });

        this.port.onMessage.addListener((msg: any) => {
          this.handleMessage(msg);
        });

        this.port.onDisconnect.addListener(() => {
          this.port = null;
        });

        // Register panel with tabId
        if (this.tabId !== null) {
          this.port.postMessage({
            type: 'INIT_PANEL',
            tabId: this.tabId,
          });
        }
      }
    } catch (e) {
      console.warn('[DriftDevTools Bridge] Error connecting:', e);
    }
  }

  private handleMessage(msg: any) {
    if (!msg) return;

    if (msg.type === 'TAB_RELOADED') {
      this.callbacks.onReload?.();
      this.refreshTree();
      return;
    }

    if (msg.type === 'DRIFT_DETECTED') {
      this.callbacks.onDetected?.(msg.payload?.version ?? 'unknown', msg.payload?.vmCount ?? 0);
    } else if (msg.type === 'VM_TREE') {
      this.callbacks.onTree?.(msg.payload?.vms ?? []);
    } else if (msg.type === 'VM_UPDATED') {
      this.callbacks.onVMUpdated?.(msg.payload?.vmId, msg.payload?.scope, msg.payload?.dirtyVars ?? []);
    } else if (msg.type === 'VM_MOUNTED') {
      this.callbacks.onVMMounted?.(msg.payload?.vm);
    } else if (msg.type === 'VM_UNMOUNTED') {
      this.callbacks.onVMUnmounted?.(msg.payload?.vmId);
    } else if (msg.type === 'EVENT_LOG') {
      this.callbacks.onEvent?.(msg.payload);
    }
  }

  public post(message: BridgeMessage) {
    if (this.port) {
      try {
        this.port.postMessage({
          ...message,
          tabId: this.tabId,
        });
      } catch (e) {
        console.warn('[DriftDevTools Bridge] Failed to post message:', e);
      }
    }
  }

  public refreshTree() {
    this.post({
      source: 'drift-devtools-panel',
      type: 'REFRESH_REQUEST',
    });
  }

  public highlightVM(vmId: string) {
    this.post({
      source: 'drift-devtools-panel',
      type: 'HIGHLIGHT_VM',
      payload: { vmId },
    });
  }

  public unhighlightVM() {
    this.post({
      source: 'drift-devtools-panel',
      type: 'UNHIGHLIGHT_VM',
    });
  }

  public updateScopeVar(vmId: string, varName: string, value: any) {
    this.post({
      source: 'drift-devtools-panel',
      type: 'UPDATE_SCOPE_VAR',
      payload: { vmId, varName, value },
    });
  }
}
