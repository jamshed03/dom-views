import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CONFIG_FILENAME = "dom-views.config.json";

export interface DomViewsConfig {
    viewsDir: string;
}

export function initConfig(cwd: string, viewsDir: string): string {
    const configPath = join(cwd, CONFIG_FILENAME);
    if (existsSync(configPath)) {
        throw new Error(`${CONFIG_FILENAME} already exists at ${configPath}.`);
    }

    const config: DomViewsConfig = { viewsDir };
    writeFileSync(configPath, `${JSON.stringify(config, null, 4)}\n`);
    return configPath;
}

export function readConfig(cwd: string): DomViewsConfig {
    const configPath = join(cwd, CONFIG_FILENAME);
    if (!existsSync(configPath)) {
        throw new Error(`No ${CONFIG_FILENAME} found in ${cwd}. Run "dom-views init <viewsDir>" first.`);
    }

    const config = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<DomViewsConfig>;
    if (!config.viewsDir) {
        throw new Error(`${CONFIG_FILENAME} is missing "viewsDir".`);
    }

    return config as DomViewsConfig;
}

function viewSource(name: string): string {
    return `import { View } from "dom-views";
import "./index.css";

export class ${name} extends View {
    constructor(el: HTMLElement) {
        super(el);
    }
}
`;
}

function viewStyles(name: string): string {
    return `/* ${name} view styles */\n`;
}

export interface CreatedView {
    dir: string;
    tsPath: string;
    cssPath: string;
}

export function createView(cwd: string, name: string): CreatedView {
    const config = readConfig(cwd);
    const dir = join(cwd, config.viewsDir, name);
    if (existsSync(dir)) {
        throw new Error(`${dir} already exists.`);
    }

    mkdirSync(dir, { recursive: true });

    const tsPath = join(dir, "index.ts");
    const cssPath = join(dir, "index.css");
    writeFileSync(tsPath, viewSource(name));
    writeFileSync(cssPath, viewStyles(name));

    return { dir, tsPath, cssPath };
}
