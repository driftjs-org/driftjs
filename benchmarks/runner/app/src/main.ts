interface BenchmarkTableRow {
  id: string;
  name: string;
  description: string;
  unit: string;
  values: Record<string, number>;
  factors: Record<string, number>;
}

interface BenchmarkTable {
  category: 'cpu' | 'memory' | 'startup';
  title: string;
  headers: string[];
  rows: BenchmarkTableRow[];
  geometricMean?: Record<string, number>;
}

interface BenchmarkReport {
  timestamp: string;
  runs?: number;
  tables: BenchmarkTable[];
}

const FRAMEWORK_NAMES: Record<string, string> = {
  vanilla: 'VanillaJS',
  drift: 'DriftJS',
  solid: 'SolidJS',
  vue: 'Vue',
  svelte: 'Svelte',
  angular: 'Angular',
  react: 'React',
  ember: 'Ember',
};

function getFrameworkKey(nameOrKey: string): string {
  if (!nameOrKey) return '';
  const lower = nameOrKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const key of Object.keys(FRAMEWORK_NAMES)) {
    if (lower === key || lower.startsWith(key)) {
      return key;
    }
  }
  return lower;
}

function getFrameworkName(nameOrKey: string): string {
  const key = getFrameworkKey(nameOrKey);
  return FRAMEWORK_NAMES[key] || nameOrKey;
}

// Global App State
let currentReport: BenchmarkReport | null = null;
let currentView: 'table' | 'graphs' = getRouteFromLocation();
let chartMode: 'values' | 'factors' = 'values';
let selectedCategory: string = 'all';
const hiddenFrameworks = new Set<string>();

function getRouteFromLocation(): 'table' | 'graphs' {
  const hash = window.location.hash.toLowerCase();
  if (hash.startsWith('#/graph') || hash.startsWith('#/chart')) {
    return 'graphs';
  }
  return 'table';
}

function navigateTo(view: 'table' | 'graphs') {
  currentView = view;
  const targetHash = view === 'graphs' ? '#/graphs' : '#/tables';
  if (window.location.hash !== targetHash) {
    history.pushState(null, '', targetHash);
  }
  render();
}

window.addEventListener('popstate', () => {
  currentView = getRouteFromLocation();
  render();
});

window.addEventListener('hashchange', () => {
  currentView = getRouteFromLocation();
  render();
});

function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) return '-';
  if (unit === 'MB' || unit === 'kB') {
    return value.toFixed(2);
  }
  return value >= 100 ? value.toFixed(1) : value.toFixed(2);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getRowValue(row: BenchmarkTableRow, fName: string): number | undefined {
  if (!row || !row.values) return undefined;
  const fKey = getFrameworkKey(fName);
  for (const [k, v] of Object.entries(row.values)) {
    if (getFrameworkKey(k) === fKey) {
      return v;
    }
  }
  return row.values[fName];
}

function getRowMin(row: BenchmarkTableRow): number | undefined {
  if (!row || !row.values) return undefined;
  const numericValues = Object.values(row.values).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
  );
  if (numericValues.length === 0) return undefined;
  return Math.min(...numericValues);
}

function getRowFactor(row: BenchmarkTableRow, fName: string): number | undefined {
  if (!row) return undefined;
  const val = getRowValue(row, fName);
  const minVal = getRowMin(row);
  if (typeof val === 'number' && typeof minVal === 'number' && minVal > 0 && Number.isFinite(val) && Number.isFinite(minVal)) {
    return Math.round((val / minVal) * 100) / 100;
  }
  return undefined;
}

function computeTableGeometricMean(table: BenchmarkTable, fName: string): number | undefined {
  const factors = table.rows
    .map(row => getRowFactor(row, fName))
    .filter((f): f is number => typeof f === 'number' && Number.isFinite(f) && f > 0);

  if (factors.length === 0) return undefined;
  const product = factors.reduce((acc, f) => acc * f, 1);
  const gm = Math.pow(product, 1 / factors.length);
  return Math.round(gm * 100) / 100;
}

/**
 * Continuous color scaling for benchmark cells based on factor / geometric mean.
 * 1.00x (baseline / fastest) scales to green (rgb(99, 191, 124)).
 * maxFactor (worst factor in the set) scales to red (rgb(249, 105, 108)).
 * Values in between continuously interpolate through yellow (rgb(254, 230, 130)).
 */
