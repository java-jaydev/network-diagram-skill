#!/usr/bin/env node
// Usage: netdiagram <spec.yaml> [-o out.svg] [--icons custom|affinity] [--png out.png]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import yaml from "./vendor/js-yaml.mjs";
import ELK from "./vendor/elk.bundled.cjs";
import { render } from "./core.mjs";
import { TYPES, ICONSETS } from "./icons.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const out = opt("-o");
const png = opt("--png");
const iconsetArg = opt("--icons");
const input = args[0];
if (!input) {
  console.error("사용법: netdiagram <spec.yaml> [-o out.svg] [--icons custom|affinity] [--png out.png]");
  console.error(`사용 가능한 type: ${Object.keys(TYPES).join(", ")}`);
  process.exit(2);
}

const spec = yaml.load(readFileSync(input, "utf8"));
const iconset = iconsetArg || spec.icons || "custom";
try {
  const { svg, warnings } = await render(spec, { ELK, icons: ICONSETS[iconset], types: TYPES });
  const svgPath = resolve(out || input.replace(/\.(ya?ml|json)$/i, "") + ".svg");
  writeFileSync(svgPath, svg);
  for (const w of warnings) console.warn(`경고: ${w}`);
  console.log(`SVG: ${svgPath}`);
  if (png) {
    const chrome = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => p && existsSync(p));
    if (!chrome) throw new Error("PNG 변환에는 Chrome/Chromium 이 필요합니다. SVG 를 브라우저로 열어 저장하세요.");
    const [, w, h] = svg.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
    execFileSync(chrome, ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${Math.ceil(w)},${Math.ceil(h)}`, `--screenshot=${resolve(png)}`, `file://${svgPath}`], { stdio: "ignore" });
    console.log(`PNG: ${resolve(png)}`);
  }
} catch (e) {
  console.error(e.errors ? `명세 오류:\n- ${e.errors.join("\n- ")}` : e.message);
  process.exit(1);
}
