import type { BenchmarkDef, FrameworkDef } from './types.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { gzipSync } from 'zlib';

function getFrameworkBundleSizes(framework?: FrameworkDef): { uncompressedBytes: number; compressedBytes: number } {
  if (!framework) return { uncompressedBytes: 0, compressedBytes: 0 };
  let uncompressedBytes = 0;
  let compressedBytes = 0;

  const distAssets = resolve(framework.dir, 'dist/assets');
  if (existsSync(distAssets)) {
    const files = readdirSync(distAssets).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const buf = readFileSync(resolve(distAssets, f));
      uncompressedBytes += buf.length;
      compressedBytes += gzipSync(buf).length;
    }
  } else {
    const mainJs = resolve(framework.dir, 'src/main.js');
    if (existsSync(mainJs)) {
      const buf = readFileSync(mainJs);
      uncompressedBytes += buf.length;
      compressedBytes += gzipSync(buf).length;
    }
  }

  return { uncompressedBytes, compressedBytes };
}

/**
 * Force garbage collection in Chromium via Chrome DevTools Protocol.
 */
async function forceGC(cdpSession: any) {
  if (cdpSession) {
    try {
      await cdpSession.send('HeapProfiler.collectGarbage');
    } catch {
      // Ignore if not supported
    }
  }
}

/**
 * Ensure table has exactly 0 rows.
 */
async function ensureEmptyTable(page: any) {
  const count = await page.locator('#tbody tr').count();
  if (count > 0) {
    await page.click('#clear').catch(() => {});
    await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 0, { timeout: 10000 }).catch(() => {});
  }
}

/**
 * Ensure table has exactly 1,000 rows.
 */
async function ensure1kRows(page: any) {
  const count = await page.locator('#tbody tr').count();
  if (count !== 1000) {
    await page.click('#run');
    await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 1000, { timeout: 15000 });
  }
}

/**
 * Ensure table has a clean set of 1,000 rows without modified labels.
 */
async function ensureClean1kRows(page: any) {
  await page.click('#run');
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#tbody tr');
    if (rows.length !== 1000) return false;
    const firstText = rows[0]?.querySelector('td:nth-child(2) a')?.textContent || '';
    return !firstText.includes('!!!');
  }, { timeout: 15000 });
}

/**
 * Measures end-to-end user interaction duration up to the next paint
 * using the W3C Event Timing API and trusted Playwright click dispatch.
 */
