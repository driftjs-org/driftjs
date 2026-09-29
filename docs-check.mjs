import { chromium } from 'playwright';

const url = 'http://localhost:5210/ssg/content-collections/';
const browser = await chromium.launch();

for (const [w, h] of [[1280, 900], [500, 800], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const island = page.locator('[data-drift-island="DriftCodeEditor"]');
  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-drift-island="DriftCodeEditor"]');
    const left = el.querySelector('.editor-component-left');
    const right = el.querySelector('.editor-component-right');
    const lb = left.getBoundingClientRect();
    const rb = right.getBoundingClientRect();
    const shell = document.querySelector('.playground-shell, .docs-shell, body');
    return {
      monaco: !!el.querySelector('.monaco-editor'),
      status: el.querySelector('.status-pill')?.textContent.trim(),
      stacked: rb.top > lb.bottom - 1,
      sideBySide: rb.left > lb.right - 1,
      leftH: Math.round(lb.height),
      rightH: Math.round(rb.height),
      pageScrollable: document.documentElement.scrollHeight - window.innerHeight,
    };
  });

  // Interact with the live editor: click Increment in the preview and read the counter
  const h2 = island.locator('.preview-host h2').first();
  const before = await h2.textContent().catch(() => null);
  await island.locator('.preview-host button').first().click();
  await page.waitForTimeout(250);
  const after = await h2.textContent().catch(() => null);

  console.log(`${w}x${h}`, JSON.stringify({ ...info, previewBefore: before, previewAfter: after }));
  await page.close();
}
await browser.close();