function getFactorColor(factor: number | undefined, maxFactor: number | undefined): string {
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0) {
    return '';
  }

  const max = typeof maxFactor === 'number' && Number.isFinite(maxFactor) && maxFactor > 1
    ? maxFactor
    : 1;

  // Normalized scaling position t from 0.0 (fastest / 1.00x) to 1.0 (worst / maxFactor)
  const t = max > 1 ? Math.max(0, Math.min(1, (factor - 1) / (max - 1))) : 0;

  // Continuous 2-phase interpolation:
  // t = 0.0 -> Green: rgb(99, 191, 124)
  // t = 0.5 -> Yellow: rgb(254, 230, 130)
  // t = 1.0 -> Red: rgb(249, 105, 108)
  let r: number, g: number, b: number;
  if (t <= 0.5) {
    const u = t * 2;
    r = Math.round(99 + (254 - 99) * u);
    g = Math.round(191 + (230 - 191) * u);
    b = Math.round(124 + (130 - 124) * u);
  } else {
    const u = (t - 0.5) * 2;
    r = Math.round(254 + (249 - 254) * u);
    g = Math.round(230 + (105 - 230) * u);
    b = Math.round(130 + (108 - 130) * u);
  }

  return `background-color: rgb(${r}, ${g}, ${b}); color: rgb(0, 0, 0);`;
}

// ---------------------------------------------------------------------------
// TABLE VIEW RENDERING
// ---------------------------------------------------------------------------

function renderTable(table: BenchmarkTable): string {
  if (!table.rows || table.rows.length === 0) return '';

  const rawFrameworks = table.headers.slice(2);

  // Arrange framework columns in ascending order of their overall geometric mean
  const sortedFrameworks = [...rawFrameworks].sort((a, b) => {
    const gmA = computeTableGeometricMean(table, a) ?? Infinity;
    const gmB = computeTableGeometricMean(table, b) ?? Infinity;
    return gmA - gmB;
  });

  const frameworks = sortedFrameworks;

  const headerCells = [
    table.headers[0] || 'Metric / Benchmark',
    table.headers[1] || 'Unit',
    ...frameworks,
  ].map((h, i) => {
    const isFirst = i === 0;
    const isSecond = i === 1;
    const alignClass = isFirst || isSecond ? '' : 'th-framework';
    const label = isFirst || isSecond ? h : getFrameworkName(h);
    return `<th class="${alignClass}">${escapeHtml(label)}</th>`;
  }).join('\n            ');

  const bodyRows = table.rows.map(row => {
    const minVal = getRowMin(row);
    const rowFactors = frameworks
      .map(fName => {
        const val = getRowValue(row, fName);
        return getRowFactor(row, fName) ?? (typeof val === 'number' && typeof minVal === 'number' && minVal > 0 ? val / minVal : undefined);
      })
      .filter((f): f is number => typeof f === 'number' && Number.isFinite(f) && f > 0);
    const rowMaxFactor = rowFactors.length > 0 ? Math.max(...rowFactors) : 1;

    const valCells = frameworks.map(fName => {
      const val = getRowValue(row, fName);
      const formatted = formatValue(val, row.unit);
      const factor = getRowFactor(row, fName) ?? (typeof val === 'number' && typeof minVal === 'number' && minVal > 0 ? val / minVal : undefined);

      let factorBadge = '';
      if (typeof factor === 'number' && Number.isFinite(factor)) {
        const factorStr = factor.toFixed(2) + 'x';
        factorBadge = `<span class="factor">(${factorStr})</span>`;
      }

      const cellColorStyle = getFactorColor(factor, rowMaxFactor);
      const styleAttr = cellColorStyle ? ` style="${cellColorStyle}"` : '';

      return `<td class="num"${styleAttr}>${formatted} ${factorBadge}</td>`;
    }).join('\n            ');

    return `
          <tr>
            <td class="name">
              <strong>${escapeHtml(row.name)}</strong>
              <div class="desc">${escapeHtml(row.description)}</div>
            </td>
            <td class="unit">${escapeHtml(row.unit)}</td>
            ${valCells}
          </tr>`;
  }).join('\n');

  // Compute geometric mean of factors across all rows for each framework
  const geomeans = frameworks.map(fName => computeTableGeometricMean(table, fName));
  const validGeomeans = geomeans.filter((gm): gm is number => typeof gm === 'number' && Number.isFinite(gm) && gm > 0);
  const tableMaxGeomean = validGeomeans.length > 0 ? Math.max(...validGeomeans) : 1;

  const geomeanCells = frameworks.map(fName => {
    const gm = computeTableGeometricMean(table, fName);
    const formatted = typeof gm === 'number' ? gm.toFixed(2) + 'x' : '-';
    const cellColorStyle = getFactorColor(gm, tableMaxGeomean);
    const styleAttr = cellColorStyle ? ` style="${cellColorStyle}"` : '';
    return `<td class="num geomean-val"${styleAttr}><strong>${formatted}</strong></td>`;
  }).join('\n            ');

  const tfootHtml = `
          <tfoot>
            <tr class="geometric-mean-row">
              <td class="name">
                <strong>Geometric Mean</strong>
                <div class="desc">Geometric mean of all factors in the table</div>
              </td>
              <td class="unit">factor</td>
              ${geomeanCells}
            </tr>
          </tfoot>`;

  return `
    <section class="section-card">
      <div class="section-header">
        <h2>${escapeHtml(table.title)}</h2>
        <span class="badge">${table.rows.length} ${table.rows.length === 1 ? 'Metric' : 'Metrics'}</span>
      </div>
      <div class="table-container">
        <table class="bench-table">
          <thead>
            <tr>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
          ${tfootHtml}
        </table>
      </div>
    </section>
  `;
}

