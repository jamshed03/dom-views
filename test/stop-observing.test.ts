import { describe, expect, it, vi } from "vitest";
import { View, registerViews, stopObserving } from "../src/index";

async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("stopObserving", () => {
    it("disposes connected views and stops reacting to further DOM changes", async () => {
        const disposeSpy = vi.fn();
        class Stoppable extends View {
            onDispose() {
                disposeSpy();
            }
        }

        document.body.innerHTML = `<div data-element="Stoppable"></div>`;
        registerViews({ Stoppable });
        await flush();
        expect(disposeSpy).not.toHaveBeenCalled();

        stopObserving();
        expect(disposeSpy).toHaveBeenCalledTimes(1);

        const connectedAfterStop: HTMLElement[] = [];
        class AfterStop extends View {
            constructor(el: HTMLElement) {
                super(el);
                connectedAfterStop.push(el);
            }
        }

        document.body.innerHTML = `<div data-element="AfterStop"></div>`;
        await flush();

        expect(connectedAfterStop).toHaveLength(0);

        // registerViews() re-initializes cleanly after a full stop.
        registerViews({ AfterStop });
        await flush();
        expect(connectedAfterStop).toHaveLength(1);

        stopObserving();
    });
});
