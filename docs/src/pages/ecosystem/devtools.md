---
title: "DriftJS DevTools"
description: "Cross-browser DevTools extension for inspecting register VM state, reactive scope, and bytecode execution."
---

# DriftJS DevTools

**DriftJS DevTools** is the official browser developer tools extension for inspecting, debugging, and profiling applications running the DriftJS register VM reactivity engine.

---

## Installation

### 🦊 Mozilla Firefox

You can install the official signed extension or download the self-hosted `.xpi` package:

- **Mozilla Add-ons (AMO):** [Install from AMO](https://addons.mozilla.org/en-US/firefox/addon/driftjs-devtools/) *(pending listing)*
- **Direct `.xpi` Download:** [Download `drift-devtools.xpi`](/downloads/drift-devtools.xpi)
  - In Firefox, navigate to `about:addons` &gt; Click the gear icon ⚙️ &gt; **Install Add-on From File...** &gt; Select `drift-devtools.xpi`.

### 🌐 Google Chrome & Chromium (Edge, Brave)

- **Chrome Web Store:** [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/driftjs-devtools) *(pending review)*
- **Developer Mode (Unpacked):**
  1. Download or build `drift-devtools-chrome.zip` and extract it to a local folder.
  2. In Chrome, navigate to `chrome://extensions`.
  3. Enable **Developer mode** in the top-right corner.
  4. Click **Load unpacked** and select the extracted folder.

---

## Key Features

### 1. Component Tree & Real-Time Filter
Inspect all active Drift Virtual Machine instances mounted in the current document. Use the sidebar search bar to quickly filter components by tag name (e.g. `<CounterDemo>`) or instance ID (`vm-1`, `vm-2`). Hovering over any component highlights its physical bounding rect in the live DOM.

### 2. Scope & Live State Editing
View all reactive variables tracked in the component's prototype scope chain. Edit values directly in the DevTools table (supports JSON primitives, arrays, and objects) to trigger instantaneous in-place reactive updates without page reloads.

### 3. Registers Snapshot (r0..r255)
Visualize the 256 internal VM registers in real time. Inspect which registers hold DOM Elements, TextNodes, DocumentFragments, or computed primitive values during execution.

### 4. Bytecode Stream & Interactive Stepper
View the disassembled bytecode instruction stream (`CREATE_ELEMENT`, `INTERPOLATE_TEXT`, `REACTIVE_IF`, `REACTIVE_FOR`).
Use the **Interactive VM Stepper** controls:
- **`[⏮ Prev]` / `[⏭ Next]`**: Step through bytecode instructions one at a time.
- **Active PC Highlighting**: See exactly which instruction is executing and which register is allocated or modified.
- **Opcode Annotations**: Clear explanations of what each opcode does (e.g., allocating a DOM node or binding an event).

### 5. State Time-Travel / History Scrubber
Every reactive state mutation (`markDirty`) is recorded in the timeline history:
- **Interactive Slider**: Scrub backward and forward across historical application states.
- **Live Page Synchronization**: Scrubbing to an earlier state reverts the live page to that exact point in time.
- **Variable Diffs**: See which variables changed at each mutation point.

### 6. Performance Profiling
Monitor the runtime performance of your reactive application:
- **Microtask Flush Durations**: Measure the exact time spent flushing pending updates.
- **LIS Keyed Reconciliation**: Track the execution duration and item count of `@for` list updates.
- **DOM Patch Counters**: Monitor how many in-place text and attribute patches were executed per tick.

---

## Building From Source

To build DriftJS DevTools locally within the repository:

```bash
# Build for Firefox (emits dist/firefox & drift-devtools-firefox.zip)
pnpm --filter devtool build:firefox

# Build for Chrome (emits dist/chrome & drift-devtools-chrome.zip)
pnpm --filter devtool build:chrome

# Build both targets
pnpm --filter devtool build
```
