// Network diagram renderer: spec (plain object, usually parsed from YAML) -> SVG string.
// Runs in the browser and in Node. The caller passes an ELK constructor and the icon table.

const FONT = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif";
const ICON = 56;
const MARK_COLORS = { new: "#E53935", add: "#F39C12", assume: "#F39C12" };
const LINK_STYLES = {
  wire: { stroke: "#34495E", width: 2, dash: "" },
  wifi: { stroke: "#2E86C1", width: 2, dash: "3,4" },
  vpn: { stroke: "#7D3C98", width: 4, dash: "12,7" },
  fiber: { stroke: "#D35400", width: 2.5, dash: "" },
  logical: { stroke: "#7F8C8D", width: 1.6, dash: "6,5" },
};
const ZONE_COLORS = {
  site: "#1B3A5C", internal: "#1565C0", dmz: "#7F8C8D", wireless: "#2E7D32",
  control: "#E67E22", cctv: "#5D6D7E", cloud: "#2471A3", external: "#6C3483", default: "#34495E",
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isWide = (ch) => /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/.test(ch);
export function textWidth(s, size) {
  let w = 0;
  for (const ch of String(s ?? "")) w += isWide(ch) ? size : size * 0.6;
  return w;
}
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

export function validate(spec, types) {
  const errors = [];
  const ids = new Map();
  const walk = (z, path) => {
    if (!z.id) errors.push(`${path}: zone 에 id 가 없습니다`);
    else if (ids.has(z.id)) errors.push(`id 중복: ${z.id}`);
    else ids.set(z.id, "zone");
    for (const n of asList(z.nodes)) addNode(n, `${path}/${z.id}`);
    for (const c of asList(z.zones)) walk(c, `${path}/${z.id}`);
  };
  const addNode = (n, path) => {
    if (!n.id) return errors.push(`${path}: node 에 id 가 없습니다`);
    if (ids.has(n.id)) return errors.push(`id 중복: ${n.id}`);
    ids.set(n.id, "node");
    if (!n.type) errors.push(`${n.id}: type 이 없습니다`);
    else if (types && !types[n.type]) errors.push(`${n.id}: 알 수 없는 type "${n.type}" (사용 가능: ${Object.keys(types).join(", ")})`);
  };
  for (const n of asList(spec.nodes)) addNode(n, "nodes");
  for (const z of asList(spec.zones)) walk(z, "zones");
  const linked = new Set();
  for (const [i, l] of asList(spec.links).entries()) {
    const { from, to } = normLink(l);
    for (const end of [from, to]) {
      if (!ids.has(end)) errors.push(`links[${i}]: 없는 id "${end}"`);
      else if (ids.get(end) !== "node") errors.push(`links[${i}]: "${end}" 는 zone 입니다. 장비(node) id 를 써야 합니다`);
      linked.add(end);
    }
  }
  const unlinked = [...ids].filter(([id, k]) => k === "node" && !linked.has(id)).map(([id]) => id);
  return { errors, warnings: unlinked.length ? [`연결선이 없는 장비: ${unlinked.join(", ")}`] : [] };
}

function normLink(l) {
  if (Array.isArray(l)) return { from: l[0], to: l[1], style: l[2] || "wire" };
  return { style: "wire", ...l };
}

function nodeSize(n) {
  const subs = asList(n.sub);
  const w = Math.max(120, textWidth(n.label ?? n.id, 15) + 24, ...subs.map((s) => textWidth(s, 12.5) + 24));
  const h = 10 + ICON + 12 + 18 + subs.length * 17 + 6;
  return { width: Math.ceil(w), height: Math.ceil(h) };
}

function buildElk(spec) {
  const nodeIndex = {};
  const zoneIndex = {};
  const mkNode = (n) => {
    nodeIndex[n.id] = n;
    return { id: n.id, ...nodeSize(n) };
  };
  const mkZone = (z) => {
    zoneIndex[z.id] = z;
    return {
      id: z.id,
      layoutOptions: { "elk.padding": "[top=62,left=30,bottom=30,right=30]" },
      children: [...asList(z.zones).map(mkZone), ...asList(z.nodes).map(mkNode)],
    };
  };
  const links = asList(spec.links).map(normLink);
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": spec.direction === "right" ? "RIGHT" : "DOWN",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": "70",
      "elk.spacing.edgeNode": "28",
      "elk.spacing.edgeEdge": "16",
      "elk.layered.spacing.edgeNodeBetweenLayers": "28",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.padding": "[top=20,left=20,bottom=20,right=20]",
    },
    children: [...asList(spec.zones).map(mkZone), ...asList(spec.nodes).map(mkNode)],
    edges: links
      .map((l, i) => ({ ...l, i }))
      .filter((l) => l.style !== "vpn")
      .map((l) => ({ id: `e${l.i}`, sources: [l.from], targets: [l.to] })),
  };
  return { graph, links, nodeIndex, zoneIndex };
}

