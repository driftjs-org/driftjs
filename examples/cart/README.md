# DriftJS E-Commerce Cart

A dynamic shopping cart application demonstrating fine-grained derived computations, coupon recalculation, and fast-path row patching with DriftJS.

## Features Demonstrated

- **Derived State (`derive()`)**: Automatic caching and memoized recalculation of cart `subtotal`, promo `discountRate`, `shipping`, `tax`, and `grandTotal`.
- **Fast-Path Row Updates**: Granular updates when mutating item quantities without tearing down or reconstructing surrounding DOM nodes.
- **Dynamic Directives**:
  - `@for (prod in PRODUCTS key prod.id)` for catalog and cart rendering.
  - `@if cart.length === 0` for empty state handling.
  - `@if / @else if` for coupon alert messages.
- **Event Handling**: Add to cart, quantity increment/decrement, coupon submission, and clear bag.

## Running Locally

```bash
# Start development server
pnpm --filter driftjs-example-cart dev

# Build for production
pnpm --filter driftjs-example-cart build
```
