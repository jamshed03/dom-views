export type ViewClass<TView extends View = View> = {
    new (el: HTMLElement): TView;
};

export type ViewClassMap = { [name: string]: ViewClass };

export class View {
    readonly el: HTMLElement;

    constructor(el: HTMLElement) {
        this.el = el;
    }

    onDispose(): void {}
}
