---
title: "Keyed List Reconciliation and LIS Algorithm"
description: "How DriftJS minimizes DOM movements during list updates using Longest Increasing Subsequence."
---

# Keyed List Reconciliation and LIS Algorithm

Updating lists of elements efficiently is one of the most performance-critical operations in any web runtime. Adding, deleting, or reordering list items should never require tearing down and recreating DOM nodes.

DriftJS implements keyed list reconciliation using the **Longest Increasing Subsequence (LIS)** algorithm, paired with an outer-scope **Fast-Path Attribute Patcher**.

---

## The Keyed Reconciliation Challenge

Consider a list of 5 items reordered:
```
Old: [A, B, C, D, E]
New: [A, C, B, E, D]
```

A naive reconciler might replace all nodes or perform multiple swaps. The optimal solution is finding the largest subset of items that already appear in their relative correct order:
* The subsequence `[A, B, E]` or `[A, C, E]` is already in relative ascending order.
* Therefore, only `C` and `D` need to be physically moved in the DOM!

---

## The Longest Increasing Subsequence Algorithm

In `packages/dom/src/reconciler.ts`, `reconcileKeyedList()` executes this workflow:

1. **Prefix and Suffix Fast-Scan:**
   * Compares items from the start (`head`) while keys match.
   * Compares items from the end (`tail`) while keys match.
   * If the diff is purely prepending or appending, the loop terminates immediately with zero LIS calculation.

2. **Index Map & Key Tracking:**
   * Builds an index map of remaining new keys.
   * Iterates through remaining old items:
     * If an old key does not exist in the new map, its DOM nodes are unmounted and removed.
     * If it exists, records the old-to-new index position.

3. **Longest Increasing Subsequence Computation:**
   * Computes the LIS array representing the indices of new items that do not require physical DOM movement.
   * Iterates backwards through new items:
     * If an item index is part of the LIS, it remains stationary.
     * If not part of the LIS, moves the DOM node before its next sibling using `parentNode.insertBefore()`.
     * If the item is completely new, mounts its sub-module nodes into the DOM.

---

## Row Identity and Caching with Item Records

Each rendered item in the loop is backed by an `ItemRecord`:

```ts
export interface ItemRecord {
  key: unknown;
  nodes: Node[];
  childRegions?: ReactiveRegion[];
  itemVal: unknown;
  indexVal: number;
  registers?: any[];
  scope?: Record<string, any>;
  lastValues?: Map<number, any>;
}
```

By storing the item's live DOM nodes and registers, row state and focused inputs are preserved across list reshuffles.

---

## Outer Scope Fast Path with Patch Item Attributes

Often, a list's items do not move, but an outer-scope variable referenced inside row expressions changes (e.g. changing active currency from `$` to `€` in a product table):

1. The compiler identifies outer dependencies referenced inside row expressions and stores them in `rowDeps`.
2. When only `rowDeps` change, the VM bypasses LIS calculation completely.
3. It executes `patchItemAttributes()` across existing `ItemRecord` rows, updating only the text nodes and attributes in-place.
