import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { View, registerViews, stopObserving } from "../src/index";

async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
    document.body.innerHTML = "";
});

afterAll(() => {
    stopObserving();
});

describe("registerViews", () => {
    it("connects an already-present element on registration", async () => {
        document.body.innerHTML = `<div data-element="AlreadyPresent"></div>`;

        const connected: HTMLElement[] = [];
        class AlreadyPresent extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        registerViews({ AlreadyPresent });
        await flush();

        expect(connected).toHaveLength(1);
    });

    it("connects a dynamically inserted element", async () => {
        const connected: HTMLElement[] = [];
        class DynamicInsert extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        registerViews({ DynamicInsert });
        await flush();
        expect(connected).toHaveLength(0);

        const el = document.createElement("div");
        el.setAttribute("data-element", "DynamicInsert");
        document.body.appendChild(el);
        await flush();

        expect(connected).toHaveLength(1);
        expect(connected[0]).toBe(el);
    });

    it("calls onDispose when a connected element is removed from the DOM", async () => {
        const disposeSpy = vi.fn();
        class DisposeCheck extends View {
            onDispose() {
                disposeSpy();
            }
        }

        const el = document.createElement("div");
        el.setAttribute("data-element", "DisposeCheck");
        document.body.appendChild(el);

        registerViews({ DisposeCheck });
        await flush();
        expect(disposeSpy).not.toHaveBeenCalled();

        el.remove();
        await flush();

        expect(disposeSpy).toHaveBeenCalledTimes(1);
    });

    it("connects when the data-element attribute is added after the fact", async () => {
        const connected: HTMLElement[] = [];
        class AttrLater extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        const el = document.createElement("div");
        document.body.appendChild(el);

        registerViews({ AttrLater });
        await flush();
        expect(connected).toHaveLength(0);

        el.setAttribute("data-element", "AttrLater");
        await flush();

        expect(connected).toHaveLength(1);
    });

    it("supports multiple space-separated names on one element", async () => {
        const connectedA: HTMLElement[] = [];
        const connectedB: HTMLElement[] = [];
        class MultiA extends View {
            constructor(el: HTMLElement) {
                super(el);
                connectedA.push(el);
            }
        }
        class MultiB extends View {
            constructor(el: HTMLElement) {
                super(el);
                connectedB.push(el);
            }
        }

        document.body.innerHTML = `<div data-element="MultiA MultiB"></div>`;
        registerViews({ MultiA, MultiB });
        await flush();

        expect(connectedA).toHaveLength(1);
        expect(connectedB).toHaveLength(1);
    });

    it("does not connect an unregistered name", async () => {
        const connected: HTMLElement[] = [];
        class Registered extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        document.body.innerHTML = `<div data-element="NotRegistered"></div>`;
        registerViews({ Registered });
        await flush();

        expect(connected).toHaveLength(0);
    });
});