function collect(elkNode, ox, oy, depth, out) {
  for (const c of elkNode.children ?? []) {
    const x = ox + c.x, y = oy + c.y;
    out.push({ id: c.id, x, y, w: c.width, h: c.height, depth, isZone: !!c.children });
    if (c.children) collect(c, x, y, depth + 1, out);
  }
  return out;
}

function zoneColor(z) {
  return z.color || ZONE_COLORS[z.kind] || ZONE_COLORS.default;
}

function iconHref(type, icons) {
  return icons[type] || icons.server;
}

export async function render(spec, { ELK, icons, types }) {
  const { errors, warnings } = validate(spec, types);
  if (errors.length) {
    const e = new Error(errors.join("\n"));
    e.errors = errors;
    throw e;
  }
  const { graph, links, nodeIndex, zoneIndex } = buildElk(spec);
  const laid = await new ELK().layout(graph);

  const MARGIN = 30;
  const titleH = spec.title ? (spec.subtitle ? 92 : 66) : 10;
  const ox = MARGIN, oy = titleH;
  const boxes = collect(laid, ox, oy, 0, []);
  const pos = Object.fromEntries(boxes.map((b) => [b.id, b]));

  const parts = { zones: [], edges: [], zoneLabels: [], nodes: [], text: [] };
  const usedStyles = new Set();
  const usedMarks = new Set();

  // zones (outer first)
  for (const b of boxes.filter((b) => b.isZone).sort((a, c) => a.depth - c.depth)) {
    const z = zoneIndex[b.id];
    const col = zoneColor(z);
    parts.zones.push(
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="#FFFFFF" fill-opacity="${b.depth ? 0 : 1}" stroke="${col}" stroke-width="2"${z.kind === "dmz" ? ' stroke-dasharray="9,5"' : ""}/>`,
    );
    parts.zoneLabels.push(
      `<path d="M${b.x} ${b.y + 32} V${b.y + 10} a10 10 0 0 1 10 -10 H${b.x + b.w - 10} a10 10 0 0 1 10 10 V${b.y + 32} Z" fill="${col}"/>`,
      `<text x="${b.x + 14}" y="${b.y + 22}" font-size="15" font-weight="bold" fill="#FFFFFF">${esc(z.label ?? z.id)}</text>`,
    );
    const info = [z.cidr, z.vlan != null ? `VLAN ${z.vlan}` : null, z.note].filter(Boolean).join(" · ");
    if (info) parts.zoneLabels.push(`<text x="${b.x + 14}" y="${b.y + 50}" font-size="13" fill="${col}" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">${esc(info)}</text>`);
  }

  // edges laid out by ELK
  for (const e of laid.edges ?? []) {
    const l = links[Number(e.id.slice(1))];
    const st = LINK_STYLES[l.style] || LINK_STYLES.wire;
    usedStyles.add(l.style in LINK_STYLES ? l.style : "wire");
    // elkjs reports edge points relative to the edge's container (lowest common ancestor)
    const c = pos[e.container];
    const ex = c ? c.x : ox, ey = c ? c.y : oy;
    for (const s of e.sections ?? []) {
      const pts = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map((p) => `${p.x + ex},${p.y + ey}`).join(" ");
      parts.edges.push(`<polyline points="${pts}" fill="none" stroke="${st.stroke}" stroke-width="${st.width}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""}/>`);
      if (l.label) {
        const all = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
        const m = all[Math.floor(all.length / 2)];
        const p = all[Math.floor(all.length / 2) - 1] ?? all[0];
        const lx = (m.x + p.x) / 2 + ex, ly = (m.y + p.y) / 2 + ey;
        const tw = textWidth(l.label, 12) + 10;
        parts.text.push(
          `<rect x="${lx - tw / 2}" y="${ly - 10}" width="${tw}" height="18" rx="4" fill="#FFFFFF" fill-opacity="0.9"/>`,
          `<text x="${lx}" y="${ly + 3}" font-size="12" font-weight="bold" text-anchor="middle" fill="${st.stroke}">${esc(l.label)}</text>`,
        );
      }
    }
  }

  // vpn tunnels: drawn icon-center to icon-center, not used for layout
  const iconCenter = (id) => ({ x: pos[id].x + pos[id].w / 2, y: pos[id].y + 10 + ICON / 2 });
  for (const l of links.filter((l) => l.style === "vpn")) {
    usedStyles.add("vpn");
    const a = iconCenter(l.from), b = iconCenter(l.to);
    const st = LINK_STYLES.vpn;
    const pts = Math.abs(a.y - b.y) < 4 ? `${a.x},${a.y} ${b.x},${b.y}` : `${a.x},${a.y} ${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`;
    parts.edges.push(`<polyline points="${pts}" fill="none" stroke="${st.stroke}" stroke-width="${st.width}" stroke-dasharray="${st.dash}"/>`);
    if (l.label) parts.text.push(`<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 10}" font-size="13" font-weight="bold" text-anchor="middle" fill="${st.stroke}" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">${esc(l.label)}</text>`);
  }

  // nodes
  for (const b of boxes.filter((b) => !b.isZone)) {
    const n = nodeIndex[b.id];
    const cx = b.x + b.w / 2, iy = b.y + 10;
    parts.nodes.push(
      `<rect x="${cx - ICON / 2}" y="${iy}" width="${ICON}" height="${ICON}" rx="12" fill="#FFFFFF"/>`,
      `<image href="${iconHref(n.type, icons)}" x="${cx - ICON / 2}" y="${iy}" width="${ICON}" height="${ICON}"/>`,
    );
    if (n.mark && MARK_COLORS[n.mark]) {
      usedMarks.add(n.mark);
      parts.nodes.push(`<rect x="${cx - ICON / 2 - 7}" y="${iy - 7}" width="${ICON + 14}" height="${ICON + 14}" rx="14" fill="none" stroke="${MARK_COLORS[n.mark]}" stroke-width="2.5" stroke-dasharray="7,4"/>`);
    }
    const ty = iy + ICON + 22;
    parts.text.push(`<text x="${cx}" y="${ty}" font-size="15" font-weight="bold" text-anchor="middle" fill="#1F2A36" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">${esc(n.label ?? n.id)}</text>`);
    asList(n.sub).forEach((s, i) =>
      parts.text.push(`<text x="${cx}" y="${ty + 18 + i * 17}" font-size="12.5" text-anchor="middle" fill="#5D6D7E" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">${esc(s)}</text>`));
  }

  // canvas size so far
  let W = Math.max(laid.width + 2 * MARGIN, 900);
  let y = oy + laid.height + 30;
  const extra = [];

  // flows table
  const flows = asList(spec.flows);
  if (flows.length) {
    const head = ["#", "구간", "출발 → 목적", "서비스(포트)", "비고"];
    const rows = flows.map((f, i) => [String(i + 1), f.name ?? "", `${f.from ?? ""} → ${f.to ?? ""}`, f.deny ? "차단" : f.port ?? "", f.note ?? ""]);
    const colW = head.map((h, c) => Math.max(textWidth(h, 14), ...rows.map((r) => textWidth(r[c], 14))) + 30);
    const tableW = colW.reduce((a, b) => a + b, 0) + 30;
    W = Math.max(W, tableW + 2 * MARGIN);
    const h = 70 + rows.length * 34 + 16;
    extra.push(sectionBox(MARGIN, y, W - 2 * MARGIN, h, "주요 통신 경로 (방화벽 정책)"));
    let x = MARGIN + 16;
    head.forEach((t, c) => { extra.push(`<text x="${x}" y="${y + 60}" font-size="14" font-weight="bold">${esc(t)}</text>`); x += colW[c]; });
    extra.push(`<line x1="${MARGIN + 12}" y1="${y + 72}" x2="${W - MARGIN - 12}" y2="${y + 72}" stroke="#D5DBE1"/>`);
    rows.forEach((r, i) => {
      let cx = MARGIN + 16;
      const color = flows[i].deny ? "#C0392B" : "#1F2A36";
      r.forEach((t, c) => { extra.push(`<text x="${cx}" y="${y + 100 + i * 34}" font-size="14" fill="${color}">${esc(t)}</text>`); cx += colW[c]; });
    });
    y += h + 20;
  }

  // legend + notes
  const notes = asList(spec.notes);
  const legendItems = [];
  const styleNames = { wire: "유선 (Ethernet)", wifi: "무선 (WIFI)", vpn: "VPN 터널 (논리 경로)", fiber: "광케이블", logical: "논리 연결" };
  for (const s of Object.keys(LINK_STYLES)) if (usedStyles.has(s)) legendItems.push({ kind: "line", s, text: styleNames[s] });
  const markNames = { new: "신규 도입", add: "추가 (확인 필요)", assume: "추정 / 가정" };
  for (const m of Object.keys(MARK_COLORS)) if (usedMarks.has(m)) legendItems.push({ kind: "mark", m, text: spec.legend?.[m] ?? markNames[m] });
  if (legendItems.length || notes.length) {
    const h = 50 + legendItems.length * 32 + notes.length * 26 + 12;
    extra.push(sectionBox(MARGIN, y, W - 2 * MARGIN, h, "범례 / 참고"));
    let ly = y + 64;
    for (const it of legendItems) {
      if (it.kind === "line") {
        const st = LINK_STYLES[it.s];
        extra.push(`<line x1="${MARGIN + 18}" y1="${ly - 5}" x2="${MARGIN + 72}" y2="${ly - 5}" stroke="${st.stroke}" stroke-width="${st.width}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""}/>`);
      } else {
        extra.push(`<rect x="${MARGIN + 20}" y="${ly - 17}" width="50" height="22" rx="6" fill="none" stroke="${MARK_COLORS[it.m]}" stroke-width="2.5" stroke-dasharray="7,4"/>`);
      }
      extra.push(`<text x="${MARGIN + 86}" y="${ly}" font-size="14">${esc(it.text)}</text>`);
      ly += 32;
    }
    for (const n of notes) { extra.push(`<text x="${MARGIN + 18}" y="${ly}" font-size="13.5" fill="#5D6D7E">· ${esc(n)}</text>`); ly += 26; }
    y += h + 20;
  }

  const H = y + 10;
  const title = spec.title
    ? `<text x="${MARGIN}" y="44" font-size="26" font-weight="bold" fill="#1F2A36">${esc(spec.title)}</text>` +
      (spec.subtitle ? `<text x="${MARGIN}" y="72" font-size="15" fill="#5D6D7E">${esc(spec.subtitle)}</text>` : "")
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" fill="#1F2A36">` +
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>` + title +
    parts.zones.join("") + parts.edges.join("") + parts.zoneLabels.join("") + parts.nodes.join("") + parts.text.join("") + extra.join("") + `</svg>`;
  return { svg, warnings, width: W, height: H };
}

function sectionBox(x, y, w, h, title) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#FFFFFF" stroke="#34495E" stroke-width="2"/>` +
    `<path d="M${x} ${y + 32} V${y + 10} a10 10 0 0 1 10 -10 H${x + w - 10} a10 10 0 0 1 10 10 V${y + 32} Z" fill="#34495E"/>` +
    `<text x="${x + 14}" y="${y + 22}" font-size="15" font-weight="bold" fill="#FFFFFF">${esc(title)}</text>`;
}
