import { ext } from './utils/ext.js';

try {
  ext.devtools.panels.create(
    'Drift',
    'assets/icon.png',
    'panel.html',
    () => {
      if (ext.runtime.lastError) {
        console.error('[DriftDevTools] Error creating panel:', ext.runtime.lastError);
      }
    }
  );
} catch (e) {
  console.error('[DriftDevTools] Failed to create panel:', e);
}