function renderTableView(report: BenchmarkReport): string {
  const validTables = (report.tables || []).filter(t => t.rows && t.rows.length > 0);
  if (validTables.length === 0) {
    return `
      <div class="section-card empty-state">
        <h3>No benchmark results available</h3>
        <p>Run <code>pnpm bench</code> in the repository root to generate results.json.</p>
      </div>
    `;
  }

  const tablesHtml = validTables.map(renderTable).join('\n');

  return `
    <div class="view-banner">
      <div class="view-banner-text">
        <h3>📊 Graphical Visualization Available</h3>
        <p>Compare performance charts and slowdown factors across frameworks side-by-side.</p>
      </div>
      <button type="button" id="btn-banner-to-graphs" class="btn btn-primary btn-cta">
        <span>📊 View Graphical Charts</span>
      </button>
    </div>
    ${tablesHtml}
  `;
}

// ---------------------------------------------------------------------------
// GRAPH VIEW RENDERING
// ---------------------------------------------------------------------------

function getAllFrameworksFromReport(report: BenchmarkReport): { key: string; name: string }[] {
  const seen = new Map<string, { key: string; name: string }>();
  for (const table of report.tables) {
    if (!table.headers) continue;
    const fwHeaders = table.headers.slice(2);
    const sortedHeaders = [...fwHeaders].sort((a, b) => {
      const gmA = computeTableGeometricMean(table, a) ?? Infinity;
      const gmB = computeTableGeometricMean(table, b) ?? Infinity;
      return gmA - gmB;
    });
    for (const h of sortedHeaders) {
      const key = getFrameworkKey(h);
      if (key && !seen.has(key)) {
        seen.set(key, { key, name: getFrameworkName(h) });
      }
    }
  }
  return Array.from(seen.values());
}

function renderSummaryCard(report: BenchmarkReport): string {
  let totalMetrics = 0;
  const totalCategories = report.tables.length;
  let frameworksCount = 0;
  if (report.tables[0] && report.tables[0].headers) {
    frameworksCount = Math.max(0, report.tables[0].headers.length - 2);
  }

  for (const table of report.tables) {
    totalMetrics += (table.rows ? table.rows.length : 0);
  }

  return `
    <div class="summary-card">
      <div class="summary-header">
        <div class="summary-title-wrap">
          <h3>Benchmark Summary Overview</h3>
        </div>
        <span class="summary-subtitle">Statistical arithmetic mean aggregation across metrics</span>
      </div>
      <div class="summary-grid">
        <div class="summary-stat-box">
          <span class="stat-value">${totalMetrics}</span>
          <span class="stat-label">Total Benchmarks</span>
          <span class="stat-sub">Across ${totalCategories} categories</span>
        </div>
        <div class="summary-stat-box">
          <span class="stat-value">${frameworksCount}</span>
          <span class="stat-label">Compared Frameworks</span>
          <span class="stat-sub">Baseline: Fastest Framework (1.00x)</span>
        </div>
        <div class="summary-stat-box">
          <span class="stat-value">Arithmetic Mean</span>
          <span class="stat-label">Metric Aggregation</span>
          <span class="stat-sub">Across measured iterations</span>
        </div>
        <div class="summary-stat-box">
          <span class="stat-value">${report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'N/A'}</span>
          <span class="stat-label">Execution Date</span>
          <span class="stat-sub">Report timestamp</span>
        </div>
      </div>
    </div>
  `;
}

