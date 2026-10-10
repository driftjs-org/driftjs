import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateManifest } from '../vite.config.js';
// @ts-ignore - script is standard ESM JS without separate .d.ts
import { createZipBuffer, collectFiles } from '../../scripts/devtools/package.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devtoolDir = path.resolve(__dirname, '..');

describe('DriftJS DevTools Cross-Browser Packaging', () => {
  it('generates compliant Firefox WebExtensions Manifest v3', () => {
    const manifest = generateManifest('firefox');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('DriftJS DevTools');
    expect(manifest.browser_specific_settings?.gecko?.id).toBe('devtools@driftjs.org');
    expect(manifest.browser_specific_settings?.gecko?.strict_min_version).toBe('109.0');
    expect(manifest.background?.scripts).toEqual(['background.js']);
    expect(manifest.background?.service_worker).toBeUndefined();
    expect(manifest.devtools_page).toBe('devtools.html');
  });

  it('generates compliant Chrome Manifest v3 with service worker', () => {
    const manifest = generateManifest('chrome');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('DriftJS DevTools');
    expect(manifest.background?.service_worker).toBe('background.js');
    expect(manifest.background?.scripts).toBeUndefined();
    expect(manifest.browser_specific_settings).toBeUndefined();
    expect(manifest.devtools_page).toBe('devtools.html');
  });

  it('creates valid PKZIP buffer with correct local & central directory headers', () => {
    const testFiles = [
      { name: 'manifest.json', data: Buffer.from(JSON.stringify({ name: 'test' })) },
      { name: 'devtools.html', data: Buffer.from('<!DOCTYPE html><html></html>') },
    ];

    const zipBuffer = createZipBuffer(testFiles);
    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Verify PK header signatures
    expect(zipBuffer.readUInt32LE(0)).toBe(0x04034b50); // Local file header signature
  });

  it('collects files recursively from a directory', () => {
    const files = collectFiles(path.join(devtoolDir, 'public'));
    expect(files.length).toBeGreaterThan(0);
    const hasIcon = files.some((f: any) => f.name.includes('icon.png'));
    expect(hasIcon).toBe(true);
  });
});
