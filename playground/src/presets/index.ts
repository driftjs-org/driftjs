import type { PresetExample } from '../types.js';

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    id: 'counter',
    name: 'Reactive Counter',
    icon: '⚡',
    description: 'Basic reactivity, button event handling, and an @if / @else if / @else ladder.',
    code: `<script>
  let count = 0;

  function increment() {
    count++;
  }

  function decrement() {
    count--;
  }

  function reset() {
    count = 0;
  }
</script>

<style>
  .counter-card {
    max-width: 420px;
    margin: 2rem auto;
    padding: 2.25rem 2rem;
    border-radius: 14px;
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    text-align: center;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .counter-card h2 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
    color: #1e293b;
  }
  .display {
    font-size: 4rem;
    font-weight: 800;
    margin: 1rem 0;
    color: #4f46e5;
    letter-spacing: -0.04em;
  }
  .status-badge {
    display: inline-block;
    padding: 0.3rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 1.75rem;
  }
  .badge-pos { background: #dcfce7; color: #15803d; }
  .badge-neg { background: #fee2e2; color: #b91c1c; }
  .badge-zero { background: #f1f5f9; color: #475569; }
  .btn-row {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
  button {
    padding: 0.65rem 1.25rem;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.2s, box-shadow 0.2s;
  }
  button:hover { opacity: 0.92; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
  button:active { transform: scale(0.96); }
  .btn-dec { background: #ef4444; color: #ffffff; }
  .btn-inc { background: #10b981; color: #ffffff; }
  .btn-rst { background: #e2e8f0; color: #334155; }
</style>

<div class="counter-card">
  <h2>⚡ DriftJS Counter</h2>
  <div class="display">{count}</div>

  <div>
    @if count > 0 {
      <span class="status-badge badge-pos">Positive Value</span>
    } @else if count < 0 {
      <span class="status-badge badge-neg">Negative Value</span>
    } @else {
      <span class="status-badge badge-zero">Zero (Neutral)</span>
    }
  </div>

  <div class="btn-row">
    <button class="btn-dec" onclick={decrement}>-1 Decrement</button>
    <button class="btn-rst" onclick={reset}>Reset</button>
    <button class="btn-inc" onclick={increment}>+1 Increment</button>
  </div>
</div>
`,
  },
  {
    id: 'todos',
    name: 'Keyed Todo List',
    icon: '📋',
    description: 'Dynamic arrays, @for loops, keyed LIS list reconciliation, and in-place row toggling.',
    code: `<script>
  let newTodoText = "";
  let todos = [
    { id: 1, text: "Explore DriftJS Virtual Machine", done: true },
    { id: 2, text: "Inspect reactive in-place DOM updates", done: true },
    { id: 3, text: "Ship fast AOT compiled web apps", done: false }
  ];
  let nextId = 4;

  function addTodo() {
    if (!newTodoText.trim()) return;
    todos = [
      ...todos,
      { id: nextId++, text: newTodoText.trim(), done: false }
    ];
    newTodoText = "";
  }

  function toggleTodo(id) {
    todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
  }

  function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
  }
</script>

<style>
  .todo-app {
    max-width: 480px;
    margin: 2rem auto;
    padding: 1.75rem;
    background: #ffffff;
    border-radius: 14px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
    font-family: system-ui, -apple-system, sans-serif;
  }
  .todo-app h2 {
    font-size: 1.3rem;
    margin: 0 0 1rem 0;
    color: #0f172a;
  }
  .input-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }
  input[type="text"] {
    flex: 1;
    padding: 0.65rem 0.85rem;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    color: #0f172a;
    font-size: 0.95rem;
    outline: none;
  }
  input[type="text"]:focus {
    border-color: #4f46e5;
    background: #ffffff;
  }
  .btn-add {
    background: #4f46e5;
    color: #ffffff;
    border: none;
    padding: 0.65rem 1.2rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }
  .list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.85rem;
    background: #f8fafc;
    margin-bottom: 0.5rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #4f46e5;
    transition: all 0.15s ease;
  }
  .item.done {
    opacity: 0.65;
    border-left-color: #10b981;
    background: #f1f5f9;
  }
  .item.done .text {
    text-decoration: line-through;
    color: #64748b;
  }
  .text {
    flex: 1;
    margin: 0 0.75rem;
    font-size: 0.95rem;
  }
  .btn-del {
    background: transparent;
    color: #ef4444;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    line-height: 1;
  }
  .btn-del:hover {
    color: #b91c1c;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 1.25rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
  }
</style>

<div class="todo-app">
  <h2>📋 Tasks (Keyed LIS Reconciler)</h2>

  <div class="input-row">
    <input
      type="text"
      placeholder="What needs doing?"
      value={newTodoText}
      oninput={(e) => { newTodoText = e.target.value; }}
      onkeydown={(e) => { if (e.key === 'Enter') addTodo(); }}
    />
    <button class="btn-add" onclick={addTodo}>Add Task</button>
  </div>

  <ul class="list">
    @for (item in todos key item.id) {
      <li class={item.done ? "item done" : "item"}>
        <input
          type="checkbox"
          checked={item.done}
          onchange={() => toggleTodo(item.id)}
        />
        <span class="text">{item.text}</span>
        <button class="btn-del" onclick={() => deleteTodo(item.id)}>✕</button>
      </li>
    }
  </ul>

  <div class="footer">
    <span>Total: {todos.length} items</span>
    <span>Keyed by: <code>item.id</code></span>
  </div>
</div>
`,
  },
  {
    id: 'switch',
    name: 'Switch Directive',
    icon: '🔀',
    description: 'Multi-branch control flow using @switch, @case, and @default directives.',
    code: `<script>
  let activeTab = "architecture";

  function setTab(tab) {
    activeTab = tab;
  }
</script>

<style>
  .tabs-wrapper {
    max-width: 520px;
    margin: 2rem auto;
    font-family: system-ui, -apple-system, sans-serif;
    color: #0f172a;
  }
  .tabs-wrapper h2 {
    font-size: 1.3rem;
    margin: 0 0 1rem 0;
  }
  .nav-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.5rem;
  }
  .nav-btn {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 0.95rem;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .nav-btn:hover {
    color: #0f172a;
    background: #f1f5f9;
  }
  .nav-btn.active {
    background: #4f46e5;
    color: #ffffff;
  }
  .content-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 1.75rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .content-card h3 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
  }
  .content-card p {
    margin: 0;
    color: #475569;
    line-height: 1.5;
  }
</style>

<div class="tabs-wrapper">
  <h2>🔀 DriftJS @switch Control Flow</h2>

  <div class="nav-bar">
    <button
      class={activeTab === "architecture" ? "nav-btn active" : "nav-btn"}
      onclick={() => setTab("architecture")}
    >
      Architecture
    </button>
    <button
      class={activeTab === "reconciler" ? "nav-btn active" : "nav-btn"}
      onclick={() => setTab("reconciler")}
    >
      LIS Reconciler
    </button>
    <button
      class={activeTab === "benchmarks" ? "nav-btn active" : "nav-btn"}
      onclick={() => setTab("benchmarks")}
    >
      Benchmarks
    </button>
  </div>

  <div class="content-card">
    @switch activeTab {
      @case "architecture" {
        <div>
          <h3>Register VM Architecture</h3>
          <p>
            Unlike Virtual DOM frameworks that allocate tree nodes on every render,
            DriftJS compiles UI components into 256 virtual registers with bytecode instructions.
          </p>
        </div>
      }
      @case "reconciler" {
        <div>
          <h3>Longest Increasing Subsequence</h3>
          <p>
            Keyed loops utilize an optimal LIS algorithm to identify the minimal set
            of DOM manipulations required during state updates.
          </p>
        </div>
      }
      @case "benchmarks" {
        <div>
          <h3>Blistering Performance</h3>
          <p>
            With zero virtual DOM diffing and AOT constant pool instantiations,
            DriftJS achieves sub-millisecond updates on large collections.
          </p>
        </div>
      }
      @default {
        <div>
          <p>Please select a tab from the header above.</p>
        </div>
      }
    }
  </div>
</div>
`,
  },
  {
    id: 'forms',
    name: 'Form & Live Binding',
    icon: '📝',
    description: 'Dynamic inputs, range sliders, select menus, and live CSS property binding.',
    code: `<script>
  let username = "Drifter";
  let themeColor = "#4f46e5";
  let fontSize = 18;
  let role = "Compiler Engineer";
</script>

<style>
  .form-demo {
    max-width: 500px;
    margin: 2rem auto;
    padding: 1.75rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    color: #0f172a;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
  }
  .form-demo h2 {
    margin: 0 0 1.25rem 0;
    font-size: 1.3rem;
  }
  .field {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
  }
  input[type="text"], select {
    padding: 0.6rem 0.75rem;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    color: #0f172a;
    font-size: 0.95rem;
  }
  input[type="range"] {
    cursor: pointer;
  }
  .card-preview {
    margin-top: 1.5rem;
    padding: 1.5rem;
    border-radius: 10px;
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
  }
</style>

<div class="form-demo">
  <h2>📝 Dynamic Form &amp; Live Binding</h2>

  <div class="field">
    <label>User Name</label>
    <input
      type="text"
      value={username}
      oninput={(e) => { username = e.target.value; }}
    />
  </div>

  <div class="field">
    <label>Role</label>
    <select value={role} onchange={(e) => { role = e.target.value; }}>
      <option value="Compiler Engineer">Compiler Engineer</option>
      <option value="VM Runtime Architect">VM Runtime Architect</option>
      <option value="Frontend Performance Guru">Frontend Performance Guru</option>
    </select>
  </div>

  <div class="field">
    <label>Font Size ({fontSize}px)</label>
    <input
      type="range"
      min="14"
      max="32"
      value={fontSize}
      oninput={(e) => { fontSize = Number(e.target.value); }}
    />
  </div>

  <div class="field">
    <label>Accent Color</label>
    <input
      type="color"
      value={themeColor}
      oninput={(e) => { themeColor = e.target.value; }}
    />
  </div>

  <div class="card-preview" style={"border-color: " + themeColor}>
    <h3 style={"color: " + themeColor + "; font-size: " + fontSize + "px; margin: 0 0 0.5rem 0;"}>
      {username}
    </h3>
    <p style="margin: 0; color: #64748b;">Role: <strong>{role}</strong></p>
  </div>
</div>
`,
  },
  {
    id: 'benchmark',
    name: '1,000 Items Stress Test',
    icon: '⚡',
    description: 'Generates 1,000 keyed records to demonstrate fast-patching and minimal DOM churn.',
    code: `<script>
  let rows = [];
  let nextRowId = 1;
  let lastTimeMs = 0;

  function generateRows(count) {
    const start = performance.now();
    const newRows = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: nextRowId++,
        label: "Item #" + (nextRowId - 1) + " (Val: " + Math.floor(Math.random() * 1000) + ")",
        selected: false
      });
    }
    rows = newRows;
    lastTimeMs = Number((performance.now() - start).toFixed(1));
  }

  function clearRows() {
    const start = performance.now();
    rows = [];
    lastTimeMs = Number((performance.now() - start).toFixed(1));
  }

  function updateEvery10th() {
    const start = performance.now();
    rows = rows.map((r, i) => {
      if (i % 10 === 0) {
        return { ...r, label: r.label + " [Updated!]" };
      }
      return r;
    });
    lastTimeMs = Number((performance.now() - start).toFixed(1));
  }
</script>

<style>
  .bench-app {
    max-width: 580px;
    margin: 1.5rem auto;
    padding: 1.75rem;
    background: #ffffff;
    border-radius: 14px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
    font-family: system-ui, -apple-system, sans-serif;
  }
  .bench-app h2 {
    margin: 0 0 0.5rem 0;
  }
  .btn-bar {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .btn {
    padding: 0.55rem 1rem;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    background: #4f46e5;
    color: #ffffff;
    transition: opacity 0.15s;
  }
  .btn:hover {
    opacity: 0.9;
  }
  .bench-list {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 8px;
    padding: 0;
    list-style: none;
  }
  .bench-row {
    padding: 0.45rem 0.85rem;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.85rem;
    color: #1e293b;
  }
  .metric {
    font-size: 0.85rem;
    color: #15803d;
    font-weight: 600;
    margin-top: 0.5rem;
  }
</style>

<div class="bench-app">
  <h2>⚡ 1,000 Rows Benchmark</h2>
  <p style="font-size: 0.85rem; color: #64748b;">
    Test DriftJS keyed reconciliation performance and microtask batching.
  </p>

  <div class="btn-bar">
    <button class="btn" onclick={() => generateRows(1000)}>Create 1,000 Rows</button>
    <button class="btn" onclick={updateEvery10th}>Update Every 10th</button>
    <button class="btn" onclick={clearRows}>Clear</button>
  </div>

  <div class="metric">
    Rows: {rows.length} | Script Time: {lastTimeMs} ms
  </div>

  <ul class="bench-list">
    @for (row in rows key row.id) {
      <li class="bench-row">{row.label}</li>
    }
  </ul>
</div>
`,
  },
];
