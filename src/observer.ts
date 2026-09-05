import { View, ViewClassMap } from "./view";

export interface RegisterViewsOptions {
    attribute?: string;
}

const registry: ViewClassMap = {};
const instances = new WeakMap<Element, { [name: string]: View }>();
let attribute = "data-element";
let started = false;
let childObserver: MutationObserver | undefined;
let attributeObserver: MutationObserver | undefined;

function elementNames(el: Element): string[] {
    const value = el.getAttribute(attribute);
    return value ? value.split(/\s+/) : [];
}

function connect(el: Element) {
    const target = instances.get(el) || {};
    const existing = Object.keys(target);

    for (const name of elementNames(el)) {
        if (!(name in registry)) {
            continue;
        }

        const index = existing.indexOf(name);
        if (index === -1) {
            target[name] = new registry[name](el as HTMLElement);
        } else {
            existing.splice(index, 1);
        }
    }

    instances.set(el, target);

    for (const name of existing) {
        target[name].onDispose();
        delete target[name];
    }
}

function disconnect(el: Element) {
    const views = instances.get(el);
    if (views) {
        instances.delete(el);
        for (const name in views) {
            views[name].onDispose();
        }
    }
}

function connectSubtree(root: Element) {
    if (root.matches(`[${attribute}]`)) {
        connect(root);
    }
    root.querySelectorAll(`[${attribute}]`).forEach(connect);
}

function disconnectSubtree(root: Element) {
    if (root.matches(`[${attribute}]`)) {
        disconnect(root);
    }
    root.querySelectorAll(`[${attribute}]`).forEach(disconnect);
}

function applyChildListMutation({ addedNodes, removedNodes }: MutationRecord) {
    addedNodes.forEach((node) => node instanceof Element && connectSubtree(node));
    removedNodes.forEach((node) => node instanceof Element && disconnectSubtree(node));
}

function applyAttributeMutation({ target }: MutationRecord) {
    if (target instanceof Element) {
        connect(target);
    }
}

function start() {
    if (started || !document.body) {
        return;
    }
    started = true;

    connectSubtree(document.body);

    childObserver = new MutationObserver((records) => records.forEach(applyChildListMutation));
    childObserver.observe(document, { childList: true, subtree: true });

    attributeObserver = new MutationObserver((records) => records.forEach(applyAttributeMutation));
    attributeObserver.observe(document, {
        attributes: true,
        attributeFilter: [attribute],
        subtree: true,
    });
}

export function registerViews(viewClasses: ViewClassMap, options: RegisterViewsOptions = {}) {
    if (!started && options.attribute) {
        attribute = options.attribute;
    }

    Object.assign(registry, viewClasses);

    if (started) {
        connectSubtree(document.body);
    } else {
        start();
    }
}

/**
 * Disconnects the DOM observers and forgets all registered view classes. Connected view
 * instances are disposed via `onDispose()`. Call this to tear down before re-initializing (e.g.
 * between tests, or on hot-module-reload) — normal page-lifetime usage never needs it.
 */
export function stopObserving(): void {
    childObserver?.disconnect();
    attributeObserver?.disconnect();
    childObserver = undefined;
    attributeObserver = undefined;

    if (document.body) {
        disconnectSubtree(document.body);
    }

    for (const name in registry) {
        delete registry[name];
    }

    started = false;
    attribute = "data-element";
}