async function measureClick(page: any, selector: string): Promise<number> {
  const measurementPromise = page.evaluate((sel: string) => {
    return new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timed out waiting for click Event Timing entry on ${sel}`));
      }, 15000);

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEventTiming[]) {
          if (entry.name === 'click') {
            clearTimeout(timeout);
            observer.disconnect();
            resolve(entry.duration);
            return;
          }
        }
      });

      observer.observe({ type: 'event', durationThreshold: 0, buffered: false } as any);
    });
  }, selector);

  await page.click(selector);
  const duration = await measurementPromise;
  return Math.round(duration * 100) / 100;
}

export const BENCHMARKS: BenchmarkDef[] = [
  // ─── CPU Benchmarks ────────────────────────────────────────────────────────
  {
    id: '01_run1k',
    name: '01. Create 1,000 rows',
    category: 'cpu',
    description: 'Creates 1,000 table rows upon clicking #run.',
    unit: 'ms',
    warmupRuns: 5,
    runs: 15,
    run: async (page, cdpSession) => {
      await ensureEmptyTable(page);
      await forceGC(cdpSession);
      return measureClick(page, '#run');
    },
  },
  {
    id: '02_replace1k',
    name: '02. Replace 1,000 rows',
    category: 'cpu',
    description: 'Replaces all 1,000 rows with 1,000 new rows.',
    unit: 'ms',
    warmupRuns: 5,
    runs: 15,
    run: async (page, cdpSession) => {
      await ensure1kRows(page);
      await forceGC(cdpSession);
      return measureClick(page, '#run');
    },
  },
  {
    id: '03_update10th1k',
    name: '03. Update every 10th row (1k)',
    category: 'cpu',
    description: 'Updates every 10th row in a table of 1,000 rows.',
    unit: 'ms',
    warmupRuns: 3,
    runs: 15,
    cpuSlowdown: 4,
    run: async (page, cdpSession) => {
      await ensureClean1kRows(page);
      await forceGC(cdpSession);
      return measureClick(page, '#update');
    },
  },
  {
    id: '04_select1k',
    name: '04. Select row (1k)',
    category: 'cpu',
    description: 'Selects the 2nd row in a table of 1,000 rows.',
    unit: 'ms',
    warmupRuns: 5,
    runs: 25,
    cpuSlowdown: 4,
    run: async (page, cdpSession) => {
      await ensure1kRows(page);
      const isRow2Selected = await page.evaluate(() => document.querySelector('#tbody tr:nth-child(2)')?.classList.contains('danger') || false);
      if (isRow2Selected) {
        await page.click('#tbody tr:nth-child(3) a.lbl');
        await page.waitForFunction(() => !document.querySelector('#tbody tr:nth-child(2)')?.classList.contains('danger'), { timeout: 5000 });
      }
      await forceGC(cdpSession);
      return measureClick(page, '#tbody tr:nth-child(2) a.lbl');
    },
  },
  {
    id: '05_swap1k',
    name: '05. Swap rows (1k)',
    category: 'cpu',
    description: 'Swaps row 2 and row 999 in a table of 1,000 rows.',
    unit: 'ms',
    warmupRuns: 5,
    runs: 15,
    cpuSlowdown: 4,
    run: async (page, cdpSession) => {
      await ensure1kRows(page);
      await forceGC(cdpSession);
      return measureClick(page, '#swaprows');
    },
  },
  {
    id: '06_remove1k',
    name: '06. Remove single row (1k)',
    category: 'cpu',
    description: 'Removes the 2nd row from a table of 1,000 rows.',
    unit: 'ms',
    warmupRuns: 5,
    runs: 15,
    cpuSlowdown: 2,
    run: async (page, cdpSession) => {
      await ensure1kRows(page);
      await forceGC(cdpSession);
      return measureClick(page, '#tbody tr:nth-child(2) a.remove');
    },
  },
  {
    id: '07_create10k',
    name: '07. Create 10,000 rows',
    category: 'cpu',
    description: 'Creates 10,000 rows on an empty table.',
    unit: 'ms',
    warmupRuns: 5,
    runs: 15,
    run: async (page, cdpSession) => {
      await ensureEmptyTable(page);
      await forceGC(cdpSession);
      return measureClick(page, '#runlots');
    },
  },
  {
    id: '08_append1k',
    name: '08. Append 1,000 rows to 1k',
    category: 'cpu',
    description: 'Appends 1,000 rows to a table with 1,000 rows (total 2k rows).',
    unit: 'ms',
    warmupRuns: 5,
    runs: 15,
    run: async (page, cdpSession) => {
      await ensure1kRows(page);
      await forceGC(cdpSession);
      return measureClick(page, '#add');
    },
  },
  {
    id: '09_clear1k',
    name: '09. Clear 1,000 rows',
    category: 'cpu',
    description: 'Clears all 1,000 rows from the table.',
    unit: 'ms',
    warmupRuns: 5,
    runs: 15,
    cpuSlowdown: 4,
    run: async (page, cdpSession) => {
      await ensure1kRows(page);
      await forceGC(cdpSession);
      return measureClick(page, '#clear');
    },
  },

  // ─── Memory Benchmarks ─────────────────────────────────────────────────────
  {
    id: '21_readyMemory',
    name: '21. Ready Memory',
    category: 'memory',
    description: 'JS Heap memory usage immediately after loading the page.',
    unit: 'MB',
    warmupRuns: 0,
    runs: 1,
    run: async (page, cdpSession) => {
      await forceGC(cdpSession);
      const heapBytes = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0);
      return Math.round((heapBytes / (1024 * 1024)) * 100) / 100;
    },
  },
  {
    id: '22_runMemory',
    name: '22. Run Memory (1k rows)',
    category: 'memory',
    description: 'JS Heap memory usage after rendering 1,000 rows.',
    unit: 'MB',
    warmupRuns: 0,
    runs: 1,
    run: async (page, cdpSession) => {
      await ensure1kRows(page);
      await forceGC(cdpSession);
      const heapBytes = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0);
      return Math.round((heapBytes / (1024 * 1024)) * 100) / 100;
    },
  },
  {
    id: '25_clearMemory',
    name: '25. Run-Clear Memory',
    category: 'memory',
    description: 'JS Heap memory usage after creating and clearing 1k rows 5 times.',
    unit: 'MB',
    warmupRuns: 0,
    runs: 1,
    run: async (page, cdpSession) => {
      for (let i = 0; i < 5; i++) {
        await page.click('#run');
        await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 1000, { timeout: 10000 });
        await page.click('#clear');
        await page.waitForFunction(() => document.querySelectorAll('#tbody tr').length === 0, { timeout: 10000 });
      }
      await forceGC(cdpSession);
      const heapBytes = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0);
      return Math.round((heapBytes / (1024 * 1024)) * 100) / 100;
    },
  },

  // ─── Startup & Size Benchmarks ─────────────────────────────────────────────
  {
    id: '41_uncompressedSize',
    name: '41. Uncompressed Size',
    category: 'startup',
    description: 'Total uncompressed JS bundle size on disk.',
    unit: 'kB',
    warmupRuns: 0,
    runs: 1,
    run: async (page, cdpSession, config, framework) => {
      const { uncompressedBytes } = getFrameworkBundleSizes(framework);
      return Math.round((uncompressedBytes / 1024) * 10) / 10;
    },
  },
  {
    id: '42_compressedSize',
    name: '42. Compressed Size',
    category: 'startup',
    description: 'Total gzipped JS bundle size.',
    unit: 'kB',
    warmupRuns: 0,
    runs: 1,
    run: async (page, cdpSession, config, framework) => {
      const { compressedBytes } = getFrameworkBundleSizes(framework);
      return Math.round((compressedBytes / 1024) * 10) / 10;
    },
  },
  {
    id: '43_firstPaint',
    name: '43. First Paint',
    category: 'startup',
    description: 'Time in ms to First Contentful Paint / Initial Paint.',
    unit: 'ms',
    warmupRuns: 0,
    runs: 3,
    run: async (page) => {
      await page.reload({ waitUntil: 'networkidle' });
      const paintTime = await page.evaluate(() => {
        const entries = performance.getEntriesByType('paint');
        const fcp = entries.find((e) => e.name === 'first-contentful-paint') || entries[0];
        return fcp ? fcp.startTime : performance.timing.domInteractive - performance.timing.navigationStart;
      });
      return Math.round(paintTime * 10) / 10;
    },
  },
];
