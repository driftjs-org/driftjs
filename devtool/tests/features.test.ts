import { describe, it, expect } from 'vitest';
import type { VMSnapshot, ReactivityEvent, ScopeSnapshot } from '../types/bridge.js';

describe('DriftJS DevTools Feature Enhancements', () => {
  describe('Component Search & Filter Logic', () => {
    const mockVms: Partial<VMSnapshot>[] = [
      { id: 'vm-1', name: 'counterdemo', declaredVars: ['count', 'step'] },
      { id: 'vm-2', name: 'appheader', declaredVars: ['user', 'theme'] },
      { id: 'vm-3', name: 'todolist', declaredVars: ['todos', 'filter'] },
      { id: 'vm-4', name: 'profilecard', declaredVars: ['bio', 'avatar'] },
    ];

    function filterVms(vms: Partial<VMSnapshot>[], query: string) {
      const q = (query || '').toLowerCase().trim();
      if (!q) return vms;
      return vms.filter(v =>
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.id && v.id.toLowerCase().includes(q))
      );
    }

    it('returns all VMs when search query is empty', () => {
      expect(filterVms(mockVms, '')).toHaveLength(4);
      expect(filterVms(mockVms, '   ')).toHaveLength(4);
    });

    it('filters components by tag name case-insensitively', () => {
      const result = filterVms(mockVms, 'counter');
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('vm-1');

      const upperResult = filterVms(mockVms, 'TODO');
      expect(upperResult).toHaveLength(1);
      expect(upperResult[0]?.id).toBe('vm-3');
    });

    it('filters components by VM instance ID', () => {
      const result = filterVms(mockVms, 'vm-2');
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('appheader');
    });

    it('returns empty array when query does not match any component', () => {
      const result = filterVms(mockVms, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('State Time-Travel / History Scrubber', () => {
    it('records and traverses chronological scope snapshots', () => {
      const snapshots: ScopeSnapshot[] = [];

      function recordSnapshot(scope: Record<string, any>, dirtyVar: string) {
        snapshots.push({
          step: snapshots.length,
          timestamp: Date.now(),
          vmId: 'vm-1',
          scope: JSON.parse(JSON.stringify(scope)),
          dirtyVar,
        });
      }

      // Record 3 state mutations
      recordSnapshot({ count: 0, text: 'initial' }, 'count');
      recordSnapshot({ count: 1, text: 'initial' }, 'count');
      recordSnapshot({ count: 1, text: 'updated' }, 'text');

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0]?.scope).toEqual({ count: 0, text: 'initial' });
      expect(snapshots[1]?.scope).toEqual({ count: 1, text: 'initial' });
      expect(snapshots[2]?.scope).toEqual({ count: 1, text: 'updated' });

      // Simulate scrubber
      let currentIndex = snapshots.length - 1; // Initially at present (index 2)
      expect(snapshots[currentIndex]?.scope.text).toBe('updated');

      // Step back
      currentIndex = Math.max(0, currentIndex - 1);
      expect(snapshots[currentIndex]?.scope.count).toBe(1);
      expect(snapshots[currentIndex]?.scope.text).toBe('initial');

      // Step back again to initial state
      currentIndex = Math.max(0, currentIndex - 1);
      expect(snapshots[currentIndex]?.scope.count).toBe(0);

      // Jump to present
      currentIndex = snapshots.length - 1;
      expect(snapshots[currentIndex]?.scope.text).toBe('updated');
    });
  });

  describe('Interactive VM Instruction Stepper', () => {
    const mockInstructions = [
      { pc: 0, opcode: 1, mnemonic: 'CREATE_ELEMENT', operands: [0, 0, 0] },
      { pc: 4, opcode: 2, mnemonic: 'CREATE_TEXT', operands: [1, 1] },
      { pc: 7, opcode: 4, mnemonic: 'APPEND_CHILD', operands: [0, 1] },
      { pc: 10, opcode: 0, mnemonic: 'RETURN', operands: [0] },
    ];

    it('manages stepper execution pointer and bounds', () => {
      let stepperIndex = 0;
      let stepperPc = -1; // -1 represents live mode

      function stepNext() {
        if (stepperPc === -1) {
          stepperIndex = 0;
          stepperPc = mockInstructions[0]!.pc;
        } else if (stepperIndex < mockInstructions.length - 1) {
          stepperIndex++;
          stepperPc = mockInstructions[stepperIndex]!.pc;
        }
      }

      function stepPrev() {
        if (stepperIndex > 0) {
          stepperIndex--;
          stepperPc = mockInstructions[stepperIndex]!.pc;
        } else {
          stepperIndex = 0;
          stepperPc = -1;
        }
      }

      function reset() {
        stepperIndex = 0;
        stepperPc = -1;
      }

      // Step forward through instructions
      stepNext();
      expect(stepperPc).toBe(0);
      expect(stepperIndex).toBe(0);

      stepNext();
      expect(stepperPc).toBe(4);
      expect(stepperIndex).toBe(1);

      stepNext();
      expect(stepperPc).toBe(7);

      stepNext();
      expect(stepperPc).toBe(10);

      // Attempting to step past end stays at end
      stepNext();
      expect(stepperPc).toBe(10);

      // Step backward
      stepPrev();
      expect(stepperPc).toBe(7);

      // Reset returns to live execution
      reset();
      expect(stepperPc).toBe(-1);
    });
  });

  describe('Performance Profiling Metrics', () => {
    it('aggregates microtask flush duration, patch counts, and LIS reconciliations', () => {
      const mockEvents: Partial<ReactivityEvent>[] = [
        { type: 'dirty', varName: 'count' },
        { type: 'flush', duration: 0.45, patchCount: 2 },
        { type: 'dirty', varName: 'items' },
        { type: 'flush', duration: 1.05, patchCount: 5 },
        { type: 'lis-reconcile', duration: 0.8, itemCount: 10 },
      ];

      function computePerformanceStats(events: Partial<ReactivityEvent>[]) {
        let fCount = 0;
        let fDur = 0;
        let pCount = 0;
        let rCount = 0;

        for (const ev of events) {
          if (ev.type === 'flush') {
            fCount++;
            if (ev.duration) fDur += ev.duration;
            if (ev.patchCount) pCount += ev.patchCount;
          } else if (ev.type === 'lis-reconcile') {
            rCount++;
          }
        }

        return {
          totalFlushes: fCount,
          avgFlushDuration: fCount > 0 ? (fDur / fCount).toFixed(2) : '0.00',
          totalPatches: pCount,
          totalReconciles: rCount,
        };
      }

      const stats = computePerformanceStats(mockEvents);
      expect(stats.totalFlushes).toBe(2);
      expect(stats.avgFlushDuration).toBe('0.75'); // (0.45 + 1.05) / 2 = 0.75
      expect(stats.totalPatches).toBe(7); // 2 + 5 = 7
      expect(stats.totalReconciles).toBe(1);
    });
  });
});
