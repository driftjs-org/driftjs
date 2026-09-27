---
title: "Best Practices and Conventions Overview"
description: "Essential architectural conventions and authoring guidelines for DriftJS applications."
---

# Best Practices and Conventions Overview

Welcome to the DriftJS Best Practices guide. This section documents critical conventions, runtime patterns, and authoring guidelines essential for writing predictable, high-performance applications with the Drift Register Virtual Machine and Islands SSG framework.

---

## Current Architecture Conventions

Because DriftJS focuses on zero-overhead execution and direct bytecode interpretation without Virtual DOM layers or Proxy wrappers, understanding how the compiler and runtime interact with browser DOM parsers is key.

This section covers two key conventions:

1. **[Text Node Hydration](/best-practices/text-node-hydration/):**
   Understanding browser text node coalescing during SSR, avoiding cursor desynchronization with adjacent static and dynamic text, and applying single-node interpolation patterns.
2. **[Component Styling](/best-practices/component-styling/):**
   Managing component and layout styling through centralized stylesheets to avoid unextracted style elements in the document body.

---

## Version Note and Engine Evolution

> **Current Engine Scope:**
> The conventions documented in this section reflect the architecture and behavior of DriftJS **as of now** (v0.0.x). 
> 
> Future engine versions are planned to address these areas automatically at the compiler and serializer level—such as automatic compile-time text node coalescing, SSR text boundary preservation delimiters, and native SFC scoped `<style>` extraction. Until those automated features land in upcoming major releases, adhering to these straightforward conventions guarantees 100% deterministic hydration and zero runtime overhead.
