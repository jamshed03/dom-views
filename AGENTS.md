# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Aider, etc.) working in this repository.

## Project overview

`dom-views` is a tiny, dependency-free library that connects DOM elements to JS "view" classes via
a `data-element="<Name>"` attribute, using a `MutationObserver` to auto-connect/disconnect
instances as matching elements enter/leave the DOM. It was extracted from a TYPO3 portfolio
project's in-house view mini-framework (itself originally a stripped-down UIKit derivative, since
fully modernized and decoupled from anything project-specific). Not published to npm — consumed by
other projects via a Git reference or local `file:` path.

The entire runtime is three files under `src/`:
- `src/view.ts` — the `View` base class (`el`, `onDispose()`).
- `src/observer.ts` — the connector: DOM scanning, `MutationObserver` wiring, the registry,
  `registerViews()`, `stopObserving()`.
- `src/index.ts` — the public barrel export.

There is intentionally no framework, no build-step DSL, no virtual DOM — just class instantiation
driven by an attribute. Keep it that way; this library's value is its size and lack of dependencies.

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

`registerViews(viewClasses, options?)` is the only entrypoint a consumer calls. On first call it:
1. Scans `document.body` (itself + all descendants) for elements carrying the connecting attribute
   (default `data-element`, configurable via `options.attribute` — **only on the very first call**,
   since the `MutationObserver` is wired up once).
2. Instantiates the matching registered class for each element, tracked internally via a
   module-private `WeakMap<Element, { [name: string]: View }>` — no property is ever stashed on the
   DOM element itself, so this library needs zero global `Element` type augmentation.
3. Starts two `MutationObserver`s: one for `childList` (dynamically added/removed elements), one
   for `attributes` filtered to the connecting attribute (in case it's added/removed after the
   fact).

A single element can host multiple views via a space-separated attribute value
(`data-element="Header Dropdown"`).

`stopObserving()` disconnects both observers, disposes every currently-connected view via
`onDispose()`, and clears the registry — full teardown, needed for tests and useful for SPA-style
unmounts/HMR. Normal page-lifetime usage never needs to call it.

## Known-fixed bug (context for future changes to `connect()`)

`observer.ts`'s `connect()` used to create a **new** `{}` object per matched name inside its loop
instead of reusing/accumulating into one target object, so an element with two space-separated
names (`data-element="A B"`) would silently lose the first view's `WeakMap` registration —
triggering a duplicate instantiation on any subsequent `connect()` call for that same element (e.g.
via the attribute-mutation observer re-firing). Fixed by computing the target object **once** per
call and writing it to the `WeakMap` **once**, after the loop. The multi-name test in
`test/observer.test.ts` (`"supports multiple space-separated names on one element"`) is what caught
this — don't remove it, and add a regression test for any future bug found the same way.

## Testing conventions

- Environment: `jsdom` via `vitest.config.ts`. `MutationObserver` callbacks fire as microtasks —
  always `await` a tick (`await new Promise((r) => setTimeout(r, 0))`, see the `flush()` helper in
  each test file) after a DOM mutation before asserting on connect/disconnect side effects.
- **Do not use `vi.resetModules()` + dynamic re-import to get "fresh" module state between tests.**
  `observer.ts` sets up its `MutationObserver`s once per module instance and never tears them down
  on its own; resetting the module repeatedly leaks a growing number of observers all watching the
  same shared `jsdom` `document`, which both corrupts later assertions (duplicate connects from
  stale observers firing on new mutations) and throws `ReferenceError: Element is not defined` after
  a test file's environment is torn down (a leaked observer's callback fires into a dead realm).
  Instead: import the module once per test **file** (Vitest already isolates module state between
  files) and call `stopObserving()` in an `afterAll` to clean up. Only use a dedicated new file when
  a test genuinely needs a truly fresh module (e.g. `test/custom-attribute.test.ts`, which needs
  `options.attribute` to apply before anything else calls `registerViews()` first).

## Conventions

- No comments explaining *what* code does — only *why*, and only when non-obvious (see the
  multi-name bug note above for the kind of thing worth a comment).
- Keep the public API surface (`src/index.ts`) minimal — `View`, `registerViews`, `stopObserving`,
  and their types. Don't add convenience helpers "just in case"; this library stays small on
  purpose.
