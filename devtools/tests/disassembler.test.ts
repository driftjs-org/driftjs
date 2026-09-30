import { describe, it, expect } from 'vitest';
import { Opcode } from 'driftjs-compiler';
import { disassembleBytecode, OPCODE_NAMES } from '../src/utils/disassembler.js';

describe('DriftJS DevTools Disassembler', () => {
  it('correctly disassembles element creation and return opcodes', () => {
    const bytecode = [
      Opcode.CREATE_ELEMENT, 0, 0, 0,
      Opcode.CREATE_TEXT, 1, 1,
      Opcode.APPEND_CHILD, 0, 1,
      Opcode.RETURN, 0,
    ];
    const constants = ['div', 'Hello Drift'];

    const result = disassembleBytecode(bytecode, constants);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      pc: 0,
      opcode: Opcode.CREATE_ELEMENT,
      mnemonic: 'CREATE_ELEMENT',
      operands: [0, 0, 0],
      annotation: '<div>',
    });
    expect(result[1]).toEqual({
      pc: 4,
      opcode: Opcode.CREATE_TEXT,
      mnemonic: 'CREATE_TEXT',
      operands: [1, 1],
      annotation: '"Hello Drift"',
    });
    expect(result[2]).toEqual({
      pc: 7,
      opcode: Opcode.APPEND_CHILD,
      mnemonic: 'APPEND_CHILD',
      operands: [0, 1],
      annotation: '',
    });
    expect(result[3]).toEqual({
      pc: 10,
      opcode: Opcode.RETURN,
      mnemonic: 'RETURN',
      operands: [0],
      annotation: '',
    });
  });

  it('correctly annotates reactive if and for blocks with dependency names', () => {
    const bytecode = [
      Opcode.REACTIVE_IF, 0, 0, 1, 2, 0,
      Opcode.REACTIVE_FOR, 0, 1, 2, 3, 4, 5, 1, 2, 3,
    ];
    const constants = [
      ['count', 'step'],
      ['items'],
      ['items'],
      ['filter'],
    ];

    const result = disassembleBytecode(bytecode, constants);

    expect(result).toHaveLength(2);
    expect(result[0]!.mnemonic).toBe('REACTIVE_IF');
    expect(result[0]!.annotation).toBe('deps: [count, step]');
    expect(result[1]!.mnemonic).toBe('REACTIVE_FOR');
    expect(result[1]!.annotation).toBe('for deps: [items]');
  });
});
