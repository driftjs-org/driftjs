import { disassembleBytecode } from './utils/disassembler.js';
import type { VMSnapshot, VMRegisterSnapshot, ReactivityEvent } from './types/bridge.js';

(function () {
  if ((window as any).__DRIFT_DEVTOOLS_INJECTED__) return;
  (window as any).__DRIFT_DEVTOOLS_INJECTED__ = true;

  const vmMap = new Map<string, any>();
  const reverseVmMap = new WeakMap<any, string>();
  let vmCounter = 0;

  /**
   * Cycle-safe, depth-limited value sanitizer.
   * Completely immune to circular references, DOM node recursion, and deep proxy traps.
   */
  function sanitizeValue(val: any, depth = 0, seen = new WeakSet()): any {
    if (val === null || val === undefined) return val;
    const type = typeof val;

    if (type === 'number' || type === 'boolean') {
      return val;
    }

    if (type === 'string') {
      return val.length > 200 ? val.slice(0, 200) + '…' : val;
    }

    if (type === 'function') {
      return `ƒ ${val.name || 'anonymous'}()`;
    }

    if (type === 'symbol') {
      return val.toString();
    }

    if (val instanceof Node) {
      if (val instanceof Element) {
        const classes =
          val.className && typeof val.className === 'string'
            ? `.${val.className.split(' ').filter(Boolean).slice(0, 3).join('.')}`
            : '';
        return `<${val.tagName.toLowerCase()}${classes}>`;
      }
      if (val instanceof Text) {
        return `"${(val.nodeValue || '').slice(0, 30)}"`;
      }
      if (val instanceof Comment) {
        return `<!--${(val.nodeValue || '').slice(0, 30)}-->`;
      }
      return `<${val.nodeName}>`;
    }

    if (typeof window !== 'undefined' && (val === window || val === document)) {
      return val === window ? '[Window]' : '[Document]';
    }

    if (depth >= 2) {
      if (Array.isArray(val)) return `[Array(${val.length})]`;
      return '[Object]';
    }

    if (type === 'object') {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);

      if (Array.isArray(val)) {
        const arr: any[] = [];
        const limit = Math.min(val.length, 20);
        for (let i = 0; i < limit; i++) {
          try {
            arr.push(sanitizeValue(val[i], depth + 1, seen));
          } catch {
            arr.push('[Error]');
          }
        }
        if (val.length > limit) {
          arr.push(`… +${val.length - limit} more`);
        }
        return arr;
      }

      const out: Record<string, any> = {};
      const keys = Object.keys(val).slice(0, 25);
      for (const k of keys) {
        if (k.startsWith('__drift_mark_dirty__') || k.startsWith('__drift_internal')) continue;
        try {
          const desc = Object.getOwnPropertyDescriptor(val, k);
          if (desc && desc.get) {
            try {
              out[k] = sanitizeValue(val[k], depth + 1, seen);
            } catch {
              out[k] = '[Getter]';
            }
          } else {
            out[k] = sanitizeValue(val[k], depth + 1, seen);
          }
        } catch {
          out[k] = '[Unreadable]';
        }
      }
      return out;
    }

    return String(val);
  }

  function safeCloneScope(scope: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    if (!scope || typeof scope !== 'object') return out;

    const seen = new WeakSet();
    seen.add(scope);

    const keys = Object.keys(scope).slice(0, 50);
    for (const key of keys) {
      if (key === '__drift_mark_dirty__') continue;
      try {
        out[key] = sanitizeValue(scope[key], 0, seen);
      } catch {
        out[key] = '[Unreadable]';
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

      try {
        if (val instanceof Element) {
          type = 'element';
          const classes =
            val.className && typeof val.className === 'string'
              ? `.${val.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
              : '';
          preview = `<${val.tagName.toLowerCase()}${classes}>`;
        } else if (val instanceof Text) {
          type = 'text';
          preview = `"${(val.nodeValue || '').slice(0, 30)}"`;
        } else if (val instanceof Comment) {
          type = 'comment';
          preview = `<!--${(val.nodeValue || '').slice(0, 30)}-->`;
        } else if (val instanceof DocumentFragment) {
          type = 'fragment';
          preview = `#fragment (${val.childNodes.length} nodes)`;
        } else if (typeof val === 'function') {
          type = 'function';
          preview = `ƒ ${val.name || 'anonymous'}()`;
        } else if (typeof val === 'object') {
          type = 'primitive';
          preview = Array.isArray(val)
            ? `[Array(${val.length})]`
            : val.constructor
              ? `<${val.constructor.name}>`
              : '[Object]';
        } else {
          type = 'primitive';
          preview = String(val);
        }
      } catch {
        preview = '[Error]';
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
    const constants = Array.isArray(module.constants) ? module.constants : [];

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
      reactiveBindings: Array.from((vm.reactiveBindingsMap as Map<string, number[]>)?.entries() || []).map(
        ([v, p]) => ({
          varName: v,
          pcs: Array.from(p),
        })
      ),
      registers: regSnapshots,
      constants: constants.slice(0, 50).map((c: any) => {
        try {
          return sanitizeValue(c, 0, new WeakSet());
        } catch {
          return '[Constant]';
        }
      }),
      bytecode: disassembled,
      reactiveRegions: Array.from((vm.reactiveRegions as Set<any>) || []).map((r) => {
        let type = r.type;
        if (!type && r.startAnchor) {
          const val = r.startAnchor.nodeValue || r.startAnchor.textContent || '';
          if (val.includes('for')) type = 'for';
          else if (val.includes('switch')) type = 'switch';
          else if (val.includes('async')) type = 'async';
          else type = 'if';
        }
        return {
          type: type || 'if',
          deps: r.deps ? Array.from(r.deps) : [],
        };
      }),
      renderCount: 1,
      tagName,
    };
  }

  function postToDevTools(message: any) {
    try {
      window.postMessage({ source: 'drift-devtools-injected', ...message }, '*');
    } catch (err) {
      console.warn('[DriftDevTools] postMessage clone error:', err);
    }
  }

  let sendVMsScheduled = false;
  function sendAllVMs() {
    sendVMsScheduled = false;
    const vms: VMSnapshot[] = [];
    for (const vm of Array.from(vmMap.values())) {
      try {
        vms.push(serializeVM(vm));
      } catch (e) {
        console.warn('[DriftDevTools] Error serializing VM:', e);
      }
    }
    postToDevTools({
      type: 'VM_TREE',
      payload: { vms },
    });
  }

  function scheduleSendAllVMs() {
    if (sendVMsScheduled) return;
    sendVMsScheduled = true;
    queueMicrotask(() => {
      sendAllVMs();
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

    if (!targetEl || typeof targetEl.getBoundingClientRect !== 'function') return;
    const rect = targetEl.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;

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
      try {
        let id = reverseVmMap.get(vm);
        if (!id) {
          id = `vm-${++vmCounter}`;
          reverseVmMap.set(vm, id);
          vmMap.set(id, vm);
        }
        scheduleSendAllVMs();
      } catch (err) {
        console.warn('[DriftDevTools] Error in registerVM:', err);
      }
    },

    unregisterVM(vm: any) {
      try {
        const id = reverseVmMap.get(vm);
        if (id) {
          vmMap.delete(id);
          postToDevTools({
            type: 'VM_UNMOUNTED',
            payload: { vmId: id },
          });
        }
      } catch (err) {
        console.warn('[DriftDevTools] Error in unregisterVM:', err);
      }
    },

    emitDirty(vm: any, varName: string) {
      try {
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
            vmName: vmMap.get(id)?.registers?.[0]?.tagName?.toLowerCase() || 'Component',
            type: 'dirty',
            varName,
            details: `markDirty("${varName}") -> microtask flush scheduled`,
          } as ReactivityEvent,
        });
      } catch (err) {
        console.warn('[DriftDevTools] Error in emitDirty:', err);
      }
    },

    emitRegionUpdate(vm: any, _region: any, type: string) {
      try {
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
      } catch (err) {
        console.warn('[DriftDevTools] Error in emitRegionUpdate:', err);
      }
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
