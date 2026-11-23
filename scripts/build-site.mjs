// Copies the renderer (source of truth: renderer/) to the places that ship it:
// - docs/lib/                         GitHub Pages web renderer
// - skills/network-diagram/scripts/   self-contained skill (works without npm install)
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

mkdirSync(`${root}docs/lib`, { recursive: true });
for (const f of ["core.mjs", "icons.mjs"]) cpSync(`${root}renderer/${f}`, `${root}docs/lib/${f}`);
cpSync(`${root}examples`, `${root}docs/examples`, { recursive: true, filter: (p) => !/\.(png|svg)$/.test(p) });

const skillScripts = `${root}skills/network-diagram/scripts`;
rmSync(skillScripts, { recursive: true, force: true });
cpSync(`${root}renderer`, skillScripts, { recursive: true });
console.log("docs/lib, docs/examples, skills/network-diagram/scripts updated");
