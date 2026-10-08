# DriftJS TodoMVC

The canonical [TodoMVC](https://todomvc.com) application built with DriftJS.

## Features Demonstrated

- **Keyed List Reconciliation (`@for`)**: High-performance DOM reconciliation powered by Drift's Longest Increasing Subsequence (LIS) algorithm.
- **Derived Reactive State (`derive()`)**: Memoized computed state tracking active count, completed count, and active filter lists.
- **Conditional Editing (`@if`)**: In-place transition between view and edit modes without full row recreation.
- **Event Handling**: Keyboard shortcuts (`Enter` to save, `Escape` to cancel), toggle all, and double-click editing.
- **Persistence**: Synchronizes todo items to browser `localStorage`.

## Running Locally

```bash
# Start development server
pnpm --filter driftjs-example-todomvc dev

# Build for production
pnpm --filter driftjs-example-todomvc build
```
