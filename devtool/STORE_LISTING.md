# DriftJS DevTools — Store Submission Listings & Release Guide

This document contains official store metadata, listing descriptions, privacy declarations, and step-by-step submission checklists for publishing **DriftJS DevTools** to the **Chrome Web Store** and **Mozilla Add-ons (AMO)**.

---

## 1. General Listing Metadata

- **Name:** DriftJS DevTools
- **Short Name:** Drift DevTools
- **Category:** Developer Tools
- **Version:** `0.1.0`
- **License:** MIT (Copyright 2026 Hrutav Modha)
- **Repository URL:** `https://github.com/hrutav/driftjs`
- **Documentation:** `https://driftjs.dev/ecosystem/devtools/`
- **Support / Issue Tracker:** `https://github.com/hrutav/driftjs/issues`

---

## 2. Store Copy

### 2.1 Short Description (Summary — Max 132 chars)
> DevTools inspection panel for the DriftJS register VM reactivity engine. Inspect 256 VM registers, reactive scope, and bytecode ISA.

### 2.2 Detailed Description (Full Overview)
```markdown
DriftJS DevTools is the official developer inspection suite for DriftJS — the register VM-based reactivity engine and AOT compiler for high-performance web applications.

Unlike traditional virtual DOM diffing or proxy reactivity debuggers, DriftJS DevTools exposes the inner mechanics of register-based reactive execution right inside your browser developer tools:

⚡ Key Capabilities:
• VM Component Tree & Search: Filter and inspect mounted Drift Virtual Machine instances across your application in real time.
• Scope & State Inspector: Inspect component reactive scope variables and live-edit state directly without manual reloads.
• 256 Registers Snapshot: Real-time visual representation of occupied VM registers (r0..r255) containing DOM elements, text nodes, and primitives.
• Bytecode & ISA Disassembly: Disassembles compiled instruction streams (CREATE_ELEMENT, INTERPOLATE_TEXT, REACTIVE_IF, REACTIVE_FOR, etc.) with opcode annotations.
• Interactive VM Stepper: Step-by-step bytecode execution with program counter (PC) pointers and register mutation tracking.
• State Time-Travel / History: Track reactive scope mutations over time with an undo/redo slider to inspect and restore past application states.
• Performance Profiling: Real-time telemetry measuring microtask flush durations, Longest Increasing Subsequence (LIS) keyed reconciliation costs, and DOM patch counts.

🚀 How to Use:
1. Open the Developer Tools (F12 or Ctrl+Shift+I / Cmd+Option+I).
2. Select the "Drift" panel.
3. Open any web application running DriftJS to begin inspecting!
```

---

## 3. Privacy Policy & Permissions Declarations

### 3.1 Single Purpose Description
> "Inspect, debug, and profile web applications built using the DriftJS reactivity engine by connecting to page-level virtual machine runtime hooks."

### 3.2 Permissions Justification
| Permission | Target | Rationale |
| :--- | :--- | :--- |
| `activeTab` / `<all_urls>` | Content Script | Injects the non-intrusive lightweight communication hook into web pages running DriftJS to establish DevTools port connectivity. |
| `devtools_page` | Extension | Embeds the dedicated "Drift" inspector panel into the browser developer tools sidebar. |

### 3.3 Data Usage Declaration
- **Personal Data Collected:** None. DriftJS DevTools collects zero personal data, logs zero analytics, and makes zero external network requests.
- **Data Transmission:** All inspection telemetry remains strictly local between the inspected page and the browser DevTools instance via `window.postMessage` and extension runtime ports.

---

## 4. Mozilla Add-ons (AMO) Specific Metadata

- **Add-on ID:** `devtools@driftjs.org`
- **Minimum Firefox Version:** `109.0`
- **Channel:** Listed (Public Distribution)
- **Signing Command:**
  ```bash
  npx web-ext sign \
    --source-dir devtool/dist/firefox \
    --artifacts-dir devtool/dist/firefox-signed \
    --api-key "$AMO_JWT_ISSUER" \
    --api-secret "$AMO_JWT_SECRET" \
    --channel listed
  ```
- **Self-Hosted Distribution:**
  The unsigned or self-signed `.xpi` can be loaded temporarily in Firefox Developer Edition / Nightly via `about:debugging` or distributed directly from the documentation site.

---

## 5. Chrome Web Store Specific Metadata

- **Manifest Format:** Manifest V3 (`service_worker: background.js`)
- **Package Archive:** `drift-devtools-chrome.zip`
- **Upload Method:**
  1. Navigate to the **Chrome Web Store Developer Dashboard** (`https://chrome.google.com/webstore/devconsole`).
  2. Click **"New Item"** and upload `devtool/drift-devtools-chrome.zip`.
  3. Fill in store listing text from Section 2 above.
  4. Upload extension icon (`devtool/public/assets/icon.png`) and screenshot assets (1280x800).
  5. Under Privacy practices, select "No user data is collected or shared".
  6. Submit for review.

---

## 6. Store Asset Requirements Matrix

| Asset | Dimensions | Format | Location / Notes |
| :--- | :--- | :--- | :--- |
| Icon 16 | 16 × 16 px | PNG | `devtool/public/assets/icon.png` |
| Icon 32 | 32 × 32 px | PNG | `devtool/public/assets/icon.png` |
| Icon 48 | 48 × 48 px | PNG | `devtool/public/assets/icon.png` |
| Icon 128 | 128 × 128 px | PNG | `devtool/public/assets/icon.png` |
| Screenshot 1 | 1280 × 800 px | PNG / JPEG | Overview: Component Tree & Scope Inspector |
| Screenshot 2 | 1280 × 800 px | PNG / JPEG | Registers & ISA: Bytecode Stream & Register Grid |
| Screenshot 3 | 1280 × 800 px | PNG / JPEG | Timeline: State Time-Travel & Performance Profiling |
| Small Promo Tile | 440 × 280 px | PNG | Chrome Web Store Featured Promo |
| Marquee Banner | 1400 × 560 px | PNG | Chrome Web Store Header (Optional) |
