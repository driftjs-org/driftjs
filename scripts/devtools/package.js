import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const devtoolDir = path.join(rootDir, 'devtool');

/**
 * Creates a standard PKZIP archive from an array of { name, data } entries.
 */
export function createZipBuffer(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const uncompressedSize = data.length;
    const crc = zlib.crc32(data);
    const compressed = zlib.deflateRawSync(data);
    const compressedSize = compressed.length;

    // Local file header (30 bytes + filename)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // Local header signature
    lh.writeUInt16LE(20, 4);         // Version needed: 2.0
    lh.writeUInt16LE(0, 6);          // General purpose bit flag
    lh.writeUInt16LE(8, 8);          // Compression method: 8 (Deflate)
    lh.writeUInt16LE(0, 10);         // Last mod file time
    lh.writeUInt16LE(0, 12);         // Last mod file date
    lh.writeUInt32LE(crc, 14);       // CRC32
    lh.writeUInt32LE(compressedSize, 18);
    lh.writeUInt32LE(uncompressedSize, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);         // Extra field length
    nameBuf.copy(lh, 30);

    // Central directory header (46 bytes + filename)
    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0); // Central directory signature
    ch.writeUInt16LE(20, 4);         // Version made by: 2.0
    ch.writeUInt16LE(20, 6);         // Version needed: 2.0
    ch.writeUInt16LE(0, 8);          // General purpose bit flag
    ch.writeUInt16LE(8, 10);         // Compression: Deflate
    ch.writeUInt16LE(0, 12);         // Mod time
    ch.writeUInt16LE(0, 14);         // Mod date
    ch.writeUInt32LE(crc, 16);       // CRC32
    ch.writeUInt32LE(compressedSize, 20);
    ch.writeUInt32LE(uncompressedSize, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);         // Extra field length
    ch.writeUInt16LE(0, 32);         // File comment length
    ch.writeUInt16LE(0, 34);         // Disk number start
    ch.writeUInt16LE(0, 36);         // Internal file attributes
    ch.writeUInt32LE(0, 38);         // External file attributes
    ch.writeUInt32LE(offset, 42);    // Relative offset of local header
    nameBuf.copy(ch, 46);

    localHeaders.push(lh, compressed);
    centralHeaders.push(ch);
    offset += lh.length + compressed.length;
  }

  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central dir signature
  eocd.writeUInt16LE(0, 4);          // Disk number
  eocd.writeUInt16LE(0, 6);          // Start disk
  eocd.writeUInt16LE(entries.length, 8);  // Entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total entries
  eocd.writeUInt32LE(centralDirSize, 12); // Central dir size
  eocd.writeUInt32LE(offset, 16);         // Offset of central directory
  eocd.writeUInt16LE(0, 20);              // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * Recursively collects all files in dir.
 */
export function collectFiles(dir, baseDir = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({
        name: relPath,
        data: fs.readFileSync(fullPath),
      });
    }
  }
  return results;
}

/**
 * Packages a dist target directory into a .zip file inside devtool/.
 */
export function packageTarget(target, baseDir = devtoolDir) {
  const distDir = path.join(baseDir, 'dist', target);
  if (!fs.existsSync(distDir)) {
    console.error(`[package-devtools] Error: Target dist directory does not exist: ${distDir}`);
    return false;
  }

  const outZip = path.join(baseDir, `drift-devtools-${target}.zip`);
  const files = collectFiles(distDir);
  if (files.length === 0) {
    console.error(`[package-devtools] Error: No files found in ${distDir}`);
    return false;
  }

  const zipBuf = createZipBuffer(files);
  fs.writeFileSync(outZip, zipBuf);
  console.log(`[package-devtools] Packaged ${target} (${files.length} files) -> ${path.relative(rootDir, outZip)} (${(zipBuf.length / 1024).toFixed(1)} KB)`);
  return true;
}

// Direct execution
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  const targetArg = process.argv[2] ? process.argv[2].toLowerCase() : 'all';
  const targets = targetArg === 'all' ? ['firefox', 'chrome'] : [targetArg];

  for (const t of targets) {
    if (t === 'firefox' || t === 'chrome') {
      packageTarget(t);
    } else {
      console.warn(`[package-devtools] Unknown target: ${t}. Expected 'firefox', 'chrome', or 'all'.`);
    }
  }
}
