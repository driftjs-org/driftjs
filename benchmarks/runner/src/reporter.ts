import type { BenchmarkReport } from './types.js';
import { FRAMEWORKS } from './frameworks.js';
import { computeFactors, computeGeometricMean } from './stats.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

function normalizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function saveReport(report: BenchmarkReport, outputDir: string): { jsonPath: string } {
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, 'results.json');

  let finalReport = report;

  if (existsSync(jsonPath)) {
    try {
      const existing: BenchmarkReport = JSON.parse(readFileSync(jsonPath, 'utf-8'));
      if (existing && Array.isArray(existing.tables)) {
        for (const newTable of report.tables) {
          const existingTable = existing.tables.find(t => t.category === newTable.category);
          if (existingTable) {
            // Merge rows with normalized id matching
            for (const newRow of newTable.rows) {
              const normNewId = normalizeId(newRow.id);
              const existingRow = existingTable.rows.find(r => normalizeId(r.id) === normNewId);

              if (existingRow) {
                existingRow.id = newRow.id;
                existingRow.name = newRow.name;
                existingRow.description = newRow.description;
                existingRow.unit = newRow.unit;

                Object.assign(existingRow.values, newRow.values);
              } else {
                existingTable.rows.push(newRow);
              }
            }

            // Recalculate factors for all rows against fastest (minimum) value
            for (const row of existingTable.rows) {
              row.factors = computeFactors(row.values);
            }

            // Collect all framework IDs present across rows
            const presentFrameworkIds = new Set<string>();
            for (const row of existingTable.rows) {
              for (const fwId of Object.keys(row.values)) {
                presentFrameworkIds.add(fwId);
              }
            }

            // Recompute geometric mean of all factors in the table for each framework
            const geometricMean: Record<string, number> = {};
            for (const fwId of presentFrameworkIds) {
              const fwFactors = existingTable.rows
                .map(r => r.factors[fwId])
                .filter((f): f is number => typeof f === 'number' && Number.isFinite(f));
              if (fwFactors.length > 0) {
                geometricMean[fwId] = computeGeometricMean(fwFactors);
              }
            }
            existingTable.geometricMean = geometricMean;

            // Sort present frameworks by geometric mean ascending
            const sortedFwIds = Array.from(presentFrameworkIds).sort((a, b) => {
              const gmA = geometricMean[a] ?? Infinity;
              const gmB = geometricMean[b] ?? Infinity;
              return gmA - gmB;
            });

            const orderedHeaders = ['Metric / Benchmark', 'Unit'];
            for (const fwId of sortedFwIds) {
              const fwDef = FRAMEWORKS.find(f => f.id === fwId);
              const name = fwDef ? fwDef.name : fwId;
              orderedHeaders.push(name);
            }

            existingTable.headers = orderedHeaders;
          } else {
            existing.tables.push(newTable);
          }
        }
        existing.timestamp = report.timestamp;
        existing.runs = report.runs;
        finalReport = existing;
      }
    } catch {
      // Fallback to fresh report
    }
  }

  const jsonContent = JSON.stringify(finalReport, null, 2);
  writeFileSync(jsonPath, jsonContent, 'utf-8');

  // Also sync to dist if dist folder exists
  const distDir = resolve(outputDir, '../dist');
  if (existsSync(distDir)) {
    try {
      writeFileSync(resolve(distDir, 'results.json'), jsonContent, 'utf-8');
    } catch {}
  }

  return { jsonPath };
}
