<div align="center">

# @sharetech-labs/logtree

**Structured decision tracing with nested log trees for Node.js + TypeScript.**

Capture execution paths once, then export them as JSON, flat events, ASCII trees, or Mermaid diagrams.

[![npm version](https://img.shields.io/npm/v/%40sharetech-labs%2Flogtree?logo=npm)](https://www.npmjs.com/package/@sharetech-labs/logtree)
[![CI](https://github.com/sharetech-labs/logtree/actions/workflows/ci.yml/badge.svg)](https://github.com/sharetech-labs/logtree/actions/workflows/ci.yml)
[![Publish](https://github.com/sharetech-labs/logtree/actions/workflows/publish.yml/badge.svg)](https://github.com/sharetech-labs/logtree/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-1f6feb.svg)](https://opensource.org/licenses/MIT)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-43853d.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

## Why logtree

- Minimal API: one `log()` method at every level.
- Automatic nesting: each returned context keeps trace depth for you.
- Multiple outputs from the same trace:
  - `toJSON()` for APIs and storage.
  - `flat()` for event pipelines.
  - `summary()` for terminal debugging.
  - `mermaid()` for diagrams in docs and PRs.
- Works in both ESM and CommonJS builds.

## Install

```bash
npm install @sharetech-labs/logtree
```

## Quick Start

```ts
import { Trace } from '@sharetech-labs/logtree';

const trace = new Trace('order-123', { customer: 'C-2041' });

const pricing = trace.log('pricing', { subtotal: 284.97 });
pricing.log('apply-discount', { code: 'SAVE20' });
trace.log('payment', { amount: 227.98 });

console.log(trace.summary());
```

Output:

```text
order-123
├─ pricing (subtotal=284.97)
│  └─ apply-discount (code=SAVE20)
└─ payment (amount=227.98)
```

## npm + GitHub Friendly Outputs

### 1. Nested JSON (`toJSON`)

```ts
const json = trace.toJSON();
```

Good for API responses, snapshots, or writing trace artifacts in CI.

### 2. Flat Events (`flat`)

```ts
const events = trace.flat();
```

Good for analytics/event pipelines where each entry needs an `id`, `timestamp`, and `_depth`.

### 3. Mermaid Diagrams (`mermaid`)

```ts
const diagram = trace.mermaid();
console.log(diagram);
```

Output:

```mermaid
graph LR
    root["order-123"]
    n1["pricing"]
    n2["apply-discount"]
    n3["payment"]
    root --> n1
    root --> n3
    n1 --> n2
```

Use this directly in GitHub Markdown docs, issues, and PR descriptions.

## API At A Glance

```ts
new Trace(id: string, data?: Record<string, unknown>, options?: { consoleLogging?: boolean })

trace.log(label: string, data?: Record<string, unknown>): TraceContext
trace.toJSON(): TraceJSON
trace.flat(): FlatEntry[]
trace.summary(): string
trace.mermaid(options?: { direction?: 'TD' | 'LR' | 'BT' | 'RL'; order?: boolean }): string

trace.setConsoleLogging({ enabled: boolean }): Trace

// The returned context from log() supports:
context.log(label: string, data?: Record<string, unknown>): TraceContext
```

## Module Usage

### ESM

```ts
import { Trace } from '@sharetech-labs/logtree';
```

### CommonJS

```js
const { Trace } = require('@sharetech-labs/logtree');
```

## Development Scripts

```bash
npm run dev            # vitest watch
npm run test           # run tests once
npm run test:coverage  # coverage report
npm run lint           # type check
npm run build          # tsup build
npm run ci             # full CI checks
npm run check-exports  # verify package type exports
```

## Release + Publish

The GitHub `publish` workflow runs on pushes to `main`, performs CI, bumps patch version, tags, and publishes to npm.

## Contributing

1. Fork and create a branch.
2. Run `npm ci`.
3. Add tests in `tests/` for behavior changes.
4. Run `npm run ci` before opening a PR.

## License

MIT © Sharetech Labs
