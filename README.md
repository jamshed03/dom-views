# dom-views

Tiny, dependency-free connector between DOM elements and JS view classes — no build-step
convention, no virtual DOM, just: give an element a `data-element="Name"` attribute, register a
matching class, and an instance is created/destroyed automatically as that element enters/leaves
the DOM.

```ts
import { View, registerViews } from "dom-views";

class Accordion extends View {
    constructor(el: HTMLElement) {
        super(el);
        this.el.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", () => this.toggle(btn));
        });
    }

    toggle(btn: HTMLButtonElement) {
        /* ... */
    }
}

registerViews({ Accordion });
```

```html
<div data-element="Accordion">
    <button>Section 1</button>
    ...
</div>
```

## Why

Framework-agnostic wiring for server-rendered HTML (PHP/TYPO3/Rails/plain HTML/...) that still
wants small, encapsulated, class-based JS behavior per component — without reaching for a full
frontend framework. A `MutationObserver` watches the DOM for elements gaining or losing the
connecting attribute (including dynamically inserted/removed content, e.g. AJAX) and
instantiates/disposes the matching view automatically.

## API

### `class View`

- `constructor(el: HTMLElement)` — `el` is bound to `this.el`.
- `onDispose(): void` — override to clean up (e.g. remove listeners attached to `window`/`document`
  rather than `this.el`, which are not cleaned up automatically). Called once when the element is
  removed from the DOM.

### `class DomViews`

The connector itself. Each instance tracks its own registry, its own connected elements, and its
own pair of `MutationObserver`s — fully independent of any other instance.

- `registerViews(viewClasses, options?)`
  - `viewClasses: { [name: string]: typeof View }` — the export name is the connecting key; it
    must match the `data-element` attribute value exactly (case-sensitive).
  - `options.attribute?: string` — the attribute name to watch, default `"data-element"`. Only
    takes effect on this instance's very first `registerViews()` call, since the
    `MutationObserver` is wired up once per instance.
  - A single element can host multiple views via a space-separated attribute value:
    `data-element="Header Dropdown"`.
- `stopObserving()` — disconnects the observers, disposes every currently-connected view
  (`onDispose()`), and resets the instance so a later `registerViews()` starts fresh. Useful for
  tests, SPA route-unmount, or hot-module-reload; a normal single-page-load site never needs it.

### `registerViews(viewClasses, options?)` / `stopObserving()`

Free-function convenience wrappers around a shared default `DomViews` instance — the entrypoint
for the common case of one page, one registry (as in the example above). Reach for `new DomViews()`
directly only when you need more than one independent instance (e.g. isolated tests).

## CLI

Scaffolds new view files so each consuming project can keep its own folder convention. Requires a
`dom-views.config.json` in the current working directory (created by `init`):

```bash
npx dom-views init <viewsDir>   # e.g. npx dom-views init packages/portfolio/Resources/Private/Frontend/Entries/Website/Views/ContentElements
npx dom-views create <Name>     # e.g. npx dom-views create Accordion
```

`create` writes `<viewsDir>/<Name>/index.ts` (a minimal `View` subclass) and
`<viewsDir>/<Name>/index.css`, then prints the two steps it does **not** do for you: adding the
export to your barrel file, and adding `data-element="<Name>"` to the element's template. Both
commands refuse to overwrite anything that already exists.

## Install

Not published to npm — install from a Git reference or local path. **If the consuming project runs
in a container (Docker/DDEV/etc.) that only mounts its own project directory**, a plain `file:`
directory reference will install as a symlink pointing *outside* that mount and silently break
inside the container — pack a tarball and install that instead, so npm extracts a real, self-
contained copy:

```bash
# in this repo, after any change:
npm run build && npm pack        # produces dom-views-<version>.tgz

# in the consuming project:
npm install /path/to/dom-views/dom-views-<version>.tgz
```

If the consuming project's dev tooling runs directly on the host with no container/mount boundary,
a plain directory reference works too and avoids the repack step on every change:

```bash
npm install file:../dom-views
```

## Develop

```bash
npm install
npm run test        # vitest, jsdom environment
npm run typecheck    # tsc --noEmit
npm run build        # tsup -> dist/ (ESM + CJS + .d.ts)
```
