# DriftJS Basic Directives Sandbox

A clean, responsive playground demonstrating core DriftJS single-file component primitives, directives, and fine-grained reactive updates.

## Demonstrated Features

- **`@if / @else if / @else` Control Flow**: Multi-branch conditional rendering with isolated anchor comments.
- **`@switch / @case / @default` Directive**: Declarative view switching with zero VDOM overhead.
- **`@for` Keyed List Reconciliation**: High-performance list manipulation powered by Drift's Longest Increasing Subsequence (LIS) algorithm.
- **Event Delegation & Dynamic Attributes**: Two-way input synchronization, range sliders, and in-place style patching.

## Running Locally

```bash
# From workspace root
pnpm --filter driftjs-example-basic dev

# Or build for production
pnpm --filter driftjs-example-basic build
```
