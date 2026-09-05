import { View, ViewClassMap } from "./view";

export interface RegisterViewsOptions {
    attribute?: string;
}

export class DomViews {
    private registry: ViewClassMap = {};
    private instances = new WeakMap<Element, { [name: string]: View }>();
    private attribute = "data-element";
    private started = false;
    private childObserver?: MutationObserver;
    private attributeObserver?: MutationObserver;

    registerViews(viewClasses: ViewClassMap, options: RegisterViewsOptions = {}): void {
        if (!this.started && options.attribute) {
            this.attribute = options.attribute;
        }

        Object.assign(this.registry, viewClasses);

        if (this.started) {
            this.connectSubtree(document.body);
        } else {
            this.start();
        }
    }

    /**
     * Disconnects the DOM observers and forgets all registered view classes. Connected view
     * instances are disposed via `onDispose()`. Call this to tear down before re-initializing
     * (e.g. between tests, or on hot-module-reload) — normal page-lifetime usage never needs it.
     */
    stopObserving(): void {
        this.childObserver?.disconnect();
        this.attributeObserver?.disconnect();
        this.childObserver = undefined;
        this.attributeObserver = undefined;

        if (document.body) {
            this.disconnectSubtree(document.body);
        }

        this.registry = {};
        this.started = false;
        this.attribute = "data-element";
    }

    private start(): void {
        if (this.started || !document.body) {
            return;
        }
        this.started = true;

        this.connectSubtree(document.body);

        this.childObserver = new MutationObserver((records) =>
            records.forEach((record) => this.applyChildListMutation(record)),
        );
        this.childObserver.observe(document, { childList: true, subtree: true });

        this.attributeObserver = new MutationObserver((records) =>
            records.forEach((record) => this.applyAttributeMutation(record)),
        );
        this.attributeObserver.observe(document, {
            attributes: true,
            attributeFilter: [this.attribute],
            subtree: true,
        });
    }

    private elementNames(el: Element): string[] {
        const value = el.getAttribute(this.attribute);
        return value ? value.split(/\s+/) : [];
    }

    private connect(el: Element): void {
        const target = this.instances.get(el) || {};
        const existing = Object.keys(target);

        for (const name of this.elementNames(el)) {
            if (!(name in this.registry)) {
                continue;
            }

            const index = existing.indexOf(name);
            if (index === -1) {
                target[name] = new this.registry[name](el as HTMLElement);
            } else {
                existing.splice(index, 1);
            }
        }

        this.instances.set(el, target);

        for (const name of existing) {
            target[name].onDispose();
            delete target[name];
        }
    }

    private disconnect(el: Element): void {
        const views = this.instances.get(el);
        if (views) {
            this.instances.delete(el);
            for (const name in views) {
                views[name].onDispose();
            }
        }
    }

    private connectSubtree(root: Element): void {
        if (root.matches(`[${this.attribute}]`)) {
            this.connect(root);
        }
        root.querySelectorAll(`[${this.attribute}]`).forEach((el) => this.connect(el));
    }

    private disconnectSubtree(root: Element): void {
        if (root.matches(`[${this.attribute}]`)) {
            this.disconnect(root);
        }
        root.querySelectorAll(`[${this.attribute}]`).forEach((el) => this.disconnect(el));
    }

    private applyChildListMutation({ addedNodes, removedNodes }: MutationRecord): void {
        addedNodes.forEach((node) => node instanceof Element && this.connectSubtree(node));
        removedNodes.forEach((node) => node instanceof Element && this.disconnectSubtree(node));
    }

    private applyAttributeMutation({ target }: MutationRecord): void {
        if (target instanceof Element) {
            this.connect(target);
        }
    }
}
