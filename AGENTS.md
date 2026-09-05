# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Aider, etc.) working in this repository.

## Project overview

`dom-views` is a tiny, dependency-free library that connects DOM elements to JS "view" classes via
a `data-element="<Name>"` attribute, using a `MutationObserver` to auto-connect/disconnect
instances as matching elements enter/leave the DOM. It was extracted from a TYPO3 portfolio
project's in-house view mini-framework (itself originally a stripped-down UIKit derivative, since
fully modernized and decoupled from anything project-specific). Not published to npm — consumed by
other projects via a Git reference or local `file:` path.

The browser runtime is three files under `src/`:
- `src/view.ts` — the `View` base class (`el`, `onDispose()`).
- `src/dom-views.ts` — the `DomViews` class: DOM scanning, `MutationObserver` wiring, the
  registry, `registerViews()`, `stopObserving()`. Each instance is fully independent.
- `src/index.ts` — the public barrel export, plus a pre-instantiated default `DomViews` and
  `registerViews()`/`stopObserving()` free-function wrappers around it, for the common
  one-page/one-registry case.

There is intentionally no framework, no build-step DSL, no virtual DOM — just class instantiation
driven by an attribute. Keep it that way; this library's value is its size and lack of dependencies.

Separately, a **Node-only CLI** scaffolds new view files for consuming projects:
- `src/scaffold.ts` — the actual logic (`initConfig`, `readConfig`, `createView`), pure
  `node:fs`/`node:path`, exported and unit-tested directly (no process spawning in tests).
- `src/cli.ts` — a thin `#!/usr/bin/env node` wrapper that parses `process.argv` and calls into
  `scaffold.ts`, built by tsup as a second entry (`package.json`'s `"bin"` points at
  `dist/cli.js`). This code never ships to a browser — it's not exported from `src/index.ts`.

## Development commands

