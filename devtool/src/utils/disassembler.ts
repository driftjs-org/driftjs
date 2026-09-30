import { Opcode } from 'driftjs-compiler';
import type { DisassembledInstruction } from '../types/bridge.js';

export const OPCODE_NAMES: Record<number, string> = {
  [Opcode.RETURN]: 'RETURN',
  [Opcode.CREATE_ELEMENT]: 'CREATE_ELEMENT',
  [Opcode.CREATE_TEXT]: 'CREATE_TEXT',
  [Opcode.CREATE_COMMENT]: 'CREATE_COMMENT',
  [Opcode.APPEND_CHILD]: 'APPEND_CHILD',
  [Opcode.SET_ATTR]: 'SET_ATTR',
  [Opcode.CREATE_FRAGMENT]: 'CREATE_FRAGMENT',
  [Opcode.INTERPOLATE_TEXT]: 'INTERPOLATE_TEXT',
  [Opcode.EXEC_SCRIPT]: 'EXEC_SCRIPT',
  [Opcode.REACTIVE_IF]: 'REACTIVE_IF',
  [Opcode.REACTIVE_FOR]: 'REACTIVE_FOR',
  [Opcode.MOUNT_COMPONENT]: 'MOUNT_COMPONENT',
  [Opcode.REACTIVE_ASYNC]: 'REACTIVE_ASYNC',
  [Opcode.REACTIVE_SWITCH]: 'REACTIVE_SWITCH',
};

export const OPCODE_OPERAND_COUNTS: Record<number, number> = {
  [Opcode.RETURN]: 1,
  [Opcode.CREATE_ELEMENT]: 3,
  [Opcode.CREATE_TEXT]: 2,
  [Opcode.CREATE_COMMENT]: 2,
  [Opcode.APPEND_CHILD]: 2,
  [Opcode.SET_ATTR]: 4,
  [Opcode.CREATE_FRAGMENT]: 1,
  [Opcode.INTERPOLATE_TEXT]: 2,
  [Opcode.EXEC_SCRIPT]: 1,
  [Opcode.REACTIVE_IF]: 5,
  [Opcode.REACTIVE_FOR]: 9,
  [Opcode.MOUNT_COMPONENT]: 3,
  [Opcode.REACTIVE_ASYNC]: 4,
  [Opcode.REACTIVE_SWITCH]: 4,
};

export function disassembleBytecode(
  bytecode: Uint32Array | number[],
  constants: any[] = []
): DisassembledInstruction[] {
  const instructions: DisassembledInstruction[] = [];
  if (!bytecode) return instructions;

  let pc = 0;
  const len = bytecode.length;

  while (pc < len) {
    const startPc = pc;
    const op = bytecode[pc++];
    const mnemonic = OPCODE_NAMES[op] || `OP_0x${op.toString(16).toUpperCase()}`;
    const opCount = OPCODE_OPERAND_COUNTS[op] || 0;
    const operands: number[] = [];

    for (let i = 0; i < opCount && pc < len; i++) {
      operands.push(bytecode[pc++]);
    }

    let annotation = '';
    try {
      if (op === Opcode.CREATE_ELEMENT && operands[1] !== undefined) {
        const tag = constants[operands[1]];
        annotation = `<${tag}>`;
      } else if (op === Opcode.CREATE_TEXT && operands[1] !== undefined) {
        const txt = constants[operands[1]];
        annotation = JSON.stringify(txt);
      } else if (op === Opcode.SET_ATTR && operands[1] !== undefined) {
        const name = constants[operands[1]];
        const val = operands[2] !== undefined ? constants[operands[2]] : undefined;
        annotation = `${name}="${val ?? ''}"`;
      } else if (op === Opcode.INTERPOLATE_TEXT && operands[1] !== undefined) {
        const expr = constants[operands[1]];
        annotation = `{ ${typeof expr === 'object' && expr?.__drift_expr__ ? expr.__drift_expr__ : 'expr'} }`;
      } else if (op === Opcode.REACTIVE_IF && operands[4] !== undefined) {
        const deps = constants[operands[4]];
        annotation = `deps: [${Array.isArray(deps) ? deps.join(', ') : ''}]`;
      } else if (op === Opcode.REACTIVE_FOR && operands[6] !== undefined) {
        const deps = constants[operands[6]];
        annotation = `for deps: [${Array.isArray(deps) ? deps.join(', ') : ''}]`;
      }
    } catch {
      // Ignored annotation errors
    }

    instructions.push({
      pc: startPc,
      opcode: op,
      mnemonic,
      operands,
      annotation,
    });
  }

  return instructions;
}
