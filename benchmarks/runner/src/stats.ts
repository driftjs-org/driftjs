/**
 * Computes the arithmetic mean of an array of numbers.
 * Note: Per project benchmark rules, only arithmetic mean is used across runs.
 */
export function computeMean(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / values.length;
  return Math.round(mean * 100) / 100;
}

/**
 * Formats a metric value with appropriate precision.
 */
export function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined || Number.isNaN(value)) return '-';
  if (unit === 'MB' || unit === 'kB') {
    return value.toFixed(2);
  }
  return value >= 100 ? value.toFixed(1) : value.toFixed(2);
}

/**
 * Computes relative slowdown factors against the fastest (minimum) value.
 * In accordance with js-framework-benchmark methodology, the fastest
 * framework receives 1.00x and all other frameworks receive >= 1.00x.
 */
export function computeFactors(values: Record<string, number>): Record<string, number> {
  const numericValues = Object.values(values).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
  );
  if (numericValues.length === 0) return {};

  const minVal = Math.min(...numericValues);
  const factors: Record<string, number> = {};

  for (const [k, v] of Object.entries(values)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      factors[k] = Math.round((v / minVal) * 100) / 100;
    }
  }

  return factors;
}

/**
 * Computes the geometric mean of an array of factors:
 * Geometric Mean = (f1 * f2 * ... * fn)^(1/n)
 */
export function computeGeometricMean(factors: number[]): number {
  const valid = factors.filter((f): f is number => typeof f === 'number' && Number.isFinite(f) && f > 0);
  if (valid.length === 0) return 1;

  const product = valid.reduce((acc, f) => acc * f, 1);
  const gm = Math.pow(product, 1 / valid.length);
  return Math.round(gm * 100) / 100;
}
