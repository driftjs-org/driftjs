/**
 * DevTools message protocol and data structures.
 */

export interface VMRegisterSnapshot {
  index: number;
  type: 'element' | 'text' | 'comment' | 'fragment' | 'primitive' | 'function' | 'empty';
  preview: string;
}

export interface VMRegionSnapshot {
  type: 'if' | 'for';
  deps: string[];
  testExpr?: string;
  itemCount?: number;
  activeBranch?: 'consequent' | 'alternate' | 'none';
}

export interface DisassembledInstruction {
  pc: number;
  opcode: number;
  mnemonic: string;
  operands: number[];
  annotation?: string;
}

export interface VMSnapshot {
  id: string;
  parentId: string | null;
  name: string;
  scope: Record<string, any>;
  declaredVars: string[];
  reactiveBindings: Array<{ varName: string; pcs: number[] }>;
  registers: VMRegisterSnapshot[];
  constants: any[];
  bytecode: DisassembledInstruction[];
  reactiveRegions: VMRegionSnapshot[];
  renderCount: number;
  tagName?: string;
}

export interface ReactivityEvent {
  id: string;
  timestamp: number;
  vmId: string;
  vmName: string;
  type: 'dirty' | 'flush' | 'lis-reconcile' | 'mount' | 'unmount' | 'region-change';
  varName?: string;
  details?: string;
}

export type BridgeMessage =
  | { source: 'drift-devtools-injected'; type: 'DRIFT_DETECTED'; payload: { version: string; vmCount: number } }
  | { source: 'drift-devtools-injected'; type: 'VM_TREE'; payload: { vms: VMSnapshot[] } }
  | { source: 'drift-devtools-injected'; type: 'VM_UPDATED'; payload: { vmId: string; scope: Record<string, any>; dirtyVars: string[] } }
  | { source: 'drift-devtools-injected'; type: 'VM_MOUNTED'; payload: { vm: VMSnapshot } }
  | { source: 'drift-devtools-injected'; type: 'VM_UNMOUNTED'; payload: { vmId: string } }
  | { source: 'drift-devtools-injected'; type: 'EVENT_LOG'; payload: ReactivityEvent }
  | { source: 'drift-devtools-panel'; type: 'INIT_PANEL'; tabId?: number }
  | { source: 'drift-devtools-panel'; type: 'REFRESH_REQUEST'; tabId?: number }
  | { source: 'drift-devtools-panel'; type: 'SELECT_VM'; payload: { vmId: string }; tabId?: number }
  | { source: 'drift-devtools-panel'; type: 'UPDATE_SCOPE_VAR'; payload: { vmId: string; varName: string; value: any }; tabId?: number }
  | { source: 'drift-devtools-panel'; type: 'HIGHLIGHT_VM'; payload: { vmId: string }; tabId?: number }
  | { source: 'drift-devtools-panel'; type: 'UNHIGHLIGHT_VM'; tabId?: number };
