import { disassembleBytecode } from './utils/disassembler.js';
import type { VMSnapshot, VMRegisterSnapshot, ReactivityEvent } from './types/bridge.js';

(function () {
  if ((window as any).__DRIFT_DEVTOOLS_INJECTED__) return;
  (window as any).__DRIFT_DEVTOOLS_INJECTED__ = true;

  const vmMap = new Map<string, any>();
  const reverseVmMap = new WeakMap<any, string>();
  let vmCounter = 0;

  function safeCloneScope(scope: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    if (!scope) return out;
    for (const key of Object.keys(scope)) {
      const val = scope[key];
      if (typeof val === 'function') {
        out[key] = `ƒ ${val.name || 'anonymous'}()`;
      } else if (typeof val === 'symbol') {
        out[key] = val.toString();
      } else if (val instanceof Node) {
        out[key] = `<${(val as Element).tagName ? (val as Element).tagName.toLowerCase() : val.nodeName}>`;
      } else {
        try {
          out[key] = JSON.parse(JSON.stringify(val));
        } catch (error: any) {
          out[key] = String(val);
          console.log(error)
        }
      }
    }
    return out;
  }

  function getRegisterSnapshots(vm: any): VMRegisterSnapshot[] {
    const list: VMRegisterSnapshot[] = [];
    const regs = vm.registers;
    if (!Array.isArray(regs)) return list;

    for (let i = 0; i < regs.length; i++) {
      const val = regs[i];
      if (val === undefined || val === null) continue;

      let type: VMRegisterSnapshot['type'] = 'primitive';
      let preview = '';

      if (val instanceof Element) {
        type = 'element';
        const classes = val.className ? `.${val.className.split(' ').join('.')}` : '';
        preview = `<${val.tagName.toLowerCase()}${classes}>`;
      } else if (val instanceof Text) {
        type = 'text';
        preview = `"${val.nodeValue?.slice(0, 30) ?? ''}"`;
      } else if (val instanceof Comment) {
        type = 'comment';
        preview = `<!--${val.nodeValue}-->`;
      } else if (val instanceof DocumentFragment) {
        type = 'fragment';
        preview = `#fragment (${val.childNodes.length} nodes)`;
      } else if (typeof val === 'function') {
        type = 'function';
        preview = `ƒ ${val.name || 'anonymous'}()`;
      } else {
        type = 'primitive';
        preview = String(val);
      }

      list.push({ index: i, type, preview });
    }
    return list;
  }

  function serializeVM(vm: any): VMSnapshot {
    let id = reverseVmMap.get(vm);
    if (!id) {
      id = `vm-${++vmCounter}`;
      reverseVmMap.set(vm, id);
      vmMap.set(id, vm);
    }

    const parentId = vm.parentVM ? reverseVmMap.get(vm.parentVM) ?? null : null;
    const module = vm.module || {};
    const bytecode = module.bytecode || [];
    const constants = module.constants || [];

    // Find main DOM node from registers to get tagName
    let tagName = 'DriftComponent';
    if (vm.registers && vm.registers[0] instanceof Element) {
      tagName = (vm.registers[0] as Element).tagName.toLowerCase();
    }

    const regSnapshots = getRegisterSnapshots(vm);
    const disassembled = disassembleBytecode(bytecode, constants);

    return {
      id,
      parentId,
      name: tagName,
      scope: safeCloneScope(vm.scope),
      declaredVars: Array.from(vm.declaredVars || []),
      reactiveBindings: Array.from((vm.reactiveBindingsMap as Map<string, number[]>)?.entries() || []).map(([v, p]) => ({
        varName: v,
        pcs: Array.from(p),
      })),
      registers: regSnapshots,
      constants: constants.map((c: any) => {
        if (typeof c === 'function') return `ƒ ${c.name || 'fn'}()`;
        if (typeof c === 'object' && c !== null) {
          try {
            return JSON.parse(JSON.stringify(c));
          } catch {
            return String(c);
          }
        }
        return c;
      }),
      bytecode: disassembled,
      reactiveRegions: Array.from((vm.reactiveRegions as Set<any>) || []).map((r) => ({
        type: r.type || 'if',
        deps: Array.isArray(r.deps) ? r.deps : [],
      })),
      renderCount: 1,
      tagName,
    };
  }

  function postToDevTools(message: any) {
    window.postMessage({ source: 'drift-devtools-injected', ...message }, '*');
  }

  function sendAllVMs() {
    const vms: VMSnapshot[] = [];
    for (const vm of vmMap.values()) {
      try {
        vms.push(serializeVM(vm));
      } catch (e) {
        console.error('[DriftDevTools] Error serializing VM:', e);
      }
    }
    postToDevTools({
      type: 'VM_TREE',
      payload: { vms },
    });
  }

  // Highlight Overlay
  let overlayEl: HTMLDivElement | null = null;
  function highlightVMElement(vmId: string) {
    removeHighlight();
    const vm = vmMap.get(vmId);
    if (!vm) return;

    let targetEl: HTMLElement | null = null;
    if (vm.registers) {
      for (const reg of vm.registers) {
        if (reg instanceof HTMLElement) {
          targetEl = reg;
          break;
        }
      }
    }

    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    if (!rect) return;

    overlayEl = document.createElement('div');
    overlayEl.style.position = 'fixed';
    overlayEl.style.left = `${rect.left}px`;
    overlayEl.style.top = `${rect.top}px`;
    overlayEl.style.width = `${rect.width}px`;
    overlayEl.style.height = `${rect.height}px`;
    overlayEl.style.backgroundColor = 'rgba(56, 189, 248, 0.25)';
    overlayEl.style.border = '2px solid #0284c7';
    overlayEl.style.borderRadius = '4px';
    overlayEl.style.pointerEvents = 'none';
    overlayEl.style.zIndex = '999999';
    overlayEl.style.boxSizing = 'border-box';
    overlayEl.style.transition = 'all 0.15s ease-out';

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.bottom = '100%';
    label.style.left = '0';
    label.style.backgroundColor = '#0284c7';
    label.style.color = '#ffffff';
    label.style.fontSize = '11px';
    label.style.fontFamily = 'monospace';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '3px 3px 0 0';
    label.textContent = `<${targetEl.tagName.toLowerCase()}> ${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    overlayEl.appendChild(label);
    document.body.appendChild(overlayEl);
  }

  function removeHighlight() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    }
  }

  // Create Global Hook for DriftJS
  const hook = {
    version: '0.0.16',
    registerVM(vm: any) {
      const snap = serializeVM(vm);
      postToDevTools({
        type: 'VM_MOUNTED',
        payload: { vm: snap },
      });
      postToDevTools({
        type: 'EVENT_LOG',
        payload: {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          vmId: snap.id,
          vmName: snap.name,
          type: 'mount',
          details: `Mounted <${snap.name}> into DOM`,
        } as ReactivityEvent,
      });
    },

    unregisterVM(vm: any) {
      const id = reverseVmMap.get(vm);
      if (id) {
        vmMap.delete(id);
        postToDevTools({
          type: 'VM_UNMOUNTED',
          payload: { vmId: id },
        });
        postToDevTools({
          type: 'EVENT_LOG',
          payload: {
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            vmId: id,
            vmName: id,
            type: 'unmount',
            details: `Unmounted VM from DOM`,
          } as ReactivityEvent,
        });
      }
    },

    emitDirty(vm: any, varName: string) {
      const id = reverseVmMap.get(vm);
      if (!id) return;
      postToDevTools({
        type: 'VM_UPDATED',
        payload: {
          vmId: id,
          scope: safeCloneScope(vm.scope),
          dirtyVars: [varName],
        },
      });
      postToDevTools({
        type: 'EVENT_LOG',
        payload: {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          vmId: id,
          vmName: id,
          type: 'dirty',
          varName,
          details: `markDirty("${varName}") -> microtask flush scheduled`,
        } as ReactivityEvent,
      });
    },

    emitRegionUpdate(vm: any, _region: any, type: string) {
      const id = reverseVmMap.get(vm);
      if (!id) return;
      postToDevTools({
        type: 'EVENT_LOG',
        payload: {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          vmId: id,
          vmName: id,
          type: 'region-change',
          details: `Reactive region updated (${type})`,
        } as ReactivityEvent,
      });
    },
  };

  (window as any).__DRIFT_DEVTOOLS_GLOBAL_HOOK__ = hook;

  // Listen to messages from content script / DevTools panel
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'drift-devtools-panel') return;
    const msg = event.data;

    switch (msg.type) {
      case 'REFRESH_REQUEST':
      case 'INIT_PANEL':
        sendAllVMs();
        break;

      case 'HIGHLIGHT_VM':
        if (msg.payload?.vmId) {
          highlightVMElement(msg.payload.vmId);
        }
        break;

      case 'UNHIGHLIGHT_VM':
        removeHighlight();
        break;

      case 'UPDATE_SCOPE_VAR': {
        const { vmId, varName, value } = msg.payload || {};
        const vm = vmMap.get(vmId);
        if (vm && varName) {
          vm.scope[varName] = value;
          if (typeof vm.markDirty === 'function') {
            vm.markDirty(varName);
          }
        }
        break;
      }
    }
  });

  // Notify extension that hook is ready
  postToDevTools({
    type: 'DRIFT_DETECTED',
    payload: { version: hook.version, vmCount: vmMap.size },
  });
})();
