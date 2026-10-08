# DriftJS Realtime Telemetry Dashboard

An interactive high-frequency monitoring dashboard demonstrating DriftJS's register VM capabilities under frequent state updates with zero Virtual DOM allocation overhead.

## Features Demonstrated

- **High-Frequency Reactivity**: Real-time interval timers pushing state updates down to 250ms with sub-millisecond in-place DOM patching.
- **Component Composition**: Sub-component mounting (`MetricCard.drift`) consuming dynamic parent state via props.
- **Dynamic SVG Visualizations**:
  - Live SVG polyline chart tracking CPU load history across 12 ticks.
  - SVG circular gauge computing dynamic `stroke-dashoffset` for system health.
- **Keyed List Reconciliation (`@for`)**: Live streaming event logs with LIS reconciliation as items are prepended and trimmed.
- **Lifecycle Hooks**: `onMount` and `onUnmount` for interval timer management.

## Running Locally

```bash
# Start development server
pnpm --filter driftjs-example-dashboard dev

# Build for production
pnpm --filter driftjs-example-dashboard build
```
