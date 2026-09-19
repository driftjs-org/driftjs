# Contributing to DriftJS

Thank you for your interest in contributing to DriftJS.

DriftJS is an experimental frontend framework built around a register-based
Virtual Machine, an AOT compiler, compiler-directed reactivity, direct DOM
operations, and server-side rendering.

Contributions are welcome across the compiler, runtime, SSR, tooling,
documentation, testing, and benchmarking.

## Development Setup

### Prerequisites

- Node.js
- pnpm
- Git

Clone the repository:

```bash
git clone https://github.com/hrutavmodha/driftjs.git
cd driftjs
```

Install dependencies:

```bash
pnpm install
```

## Repository Structure

The repository is organized as a pnpm workspace.

### Core packages

- `packages/compiler` — DriftJS lexer, parser, AST transformer, and bytecode generator.
- `packages/dom` — Client-side register VM, DOM runtime, reactivity, reconciliation, hydration, and selective hydration.
- `packages/ssr` — Server-side rendering runtime and HTML serialization.
- `packages/utils` — Shared utilities, context, scope resolution, and evaluation helpers.

### Additional packages

- `packages/router` — Client-side routing.
- `packages/vite-plugin` — Vite integration for `.drift` files.
- `packages/vscode-plugin` — VS Code language tooling and syntax support.
- `packages/cli` — `create-drift` project scaffolding CLI.

### Other directories

- `benchmarks` — Framework benchmarks and benchmark runner.
- `docs` — Architecture, instruction-set, test, benchmark, and development documentation.
- `playground` — Local DriftJS playground.
- `scripts` — Repository maintenance and release scripts.

## Building

Build all workspace packages:

```bash
pnpm build
```

Individual packages can also be built from their package directory:

```bash
pnpm build
```

## Testing

Run the complete test suite:

```bash
pnpm test
```

DriftJS uses Vitest for testing.

Tests are located within the relevant package, for example:

```text
packages/compiler/tests/
packages/dom/tests/
packages/router/tests/
packages/ssr/tests/
packages/cli/tests/
```

When changing a specific package, run its tests before opening a pull request.

## Type Checking

Run TypeScript type checking for the repository:

```bash
pnpm typecheck
```

## Benchmarks

DriftJS contains benchmark infrastructure under `benchmarks/`.

Run the benchmark runner with:

```bash
pnpm bench
```

Run the performance benchmark suite with:

```bash
pnpm bench:perf
```

Performance-related changes should include reproducible measurements when
appropriate.

When reporting benchmark results, include the relevant environment and
workload so that results can be interpreted correctly.

## Understanding the Architecture

The main compilation and execution pipeline is:

```text
.drift source
     │
     ▼
   Lexer
     │
     ▼
   Parser
     │
     ▼
 Transformer
     │
     ▼
  Generator
     │
     ▼
CompiledModule
     │
     ├───────────────┐
     ▼               ▼
 Client VM         SSR VM
     │               │
     ▼               ▼
    DOM             HTML
```

The compiler produces bytecode and the metadata required by the runtime.

The DOM runtime executes the compiled representation using a register-based
Virtual Machine.

The SSR package provides server-side execution and HTML serialization.

For the bytecode instruction set, see [`docs/ISA.md`](docs/ISA.md).

For the current development roadmap, see [`docs/TODO.md`](docs/TODO.md).

For the existing test documentation, see [`docs/TESTS.md`](docs/TESTS.md).

## Choosing Where to Contribute

You do not need to understand the entire repository before contributing.

Choose the subsystem closest to the change you want to make.

### Compiler

Start in:

```text
packages/compiler/
```

Relevant areas include:

- lexer
- parser
- AST transformation
- expression analysis
- bytecode generation
- compiler diagnostics
- compiler tests

Compiler changes should include or update tests for the affected behavior.

### DOM Runtime

Start in:

```text
packages/dom/
```

Relevant areas include:

- register VM execution
- reactive updates
- DOM operations
- keyed reconciliation
- conditional regions
- list rendering
- effects
- derived state
- hydration
- selective hydration

Runtime changes should include regression tests where appropriate.

### SSR

Start in:

```text
packages/ssr/
```

Relevant areas include:

- server-side rendering
- HTML serialization
- SSR runtime behavior
- SSR tests

Changes affecting behavior shared between client and server execution should
be checked against both runtimes.

### Shared Utilities

Start in:

```text
packages/utils/
```

The package is published as `driftjs-shared` and contains functionality shared
by other DriftJS packages.

Changes here may affect multiple packages, so check relevant consumers when
making changes.

