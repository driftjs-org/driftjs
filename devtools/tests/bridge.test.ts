import { describe, it, expect } from 'vitest';
import { DevToolsBridge } from '../src/bridge.js';

describe('DriftJS DevTools Bridge Protocol', () => {
  it('instantiates bridge cleanly without throwing when browser runtime is not attached', () => {
    const bridge = new DevToolsBridge();
    expect(bridge).toBeDefined();

    // Calling post without port should not throw
    expect(() => {
      bridge.refreshTree();
      bridge.highlightVM('vm-1');
      bridge.unhighlightVM();
      bridge.updateScopeVar('vm-1', 'count', 99);
    }).not.toThrow();
  });

  it('triggers registered callbacks when receiving messages', () => {
    let detectedVer = '';
    let detectedCount = 0;

    const bridge = new DevToolsBridge({
      onDetected(ver, count) {
        detectedVer = ver;
        detectedCount = count;
      },
    });

    (bridge as any).handleMessage({
      type: 'DRIFT_DETECTED',
      payload: { version: '0.0.16', vmCount: 3 },
    });

    expect(detectedVer).toBe('0.0.16');
    expect(detectedCount).toBe(3);
  });
});