function renderMetricChart(row: BenchmarkTableRow, headers: string[]): string {
  const frameworks = headers.slice(2);
  const dataPoints: {
    name: string;
    key: string;
    value: number;
    factor: number;
    formatted: string;
  }[] = [];

  for (const fName of frameworks) {
    const key = getFrameworkKey(fName);
    if (!key || hiddenFrameworks.has(key)) continue;

    const val = getRowValue(row, fName);
    if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) continue;

    const factor = getRowFactor(row, fName) || 1;

    dataPoints.push({
      name: getFrameworkName(fName),
      key,
      value: val,
      factor: Number.isFinite(factor) ? factor : 1,
      formatted: formatValue(val, row.unit),
    });
  }

  if (dataPoints.length === 0) {
    return `
      <div class="chart-card chart-card-empty">
        <div class="chart-card-header">
          <div class="chart-card-title-group">
            <h4>${escapeHtml(row.name)}</h4>
            <p class="chart-card-desc">${escapeHtml(row.description)}</p>
          </div>
          <div class="chart-card-meta">
            <span class="unit-tag">${escapeHtml(row.unit)}</span>
          </div>
        </div>
        <div class="chart-empty-msg">No frameworks selected to display. Click framework chips above to enable.</div>
      </div>
    `;
  }

  const validValues = dataPoints.map(d => d.value).filter(v => Number.isFinite(v) && v > 0);
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 1;

  const validFactors = dataPoints.map(d => d.factor).filter(f => Number.isFinite(f) && f > 0);
  const maxFactor = validFactors.length > 0 ? Math.max(...validFactors) : 1;

  const barsHtml = dataPoints.map(item => {
    const rawPct = chartMode === 'values'
      ? (item.value / maxValue) * 100
      : (item.factor / maxFactor) * 100;

    const widthPct = Number.isFinite(rawPct)
      ? Math.max(4, Math.min(100, Math.round(rawPct)))
      : 4;

    return `
      <div class="chart-row">
        <div class="chart-label">
          <span class="fw-name">${escapeHtml(item.name)}</span>
        </div>
        <div class="chart-bar-area">
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${widthPct}%;"></div>
          </div>
        </div>
        <div class="chart-values">
          <span class="chart-val-num">${item.formatted} ${escapeHtml(row.unit)}</span>
          <span class="chart-val-factor">(${item.factor.toFixed(2)}x)</span>
        </div>
      </div>
    `;
  }).join('\n');

  return `
    <div class="chart-card">
      <div class="chart-card-header">
        <div class="chart-card-title-group">
          <h4>${escapeHtml(row.name)}</h4>
          <p class="chart-card-desc">${escapeHtml(row.description)}</p>
        </div>
        <div class="chart-card-meta">
          <span class="unit-tag">${escapeHtml(row.unit)}</span>
        </div>
      </div>
      <div class="chart-card-body">
        ${barsHtml}
      </div>
    </div>
  `;
}

function renderCategorySection(table: BenchmarkTable): string {
  if (!table.rows || table.rows.length === 0) return '';

  const chartCardsHtml = table.rows
    .map(row => renderMetricChart(row, table.headers))
    .join('\n');

  return `
    <section class="section-card chart-section">
      <div class="section-header">
        <h2>${escapeHtml(table.title)}</h2>
        <span class="badge">${table.rows.length} ${table.rows.length === 1 ? 'Benchmark' : 'Benchmarks'}</span>
      </div>
      <div class="charts-container">
        ${chartCardsHtml}
      </div>
    </section>
  `;
}

