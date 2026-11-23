import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import yaml from "../renderer/vendor/js-yaml.mjs";
import ELK from "../renderer/vendor/elk.bundled.cjs";
import { render, validate } from "../renderer/core.mjs";
import { TYPES, ICONSETS } from "../renderer/icons.mjs";

const opts = { ELK, icons: ICONSETS.custom, types: TYPES };
const base = () => ({
  nodes: [{ id: "internet", type: "internet" }],
  zones: [{ id: "office", label: "사무실", nodes: [{ id: "fw", type: "firewall" }, { id: "pc", type: "pc" }] }],
  links: [["internet", "fw"], ["fw", "pc"]],
});

test("valid spec has no errors", () => {
  assert.deepEqual(validate(base(), TYPES), { errors: [], warnings: [] });
});

test("link to a zone id is an error", () => {
  const s = base();
  s.links.push(["fw", "office"]);
  assert.match(validate(s, TYPES).errors.join(), /"office" 는 zone/);
});

test("unknown type, duplicate id and missing link target are errors", () => {
  const s = base();
  s.zones[0].nodes.push({ id: "pc", type: "toaster" });
  s.links.push(["fw", "ghost"]);
  const { errors } = validate(s, TYPES);
  assert.ok(errors.some((e) => e.includes("id 중복: pc")));
  assert.ok(errors.some((e) => e.includes('없는 id "ghost"')));
});

test("unlinked node is a warning, not an error", () => {
  const s = base();
  s.zones[0].nodes.push({ id: "nas", type: "nas" });
  const r = validate(s, TYPES);
  assert.equal(r.errors.length, 0);
  assert.match(r.warnings[0], /nas/);
});

test("render throws with all errors listed", async () => {
  const s = base();
  s.links.push(["fw", "ghost"]);
  await assert.rejects(render(s, opts), (e) => e.errors.length === 1);
});

test("render places every node and draws vpn and flows", async () => {
  const spec = yaml.load(readFileSync(new URL("../examples/hq-and-warehouse.yaml", import.meta.url), "utf8"));
  const { svg, warnings } = await render(spec, opts);
  assert.deepEqual(warnings, []);
  const nodeCount = (svg.match(/<image /g) || []).length;
  const expected = spec.nodes.length + JSON.stringify(spec.zones).match(/"type":/g).length;
  assert.equal(nodeCount, expected);
  assert.match(svg, /stroke-dasharray="12,7"/); // vpn
  assert.match(svg, /주요 통신 경로/);
  assert.match(svg, />차단</);
  assert.doesNotMatch(svg, /NaN|undefined/);
});

test("edges stay inside the canvas (container offsets applied)", async () => {
  const spec = yaml.load(readFileSync(new URL("../examples/hq-and-warehouse.yaml", import.meta.url), "utf8"));
  const { svg, width, height } = await render(spec, opts);
  for (const m of svg.matchAll(/<polyline points="([^"]+)"/g)) {
    for (const pt of m[1].split(" ")) {
      const [x, y] = pt.split(",").map(Number);
      assert.ok(x >= 0 && x <= width && y >= 0 && y <= height, `point ${pt} outside ${width}x${height}`);
    }
  }
});

test("every yaml example in references/spec.md renders", async () => {
  const md = readFileSync(new URL("../skills/network-diagram/references/spec.md", import.meta.url), "utf8");
  const blocks = [...md.matchAll(/```yaml\n([\s\S]*?)```/g)].map((m) => yaml.load(m[1])).filter((b) => b && b.links);
  assert.ok(blocks.length >= 1);
  for (const b of blocks) await render(b, opts);
});

test("every type has an icon in both icon sets and the docs table lists every type", () => {
  const md = readFileSync(new URL("../skills/network-diagram/references/spec.md", import.meta.url), "utf8");
  for (const t of Object.keys(TYPES)) {
    assert.ok(ICONSETS.custom[t]?.startsWith("data:image/svg+xml"), t);
    assert.ok(ICONSETS.affinity[t]?.startsWith("data:image/svg+xml"), t);
    assert.ok(md.includes(`| ${t} |`), `spec.md type table missing ${t}`);
  }
});

test("examples folder: every yaml renders", async () => {
  const dir = new URL("../examples/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    await render(yaml.load(readFileSync(new URL(f, dir), "utf8")), opts);
  }
});

test("every edge starts and ends at a node (regression: container-relative edge points)", async () => {
  const spec = yaml.load(readFileSync(new URL("../examples/hq-and-warehouse.yaml", import.meta.url), "utf8"));
  const { svg } = await render(spec, opts);
  const icons = [...svg.matchAll(/<image href="[^"]+" x="([\d.]+)" y="([\d.]+)" width="56"/g)].map((m) => [Number(m[1]) + 28, Number(m[2]) + 28]);
  const nearNode = ([x, y]) => icons.some(([cx, cy]) => Math.abs(x - cx) <= 90 && Math.abs(y - cy) <= 110);
  const wires = [...svg.matchAll(/<polyline points="([^"]+)" fill="none" stroke="#(34495E|2E86C1)"/g)];
  assert.ok(wires.length > 10);
  for (const [, pts] of wires) {
    const p = pts.split(" ").map((s) => s.split(",").map(Number));
    assert.ok(nearNode(p[0]) && nearNode(p.at(-1)), `edge ${pts} does not touch a node`);
  }
});