### Router

Start in:

```text
packages/router/
```

Relevant areas include:

- route matching
- navigation
- history, hash, and memory drivers
- nested routes
- navigation guards
- router components

### Vite Plugin

Start in:

```text
packages/vite-plugin/
```

Relevant areas include:

- `.drift` file transformation
- Vite integration
- module handling
- development/build behavior

### VS Code Integration

Start in:

```text
packages/vscode-plugin/
```

Relevant areas include:

- syntax highlighting
- language tooling
- diagnostics
- snippets
- editor integration

### CLI

Start in:

```text
packages/cli/
```

Relevant areas include:

- project scaffolding
- templates
- CLI behavior
- prompts
- generated project configuration

## Finding an Issue to Work On

Small contributions are welcome.

Examples include:

- bug fixes
- regression tests
- compiler improvements
- runtime improvements
- SSR improvements
- documentation
- benchmark improvements
- CLI improvements
- Vite integration improvements
- VS Code integration improvements
- error-message improvements

If you want to work on a larger change, open an issue first to discuss the
proposed approach.

If you are unsure where a change belongs, ask before starting a substantial
implementation.

## Making Changes

Keep pull requests focused on a specific problem or feature.

Before making a change:

1. Check existing issues and pull requests.
2. Identify the package responsible for the behavior.
3. Read the relevant package documentation and tests.
4. Make the smallest reasonable change.
5. Add or update tests.
6. Run the relevant checks.

Avoid unrelated refactoring or formatting changes in the same pull request.

## Compiler and Runtime Changes

Compiler and runtime behavior are closely connected.

A change may flow through:

```text
Source
  ↓
Parser
  ↓
Transformer
  ↓
Generator
  ↓
Bytecode
  ↓
Runtime
  ↓
DOM / HTML
```

When modifying compiler output, check the runtime behavior affected by the
generated bytecode.

When modifying runtime behavior, check the compiler assumptions surrounding
the affected functionality.

For bytecode changes, update the relevant documentation in
[`docs/ISA.md`](docs/ISA.md) when necessary.

## Reactive Execution

DriftJS uses compiler-generated reactive metadata to associate state
dependencies with affected bytecode positions and reactive regions.

Changes to reactive execution may involve both:

- `packages/compiler`
- `packages/dom`

When modifying this area, test both dependency generation and runtime
behavior where applicable.

## Performance Changes

Performance work is welcome.

Performance claims should be supported by measurements rather than assumptions.

When submitting a performance-related change, include when relevant:

- benchmark/workload used
- environment
- before/after results
- relevant trade-offs

Avoid optimizing a benchmark at the expense of correctness or other
workloads.

## Documentation Changes

Documentation improvements are welcome.

Useful contributions include:

- API documentation
- architecture documentation
- examples
- tutorials
- troubleshooting information
- compiler documentation
- runtime documentation
- contributor documentation

If a contribution reveals that an important part of the project is difficult
to understand, consider documenting it.

## Pull Requests

Before opening a pull request, run:

```bash
pnpm test
pnpm typecheck
```

If your change affects package builds, also run:

```bash
pnpm build
```

A pull request should explain:

### What changed?

Describe the implementation.

### Why?

Describe the problem or requirement being addressed.

### Testing

List the tests and checks that were run.

### Performance

Include benchmark results when the change affects performance.

### Breaking Changes

Clearly identify changes that affect existing APIs, compiler output,
runtime behavior, or package behavior.

## Pull Request Guidelines

Please keep pull requests:

- focused
- reproducible
- tested
- documented where necessary
- free of unrelated changes

For larger changes, explain the design and implementation clearly so that the
change can be reviewed independently.

## Bug Reports

When reporting a bug, provide:

- DriftJS version
- affected package
- operating system
- Node.js version
- reproduction steps
- expected behavior
- actual behavior
- relevant error output
- a minimal reproduction when possible

A minimal reproduction is particularly useful for compiler and runtime issues.

## Feature Requests

For a feature request, describe:

1. The problem the feature solves.
2. The proposed behavior or API.
3. Why the existing behavior is insufficient.
4. Which package(s) would be affected.
5. Any compiler or runtime implications.
6. Any client/SSR implications.

For changes involving core architecture, discuss the design before beginning a
large implementation.

## Community

Questions, technical discussions, and contribution-related discussions are
welcome through the project's GitHub repository and community channels.

[Join Discord](https://discord.gg/T66TStRvd) for any discussions

## License

DriftJS is licensed under the MIT License.

See [`LICENSE`](LICENSE) for the full license text.
