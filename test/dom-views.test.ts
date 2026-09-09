import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomViews, View } from "../src/index";

async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

let views: DomViews;

beforeEach(() => {
    document.body.innerHTML = "";
    views = new DomViews();
});

afterEach(() => {
    views.stopObserving();
});

describe("DomViews", () => {
    it("connects an already-present element on registration", async () => {
        document.body.innerHTML = `<div data-view="Widget"></div>`;

        const connected: HTMLElement[] = [];
        class Widget extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        views.registerViews({ Widget });
        await flush();

        expect(connected).toHaveLength(1);
    });

    it("connects a dynamically inserted element", async () => {
        const connected: HTMLElement[] = [];
        class Widget extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        views.registerViews({ Widget });
        await flush();
        expect(connected).toHaveLength(0);

        const el = document.createElement("div");
        el.setAttribute("data-view", "Widget");
        document.body.appendChild(el);
        await flush();

        expect(connected).toHaveLength(1);
        expect(connected[0]).toBe(el);
    });

    it("calls onDispose when a connected element is removed from the DOM", async () => {
        const disposeSpy = vi.fn();
        class Widget extends View {
            onDispose() {
                disposeSpy();
            }
        }

        const el = document.createElement("div");
        el.setAttribute("data-view", "Widget");
        document.body.appendChild(el);

        views.registerViews({ Widget });
        await flush();
        expect(disposeSpy).not.toHaveBeenCalled();

        el.remove();
        await flush();

        expect(disposeSpy).toHaveBeenCalledTimes(1);
    });

    it("connects when the data-view attribute is added after the fact", async () => {
        const connected: HTMLElement[] = [];
        class Widget extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        const el = document.createElement("div");
        document.body.appendChild(el);

        views.registerViews({ Widget });
        await flush();
        expect(connected).toHaveLength(0);

        el.setAttribute("data-view", "Widget");
        await flush();

        expect(connected).toHaveLength(1);
    });

    it("supports multiple space-separated names on one element", async () => {
        const connectedA: HTMLElement[] = [];
        const connectedB: HTMLElement[] = [];
        class A extends View {
            constructor(el: HTMLElement) {
                super(el);
                connectedA.push(el);
            }
        }
        class B extends View {
            constructor(el: HTMLElement) {
                super(el);
                connectedB.push(el);
            }
        }

        document.body.innerHTML = `<div data-view="A B"></div>`;
        views.registerViews({ A, B });
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

        document.body.innerHTML = `<div data-view="NotRegistered"></div>`;
        views.registerViews({ Registered });
        await flush();

        expect(connected).toHaveLength(0);
    });

    it("is isolated per instance — two DomViews don't see each other's registrations", async () => {
        const otherViews = new DomViews();

        const connected: HTMLElement[] = [];
        class OnlyOnMain extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        document.body.innerHTML = `<div data-view="OnlyOnMain"></div>`;
        otherViews.registerViews({});
        views.registerViews({ OnlyOnMain });
        await flush();

        expect(connected).toHaveLength(1);
        otherViews.stopObserving();
    });

    describe("stopObserving", () => {
        it("disposes connected views and stops reacting to further DOM changes", async () => {
            const disposeSpy = vi.fn();
            class Stoppable extends View {
                onDispose() {
                    disposeSpy();
                }
            }

            document.body.innerHTML = `<div data-view="Stoppable"></div>`;
            views.registerViews({ Stoppable });
            await flush();
            expect(disposeSpy).not.toHaveBeenCalled();

            views.stopObserving();
            expect(disposeSpy).toHaveBeenCalledTimes(1);

            const connectedAfterStop: HTMLElement[] = [];
            class AfterStop extends View {
                constructor(el: HTMLElement) {
                    super(el);
                    connectedAfterStop.push(el);
                }
            }

            document.body.innerHTML = `<div data-view="AfterStop"></div>`;
            await flush();
            expect(connectedAfterStop).toHaveLength(0);

            // registerViews() re-initializes cleanly after a full stop.
            views.registerViews({ AfterStop });
            await flush();
            expect(connectedAfterStop).toHaveLength(1);
        });
    });
});