function renderGraphsView(report: BenchmarkReport): string {
  const validTables = (report.tables || []).filter(t => t.rows && t.rows.length > 0);
  if (validTables.length === 0) {
    return `
      <div class="section-card empty-state">
        <h3>No benchmark results available</h3>
        <p>Run <code>pnpm bench</code> in the repository root to generate results.json.</p>
      </div>
    `;
  }

  const allFrameworks = getAllFrameworksFromReport(report);

  // Framework toggle chips
  const fwChipsHtml = allFrameworks.map(fw => {
    const isHidden = hiddenFrameworks.has(fw.key);
    return `
      <button type="button" class="chip-btn ${isHidden ? 'chip-disabled' : 'chip-active'}" data-fw="${escapeHtml(fw.key)}">
        <span>${escapeHtml(fw.name)}</span>
      </button>
    `;
  }).join('\n');

  // Filter tables by selected category
  const filteredTables = selectedCategory === 'all'
    ? validTables
    : validTables.filter(t => t.category === selectedCategory);

  const sectionsHtml = filteredTables.map(renderCategorySection).join('\n');

  return `
    <!-- Top Graph Controls & Actions -->
    <div class="graph-toolbar">
      <div class="toolbar-left">
        <button type="button" id="btn-back-to-tables" class="btn btn-secondary">
          <span>📋 Back to Table View</span>
        </button>
        
        <!-- Mode Switcher: Raw Values vs Slowdown Factor -->
        <div class="segmented-control">
          <button type="button" class="seg-btn ${chartMode === 'values' ? 'seg-active' : ''}" id="btn-mode-values">
            <span>📊 Raw Values</span>
          </button>
          <button type="button" class="seg-btn ${chartMode === 'factors' ? 'seg-active' : ''}" id="btn-mode-factors">
            <span>⚡ Slowdown Factor (vs Vanilla)</span>
          </button>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="category-pills">
        <button type="button" class="cat-pill ${selectedCategory === 'all' ? 'cat-active' : ''}" data-cat="all">All (${validTables.length})</button>
        <button type="button" class="cat-pill ${selectedCategory === 'cpu' ? 'cat-active' : ''}" data-cat="cpu">1. CPU</button>
        <button type="button" class="cat-pill ${selectedCategory === 'memory' ? 'cat-active' : ''}" data-cat="memory">2. Memory</button>
        <button type="button" class="cat-pill ${selectedCategory === 'startup' ? 'cat-active' : ''}" data-cat="startup">3. Startup & Size</button>
      </div>
    </div>

    <!-- Framework Filter Bar -->
    <div class="fw-filter-bar">
      <span class="fw-filter-label">Filter Frameworks:</span>
      <div class="fw-chips-list">
        ${fwChipsHtml}
      </div>
    </div>

    <!-- Summary Overview -->
    ${renderSummaryCard(report)}

    <!-- Charts Grouped by Category -->
    ${sectionsHtml}
  `;
}

// ---------------------------------------------------------------------------
// MAIN APP SHELL & PURE DOM RENDERING
// ---------------------------------------------------------------------------

function renderApp(report: BenchmarkReport) {
  currentReport = report;
  const app = document.getElementById('app');
  if (!app) return;

  const validTables = (report.tables || []).filter(t => t.rows && t.rows.length > 0);
  const formattedDate = report.timestamp ? new Date(report.timestamp).toLocaleString() : 'N/A';

  const isTable = currentView === 'table';
  const isGraphs = currentView === 'graphs';

  app.innerHTML = `
    <div class="container">
      <header>
        <div class="header-top">
          <div class="header-brand">
            <h1>DriftJS Framework Benchmark Results</h1>
            <p>Benchmark suite clone modeled after <code>js-framework-benchmark</code> measuring CPU durations, memory footprint, and startup metrics.</p>
          </div>
          
          <div class="header-actions">
            <!-- View Navigation Switcher -->
            <div class="nav-view-switcher">
              <button type="button" id="nav-btn-table" class="nav-view-btn ${isTable ? 'nav-view-active' : ''}">
                <span>📋 Table View</span>
              </button>
              <button type="button" id="nav-btn-graphs" class="nav-view-btn ${isGraphs ? 'nav-view-active' : ''}">
                <span>📊 Graph View</span>
              </button>
            </div>

            <!-- Upload Custom results.json -->
            <label class="file-upload-btn">
              <span>📁 Load results.json</span>
              <input type="file" id="json-input" class="file-upload-input" accept=".json">
            </label>
          </div>
        </div>

        <div class="meta-bar">
          <span class="meta-item">Timestamp: <strong>${formattedDate}</strong></span>
          <span class="meta-item">Aggregation: <strong>Arithmetic Mean</strong></span>
          <span class="meta-item">Total Tables: <strong>${validTables.length}</strong></span>
          <span class="meta-item">Active View: <strong>${isGraphs ? 'Graphical Charts' : 'Detailed Tables'}</strong></span>
        </div>
      </header>

      <main>
        ${isGraphs ? renderGraphsView(report) : renderTableView(report)}
      </main>

      <footer>
        <p>Generated by DriftJS Benchmark Suite &bull; All metric durations and sizes aggregated as arithmetic mean.</p>
      </footer>
    </div>
  `;
}

