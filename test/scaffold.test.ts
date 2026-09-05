import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONFIG_FILENAME, createView, initConfig, readConfig } from "../src/scaffold";

let cwd: string;

beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "dom-views-test-"));
});

afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
});

describe("initConfig", () => {
    it("writes a config file with the given viewsDir", () => {
        initConfig(cwd, "src/views");

        const config = readConfig(cwd);
        expect(config.viewsDir).toBe("src/views");
    });

    it("refuses to overwrite an existing config file", () => {
        initConfig(cwd, "src/views");

        expect(() => initConfig(cwd, "other/dir")).toThrow(CONFIG_FILENAME);
    });
});

describe("readConfig", () => {
    it("throws a helpful error when no config file exists", () => {
        expect(() => readConfig(cwd)).toThrow(/dom-views init/);
    });

    it("throws when the config file is missing viewsDir", () => {
        initConfig(cwd, "src/views");
        const configPath = join(cwd, CONFIG_FILENAME);
        writeFileSync(configPath, "{}");

        expect(() => readConfig(cwd)).toThrow(/viewsDir/);
    });
});

describe("createView", () => {
    it("creates index.ts and index.css under the configured viewsDir", () => {
        initConfig(cwd, "src/views");

        const { dir, tsPath, cssPath } = createView(cwd, "Accordion");

        expect(dir).toBe(join(cwd, "src/views", "Accordion"));
        expect(readFileSync(tsPath, "utf-8")).toContain("export class Accordion extends View");
        expect(readFileSync(tsPath, "utf-8")).toContain('import { View } from "dom-views";');
        expect(readFileSync(cssPath, "utf-8")).toContain("Accordion view styles");
    });

    it("refuses to overwrite an existing view directory", () => {
        initConfig(cwd, "src/views");
        createView(cwd, "Accordion");

        expect(() => createView(cwd, "Accordion")).toThrow("already exists");
    });

    it("throws a helpful error when no config file exists yet", () => {
        expect(() => createView(cwd, "Accordion")).toThrow(/dom-views init/);
    });
});
