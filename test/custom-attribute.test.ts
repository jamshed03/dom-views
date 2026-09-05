import { afterAll, beforeEach, describe, expect, it } from "vitest";
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

describe("registerViews with a custom attribute", () => {
    it("uses the configured attribute name instead of data-element", async () => {
        const connected: HTMLElement[] = [];
        class Widget extends View {
            constructor(el: HTMLElement) {
                super(el);
                connected.push(el);
            }
        }

        document.body.innerHTML = `<div data-widget="Widget"></div>`;
        registerViews({ Widget }, { attribute: "data-widget" });
        await flush();

        expect(connected).toHaveLength(1);
    });
});