function render() {
  if (currentReport) {
    renderApp(currentReport);
  }
}

// ---------------------------------------------------------------------------
// GLOBAL EVENT DELEGATION (ATTACHED ONCE AT APP STARTUP)
// ---------------------------------------------------------------------------

let eventsAttached = false;

function setupGlobalEvents() {
  if (eventsAttached) return;
  eventsAttached = true;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Table view button
    if (target.closest('#nav-btn-table, #btn-back-to-tables')) {
      e.preventDefault();
      navigateTo('table');
      return;
    }

    // Graphs view button
    if (target.closest('#nav-btn-graphs, #btn-banner-to-graphs')) {
      e.preventDefault();
      navigateTo('graphs');
      return;
    }

    // Chart mode switcher: values
    if (target.closest('#btn-mode-values')) {
      e.preventDefault();
      if (chartMode !== 'values') {
        chartMode = 'values';
        render();
      }
      return;
    }

    // Chart mode switcher: factors
    if (target.closest('#btn-mode-factors')) {
      e.preventDefault();
      if (chartMode !== 'factors') {
        chartMode = 'factors';
        render();
      }
      return;
    }

    // Category filter pill
    const catPill = target.closest<HTMLElement>('.cat-pill');
    if (catPill) {
      e.preventDefault();
      const cat = catPill.getAttribute('data-cat');
      if (cat && cat !== selectedCategory) {
        selectedCategory = cat;
        render();
      }
      return;
    }

    // Framework filter chip
    const chip = target.closest<HTMLElement>('.chip-btn');
    if (chip) {
      e.preventDefault();
      const fw = chip.getAttribute('data-fw');
      if (fw) {
        if (hiddenFrameworks.has(fw)) {
          hiddenFrameworks.delete(fw);
        } else {
          hiddenFrameworks.add(fw);
        }
        render();
      }
      return;
    }
  });

  // File Upload listener via document change delegation
  document.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement | null;
    if (target && target.id === 'json-input') {
      const file = target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as BenchmarkReport;
          currentReport = parsed;
          render();
        } catch {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    }
  });
}

async function init() {
  setupGlobalEvents();

  try {
    const res = await fetch('/results.json');
    if (res.ok) {
      const report = await res.json();
      renderApp(report);
      return;
    }
  } catch {
    // Ignore fetch error
  }

  // Fallback demo report if results.json not yet generated
  const fallbackReport: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    tables: [
      {
        category: 'cpu',
        title: '1. CPU Benchmarks (Duration in ms)',
        headers: ['Metric / Benchmark', 'Unit', 'VanillaJS', 'DriftJS', 'React', 'Vue', 'SolidJS', 'Svelte'],
        rows: [
          {
            id: '01_run1k',
            name: '01. Create 1,000 rows',
            description: 'Creates 1,000 table rows upon clicking #run.',
            unit: 'ms',
            values: { vanilla: 201.4, drift: 235.47, react: 737.2, vue: 225.2, solid: 197.0, svelte: 255.53 },
            factors: { vanilla: 1.0, drift: 1.17, react: 3.66, vue: 1.12, solid: 0.98, svelte: 1.27 },
          },
          {
            id: '02_replace1k',
            name: '02. Replace 1,000 rows',
            description: 'Replaces all 1,000 rows with 1,000 new rows.',
            unit: 'ms',
            values: { vanilla: 208.53, drift: 275.47, react: 761.2, vue: 249.93, solid: 226.6, svelte: 284.53 },
            factors: { vanilla: 1.0, drift: 1.32, react: 3.65, vue: 1.20, solid: 1.09, svelte: 1.36 },
          },
        ],
      },
    ],
  };

  renderApp(fallbackReport);
}

init();
