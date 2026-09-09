#!/usr/bin/env node
import { createView, initConfig } from "./scaffold";

function printChecklist(name: string): void {
    console.log(`
Created ${name}/index.ts and ${name}/index.css.

Next steps:
  1. Export "${name}" from the nearest barrel index.ts.
  2. Add data-view="${name}" to the element's template root.
`);
}

function main(): void {
    const [, , command, arg] = process.argv;

    try {
        if (command === "init") {
            if (!arg) {
                throw new Error("Usage: dom-views init <viewsDir>");
            }
            const configPath = initConfig(process.cwd(), arg);
            console.log(`Created ${configPath} with viewsDir "${arg}".`);
            return;
        }

        if (command === "create") {
            if (!arg) {
                throw new Error("Usage: dom-views create <Name>");
            }
            createView(process.cwd(), arg);
            printChecklist(arg);
            return;
        }

        throw new Error(
            `Unknown command "${command ?? ""}". Usage: dom-views init <viewsDir> | dom-views create <Name>`,
        );
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}

main();