- `npm install` — install dev dependencies (tsup, vitest, jsdom, typescript).
- `npm run test` — run the Vitest suite (`jsdom` environment, see `vitest.config.ts`).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` — `tsup`, emits `dist/index.js` (ESM), `dist/index.cjs` (CJS), `dist/index.d.ts`.
- `npm run dev` — `tsup --watch`.

Always run `test` + `typecheck` + `build` before considering a change done — this is a library
other projects depend on directly from source-built output, so a broken build or a silently wrong
type is a real regression for a consumer, not just a local inconvenience.

## Architecture

`DomViews` (`src/dom-views.ts`) holds all state as instance fields (`registry`, an
`instances: WeakMap<Element, { [name: string]: View }>`, `attribute`, `started`, the two
`MutationObserver`s) — no module-level singleton state, so instances are fully isolated from each
other. `registerViews(viewClasses, options?)` is the entrypoint a consumer calls; on an instance's
first call it:
1. Scans `document.body` (itself + all descendants) for elements carrying the connecting attribute
   (default `data-element`, configurable via `options.attribute` — **only on that instance's very
   first call**, since its `MutationObserver`s are wired up once per instance).
2. Instantiates the matching registered class for each element, tracked via the instance's
   `WeakMap` — no property is ever stashed on the DOM element itself, so this library needs zero
   global `Element` type augmentation.
3. Starts two `MutationObserver`s: one for `childList` (dynamically added/removed elements), one
   for `attributes` filtered to the connecting attribute (in case it's added/removed after the
   fact).

A single element can host multiple views via a space-separated attribute value
(`data-element="Header Dropdown"`).

`stopObserving()` disconnects both observers, disposes every currently-connected view via
`onDispose()`, and resets the instance (registry cleared, attribute back to default) — full
teardown, needed for tests and useful for SPA-style unmounts/HMR. Normal page-lifetime usage never
needs to call it.

`src/index.ts` exports the class itself (for multi-instance use, chiefly tests) plus a
pre-instantiated default instance backing the free-function `registerViews`/`stopObserving`
exports, for the common single-registry case.

## Known-fixed bug (context for future changes to `connect()`)

`connect()` used to create a **new** `{}` object per matched name inside its loop instead of
reusing/accumulating into one target object, so an element with two space-separated names
(`data-element="A B"`) would silently lose the first view's `WeakMap` registration — triggering a
duplicate instantiation on any subsequent `connect()` call for that same element (e.g. via the
attribute-mutation observer re-firing). Fixed by computing the target object **once** per call and
writing it to the `WeakMap` **once**, after the loop. The multi-name test in
`test/dom-views.test.ts` (`"supports multiple space-separated names on one element"`) is what
caught this — don't remove it, and add a regression test for any future bug found the same way.

## CLI design (`dom-views.config.json`, `init`, `create`)

`dom-views init <viewsDir>` writes `dom-views.config.json` (`{ "viewsDir": "..." }`) in the current
working directory; `dom-views create <Name>` reads that config and writes
`<viewsDir>/<Name>/index.ts` + `index.css` from a built-in template. Deliberate constraints, don't
relax them without re-checking the reasoning:
- **No project-specific defaults in the generated code** — no `pf`-style class-name prefix, no
  assumed CSS convention. `viewsDir` is the *only* thing a consuming project configures; the
  generated `View` subclass and CSS comment are intentionally bare, because this library doesn't
  know (and shouldn't assume) any given consumer's naming conventions.
- **Both commands refuse to overwrite anything** (`initConfig` throws if `dom-views.config.json`
  already exists; `createView` throws if `<viewsDir>/<Name>` already exists) — a scaffolding tool
  silently clobbering hand-written code is worse than it doing nothing.
- **`create` does not touch any other file** — no auto-editing an existing barrel `index.ts` to add
  the export, no auto-editing the consumer's Fluid/HTML template to add the connecting attribute.
  It prints those two steps as a checklist instead. This was a deliberate scope decision (see
  `README.md`'s CLI section) — editing a project's existing hand-maintained files programmatically
  is a much bigger footgun than scaffolding new ones, and the two steps are trivial for a human to
  do themselves. Don't add auto-editing later without discussing the tradeoff again.
- `cli.ts` itself has no logic beyond argv parsing + calling `scaffold.ts` + formatting output —
  keep it that way so `scaffold.ts`'s functions stay directly unit-testable without spawning a
  child process (see `test/scaffold.test.ts`).

## Testing conventions

- Environment: `jsdom` via `vitest.config.ts`. `MutationObserver` callbacks fire as microtasks —
  always `await` a tick (`await new Promise((r) => setTimeout(r, 0))`, see the `flush()` helper) after
  a DOM mutation before asserting on connect/disconnect side effects.
- Give each test its own `new DomViews()` instance (see `beforeEach` in `test/dom-views.test.ts`)
  and call `stopObserving()` in `afterEach`. Because state lives on the instance, this gives full
  per-test isolation — including for `options.attribute`, which no longer needs its own dedicated
  test file the way the earlier module-singleton design did.
- History note: an earlier, module-function-based version of this connector (state in module
  closures, not a class) required `vi.resetModules()` + dynamic re-import to fake per-test
  isolation, which leaked a growing number of live `MutationObserver`s onto the shared `jsdom`
  `document` across tests — corrupting later assertions and throwing
  `ReferenceError: Element is not defined` after a file's environment was torn down. That's the
  concrete reason this became a class: `new DomViews()` per test gives real isolation with no
  workaround needed. If you're ever tempted to go back to a module-singleton design here, this is
  why not to.

## Conventions

- No comments explaining *what* code does — only *why*, and only when non-obvious (see the
  multi-name bug note above for the kind of thing worth a comment).
- Keep the public API surface (`src/index.ts`) minimal — `View`, `DomViews`, `registerViews`,
  `stopObserving`, and their types. Don't add convenience helpers "just in case"; this library
  stays small on purpose.
