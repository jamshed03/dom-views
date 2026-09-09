export { View } from "./view";
export type { ViewClass, ViewClassMap } from "./view";
export { DomViews } from "./dom-views";

import { DomViews } from "./dom-views";
import { ViewClassMap } from "./view";

const defaultInstance = new DomViews();

/**
 * Registers views on the shared default `DomViews` instance — the convenient entrypoint for the
 * common case of one page, one registry. For multiple independent instances (e.g. isolated tests),
 * construct `new DomViews()` directly instead.
 */
export function registerViews(viewClasses: ViewClassMap): void {
    defaultInstance.registerViews(viewClasses);
}

/** Tears down the shared default instance. See `DomViews.stopObserving()`. */
export function stopObserving(): void {
    defaultInstance.stopObserving();
}
