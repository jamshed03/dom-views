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

### `registerViews(viewClasses, options?)`

- `viewClasses: { [name: string]: typeof View }` — the export name is the connecting key; it must
  match the `data-element` attribute value exactly (case-sensitive).
- `options.attribute?: string` — the attribute name to watch, default `"data-element"`. Only takes
  effect on the very first call (across the whole page) since the `MutationObserver` is wired up
  once.
- A single element can host multiple views via a space-separated attribute value:
  `data-element="Header Dropdown"`.

## Install

Not published to npm — install from a Git reference or local path:

```bash
npm install git+ssh://git@github.com/<you>/dom-views.git
# or, while developing locally:
npm install file:../dom-views
```

## Develop

```bash
npm install
npm run test        # vitest, jsdom environment
npm run typecheck    # tsc --noEmit
npm run build        # tsup -> dist/ (ESM + CJS + .d.ts)
```
