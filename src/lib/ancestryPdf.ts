/**
 * Gerador de PDF vetorial multipágina para o relatório "Minhas Origens".
 * Produz capa cinematográfica, mapa-múndi desenhado, rosca de composição,
 * páginas editoriais por origem, rotas, linha do tempo e metodologia.
 * Sem dependências externas: escreve operadores PDF diretamente.
 */

const W = 595.28; // A4 retrato (pt)
const H = 841.89;

const INK = { r: 0.09, g: 0.13, b: 0.11 }; // grafite esverdeado
const CREAM = { r: 0.96, g: 0.94, b: 0.89 };
const OLIVE = { r: 0.35, g: 0.42, b: 0.27 };
const GOLD = { r: 0.79, g: 0.54, b: 0.23 };
const MUTED = { r: 0.45, g: 0.47, b: 0.43 };

type RGB = { r: number; g: number; b: number };

export type PdfRegion = {
  label: string;
  path: string;
  percentage: number;
  rangeMin: number | null;
  rangeMax: number | null;
  confidence: string;
  color: string;
  latitude: number | null;
  longitude: number | null;
  populationGroup?: string | null;
  summary?: string | null;
  fullText?: string | null;
  historicalText?: string | null;
  limitations?: string | null;
};

export type PdfRoute = { label: string; period?: string | null; description?: string | null };
export type PdfEvent = { period: string; title: string; description?: string | null };

export type AncestryPdfData = {
  patientName: string;
  version: number | string;
  publishedAt?: string | null;
  labName?: string | null;
  algorithm?: string | null;
  referencePopulation?: string | null;
  processedAt?: string | null;
  technicalLead?: string | null;
  regions: PdfRegion[];
  routes: PdfRoute[];
  timeline: PdfEvent[];
};

function hexToRgb(hex: string | null | undefined): RGB {
  const h = (hex ?? "#c98a3a").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

const CHAR_MAP: Record<string, string> = {
  "\u2192": ">",
  "\u2190": "<",
  "\u2013": "-",
  "\u2014": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2026": "...",
  "\u00a0": " ",
};

function esc(value: string) {
  const latin = Array.from(value)
    .map((ch) => {
      if (CHAR_MAP[ch]) return CHAR_MAP[ch];
      return ch.charCodeAt(0) <= 255 ? ch : "";
    })
    .join("");
  return latin.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Quebra de linha aproximada por largura média de caractere. */
function wrap(text: string, size: number, maxWidth: number) {
  const perChar = size * 0.5;
  const max = Math.max(8, Math.floor(maxWidth / perChar));
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + (line ? " " : "") + w).length > max) {
      if (line) out.push(line);
      line = w;
    } else {
      line += (line ? " " : "") + w;
    }
  }
  if (line) out.push(line);
  return out;
}

function fitText(value: string, size: number, maxWidth: number) {
  const max = Math.max(4, Math.floor(maxWidth / (size * 0.5)));
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
}

class Page {
  ops: string[] = [];

  fill(c: RGB) {
    this.ops.push(`${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg`);
    return this;
  }
  stroke(c: RGB) {
    this.ops.push(`${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG`);
    return this;
  }
  alpha(name: string) {
    this.ops.push(`/${name} gs`);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, mode: "f" | "S" = "f") {
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${mode}`);
    return this;
  }
  line(x1: number, y1: number, x2: number, y2: number, width = 0.8) {
    this.ops.push(`${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    return this;
  }
  circle(cx: number, cy: number, r: number, mode: "f" | "S" = "f") {
    const k = 0.5523 * r;
    this.ops.push(
      `${(cx - r).toFixed(2)} ${cy.toFixed(2)} m ` +
        `${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c ` +
        `${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c ` +
        `${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c ` +
        `${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c ${mode}`,
    );
    return this;
  }
  /** Fatia de rosca (setor entre raio interno e externo). */
  wedge(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number) {
    const steps = Math.max(2, Math.ceil((a1 - a0) / 6));
    const pts: string[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      pts.push(`${(cx + rOut * Math.cos(a)).toFixed(2)} ${(cy + rOut * Math.sin(a)).toFixed(2)} ${i === 0 ? "m" : "l"}`);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      pts.push(`${(cx + rIn * Math.cos(a)).toFixed(2)} ${(cy + rIn * Math.sin(a)).toFixed(2)} l`);
    }
    this.ops.push(`${pts.join(" ")} h f`);
    return this;
  }
  path(d: string, mode: "f" | "S" = "f") {
    this.ops.push(`${d} ${mode}`);
    return this;
  }
  text(x: number, y: number, value: string, size = 10, font = "F1") {
    this.ops.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(value)}) Tj ET`);
    return this;
  }
  textCenter(cx: number, y: number, value: string, size = 10, font = "F1") {
    const w = value.length * size * 0.5;
    return this.text(cx - w / 2, y, value, size, font);
  }
  paragraph(x: number, y: number, value: string, size: number, maxWidth: number, leading = 1.45) {
    const lines = wrap(value, size, maxWidth);
    lines.forEach((l, i) => this.text(x, y - i * size * leading, l, size));
    return y - lines.length * size * leading;
  }
  build() {
    return this.ops.join("\n");
  }
}

/** Mapa-múndi simplificado, mesmas massas do componente de tela. */
const CONTINENTS = [
  "120 90 215 70 300 96 288 140 250 150 232 190 196 205 170 250 140 236 120 190 112 140",
  "232 258 280 250 300 300 292 350 268 420 240 452 222 400 228 330",
  "448 60 520 52 560 74 556 104 520 120 470 118 440 96",
  "470 130 540 128 566 170 560 240 534 300 500 340 470 300 455 220 452 170",
  "600 70 760 60 860 96 880 150 820 210 740 220 680 190 620 140",
  "700 230 760 226 790 260 770 300 720 290 692 262",
  "812 330 900 322 936 360 912 410 840 420 806 380",
  "60 40 200 30 260 48 180 62 96 66",
];

function polygonPath(coords: string, ox: number, oy: number, sx: number, sy: number) {
  const nums = coords.split(/\s+/).map(Number);
  const parts: string[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = ox + nums[i] * sx;
    // eixo Y do PDF é invertido em relação ao SVG
    const y = oy + (500 - nums[i + 1]) * sy;
    parts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${i === 0 ? "m" : "l"}`);
  }
  parts.push("h");
  return parts.join(" ");
}

function drawMap(p: Page, x: number, y: number, w: number, regions: PdfRegion[]) {
  const h = (w * 500) / 1000;
  const sx = w / 1000;
  const sy = h / 500;

  p.fill({ r: 0.06, g: 0.1, b: 0.09 }).rect(x, y, w, h);

  p.stroke({ r: 1, g: 1, b: 1 }).alpha("GS20");
  for (let i = 1; i < 10; i += 1) p.line(x + (i * w) / 10, y, x + (i * w) / 10, y + h, 0.4);
  for (let i = 1; i < 6; i += 1) p.line(x, y + (i * h) / 6, x + w, y + (i * h) / 6, 0.4);
  p.alpha("GS100");

  p.fill({ r: 0.14, g: 0.23, b: 0.2 });
  CONTINENTS.forEach((c) => p.path(polygonPath(c, x, y, sx, sy), "f"));

  const max = Math.max(1, ...regions.map((r) => r.percentage));
  const placed: Array<{ x: number; y: number }> = [];
  regions
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .forEach((r, idx) => {
      const px = x + ((Number(r.longitude) + 180) / 360) * w;
      const py = y + h - ((90 - Number(r.latitude)) / 180) * h;
      const weight = r.percentage / max;
      const base = 3.5 + weight * 7;
      const c = hexToRgb(r.color);
      p.fill(c).alpha("GS22").circle(px, py, base * 3.4, "f");
      p.alpha("GS42").circle(px, py, base * 2, "f");
      p.alpha("GS100").circle(px, py, base, "f");
      // numero dentro do ponto
      p.fill({ r: 0.06, g: 0.1, b: 0.09 }).textCenter(px, py - 2.4, String(idx + 1), 6.5, "F2");

      // rotulo com desvio vertical para evitar sobreposicao
      let lx = px + base + 5;
      let ly = py - 2.5;
      let guard = 0;
      while (placed.some((q) => Math.abs(q.x - lx) < 140 && Math.abs(q.y - ly) < 11) && guard < 10) {
        ly -= 12;
        guard += 1;
      }
      if (lx > x + w - 130) lx = px - base - 128;
      placed.push({ x: lx, y: ly });
      p.fill({ r: 0.05, g: 0.09, b: 0.08 }).alpha("GS55").rect(lx - 3, ly - 3, 124, 11);
      p.alpha("GS100").fill(CREAM).text(lx, ly, fitText(`${idx + 1}. ${r.label} - ${r.percentage.toFixed(1)}%`, 6.6, 116), 6.6);
    });
}

function drawDonut(p: Page, cx: number, cy: number, rOut: number, rIn: number, regions: PdfRegion[]) {
  const total = Math.max(1, regions.reduce((a, r) => a + r.percentage, 0));
  let acc = 90;
  regions.forEach((r) => {
    const sweep = (r.percentage / total) * 360;
    p.fill(hexToRgb(r.color)).wedge(cx, cy, rOut, rIn, acc, acc + sweep);
    acc += sweep;
  });
  p.fill(CREAM).circle(cx, cy, rIn - 1, "f");
  p.fill(INK).textCenter(cx, cy + 4, `${regions.length}`, 22, "F2");
  p.fill(MUTED).textCenter(cx, cy - 12, "origens", 8);
}

function drawHelix(p: Page, cx: number, y0: number, height: number) {
  const steps = 26;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = y0 + t * height;
    const phase = t * Math.PI * 4;
    const x1 = cx + Math.sin(phase) * 26;
    const x2 = cx + Math.sin(phase + Math.PI) * 26;
    p.stroke(GOLD).alpha("GS35").line(x1, y, x2, y, 0.6);
    p.alpha("GS100").fill(GOLD).circle(x1, y, 2.4, "f");
    p.fill({ r: 0.48, g: 0.61, b: 0.82 }).circle(x2, y, 2.4, "f");
  }
}

function header(p: Page, title: string, subtitle: string) {
  p.fill(OLIVE).rect(0, H - 74, W, 74);
  p.fill(CREAM).text(48, H - 40, title, 15, "F2");
  p.fill({ r: 0.86, g: 0.88, b: 0.82 }).text(48, H - 57, subtitle, 8.5);
}

function footer(p: Page, page: number, total: number) {
  p.stroke({ r: 0.8, g: 0.8, b: 0.76 }).line(48, 52, W - 48, 52, 0.5);
  p.fill(MUTED).text(48, 38, "Care Kranich · Minhas Origens · Atlas Ancestral", 7.5);
  p.fill(MUTED).text(W - 96, 38, `Pagina ${page} de ${total}`, 7.5);
}

export function buildAncestryPdf(data: AncestryPdfData): Blob {
  const pages: Page[] = [];
  const M = 48;
  const CW = W - M * 2;

  // ---------- CAPA ----------
  const cover = new Page();
  cover.fill(INK).rect(0, 0, W, H);
  // brilho superior
  for (let i = 0; i < 26; i += 1) {
    cover.fill(OLIVE).alpha(`GS${Math.max(5, 22 - i)}`).circle(W / 2, H - 130, 40 + i * 11, "f");
  }
  cover.alpha("GS100");
  // partículas
  const seeds = [37, 91, 143, 211, 277, 331, 389, 433, 487, 541, 601, 659, 719, 787, 823, 887, 941, 997];
  seeds.forEach((s, i) => {
    const px = ((s * 37) % 520) + 40;
    const py = ((s * 61) % 560) + 150;
    cover.fill(GOLD).alpha(`GS${20 + (i % 4) * 10}`).circle(px, py, 1 + (i % 3) * 0.7, "f");
  });
  cover.alpha("GS100");

  drawHelix(cover, W / 2, 330, 230);

  cover.fill(GOLD).text(M, H - 120, "CARE KRANICH", 10, "F2");
  cover.fill(CREAM).text(M, H - 160, "Minhas Origens", 40, "F2");
  cover.fill({ r: 0.78, g: 0.82, b: 0.75 }).text(M, H - 186, "Atlas Ancestral", 16);
  cover.stroke(GOLD).line(M, H - 204, M + 90, H - 204, 1.4);

  cover.fill(CREAM).text(M, 232, data.patientName, 18, "F2");
  cover.fill({ r: 0.72, g: 0.76, b: 0.7 }).text(
    M,
    212,
    `Versão ${data.version}${data.publishedAt ? ` · publicado em ${new Date(data.publishedAt).toLocaleDateString("pt-BR")}` : ""}`,
    9,
  );
  cover.fill({ r: 0.72, g: 0.76, b: 0.7 }).text(M, 196, `Emitido em ${new Date().toLocaleString("pt-BR")}`, 9);

  cover.fill({ r: 0.68, g: 0.72, b: 0.66 }).paragraph(
    M,
    150,
    "Seu DNA guarda caminhos percorridos por muitas gerações. Este atlas reúne as regiões com as quais seu material genético apresenta maior semelhança, o contexto histórico de cada uma e as rotas que ligaram esses territórios ao lugar onde sua história continua.",
    9,
    CW,
  );
  pages.push(cover);

  // ---------- PAGINA 2: MAPA + COMPOSICAO ----------
  const p2 = new Page();
  p2.fill(CREAM).rect(0, 0, W, H);
  header(p2, "Composição ancestral", "Mapa das origens e distribuição percentual");

  drawMap(p2, M, H - 400, CW, data.regions);

  p2.fill(INK).text(M, H - 428, "Distribuição por origem", 12, "F2");

  drawDonut(p2, M + 88, H - 528, 72, 43, data.regions);

  const listX = M + 200;
  const barW = W - M - listX - 46;
  let ly = H - 470;
  data.regions.forEach((r, idx) => {
    const c = hexToRgb(r.color);
    p2.fill(c).circle(listX + 5, ly + 2, 6, "f");
    p2.fill(CREAM).textCenter(listX + 5, ly - 0.5, String(idx + 1), 6.5, "F2");
    p2.fill(INK).text(listX + 18, ly, fitText(r.label, 9.5, barW + 4), 9.5, "F2");
    p2.fill(MUTED).text(listX + 18, ly - 10, fitText(r.path, 6.2, barW + 56), 6.2);
    p2.fill(INK).text(W - M - 40, ly, `${r.percentage.toFixed(1)}%`, 10, "F2");
    p2.fill({ r: 0.88, g: 0.86, b: 0.81 }).rect(listX + 18, ly - 20, barW, 4);
    p2.fill(c).rect(listX + 18, ly - 20, (barW * r.percentage) / 100, 4);
    ly -= 36;
  });

  let fy = H - 650;
  p2.fill(INK).text(M, fy, "Faixas estimadas e confiança", 11, "F2");
  fy -= 16;
  const rangeColW = (CW - 18) / 2;
  data.regions.forEach((r, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = M + col * (rangeColW + 18);
    const y = fy - row * 12;
    p2.fill(MUTED).text(
      x,
      y,
      fitText(`${r.label} - faixa ${r.rangeMin ?? "-"}-${r.rangeMax ?? "-"}% · ${r.confidence}`, 7.1, rangeColW),
      7.1,
    );
  });

  p2.fill({ r: 0.93, g: 0.9, b: 0.84 }).rect(M, 72, CW, 42);
  p2.fill(MUTED).paragraph(
    M + 14,
    100,
    "Os percentuais são estimativas obtidas pela comparação do seu DNA com grupos populacionais de referência. Semelhança genética com uma região não determina pertencimento cultural.",
    7.4,
    CW - 28,
  );
  footer(p2, 2, 0);
  pages.push(p2);

  // ---------- PÁGINAS DE ORIGENS (2 por página) ----------
  for (let i = 0; i < data.regions.length; i += 2) {
    const pg = new Page();
    pg.fill(CREAM).rect(0, 0, W, H);
    header(pg, "Detalhamento das origens", `Origens ${i + 1}${data.regions[i + 1] ? ` e ${i + 2}` : ""} de ${data.regions.length}`);

    [data.regions[i], data.regions[i + 1]].forEach((r, k) => {
      if (!r) return;
      const top = H - 110 - k * 350;
      const c = hexToRgb(r.color);

      pg.fill(c).alpha("GS15").rect(M, top - 300, CW, 296);
      pg.alpha("GS100");
      pg.fill(c).rect(M, top - 300, 5, 296);

      pg.fill(c).circle(M + 34, top - 30, 16, "f");
      pg.fill(CREAM).textCenter(M + 34, top - 34, `${Math.round(r.percentage)}`, 12, "F2");

      pg.fill(INK).text(M + 60, top - 26, r.label, 15, "F2");
      pg.fill(MUTED).text(M + 60, top - 40, r.path, 7.5);

      let y = top - 66;
      pg.fill(INK).text(M + 16, y, `${r.percentage.toFixed(1)}%  ·  faixa ${r.rangeMin ?? "-"}–${r.rangeMax ?? "-"}%  ·  ${r.confidence}`, 9, "F2");
      y -= 18;
      if (r.populationGroup) {
        pg.fill(MUTED).text(M + 16, y, `Grupo populacional: ${r.populationGroup}`, 8);
        y -= 16;
      }
      if (r.summary) {
        pg.fill(INK);
        y = pg.paragraph(M + 16, y, r.summary, 9, CW - 32) - 8;
      }
      if (r.fullText) {
        pg.fill(MUTED);
        y = pg.paragraph(M + 16, y, r.fullText, 8.5, CW - 32) - 8;
      }
      if (r.historicalText) {
        pg.fill(OLIVE).text(M + 16, y, "HISTÓRIA E MIGRAÇÕES", 7.5, "F2");
        y -= 12;
        pg.fill(MUTED);
        y = pg.paragraph(M + 16, y, r.historicalText, 8.5, CW - 32) - 8;
      }
      if (r.limitations) {
        pg.fill({ r: 0.71, g: 0.33, b: 0.25 });
        pg.paragraph(M + 16, y, `Limitações: ${r.limitations}`, 7.5, CW - 32);
      }
    });

    footer(pg, pages.length + 1, 0);
    pages.push(pg);
  }

  // ---------- ROTAS + LINHA DO TEMPO ----------
  if (data.routes.length || data.timeline.length) {
    const pg = new Page();
    pg.fill(CREAM).rect(0, 0, W, H);
    header(pg, "Rotas e linha do tempo", "Movimentos populacionais históricos de referência");

    let y = H - 120;
    if (data.routes.length) {
      pg.fill(INK).text(M, y, "Rotas migratórias", 13, "F2");
      y -= 22;
      data.routes.forEach((r) => {
        pg.fill(GOLD).circle(M + 5, y + 3, 3.5, "f");
        pg.fill(INK).text(M + 18, y, `${r.label}${r.period ? ` (${r.period})` : ""}`, 9.5, "F2");
        y -= 13;
        if (r.description) {
          pg.fill(MUTED);
          y = pg.paragraph(M + 18, y, r.description, 8.5, CW - 24) - 10;
        } else {
          y -= 6;
        }
      });
      pg.fill(MUTED).paragraph(
        M,
        y,
        "As rotas representam movimentos populacionais históricos conhecidos e não a reconstrução exata da genealogia individual.",
        7.5,
        CW,
      );
      y -= 34;
    }

    if (data.timeline.length) {
      pg.fill(INK).text(M, y, "Linha do tempo", 13, "F2");
      y -= 24;
      const lineTop = y + 8;
      data.timeline.forEach((t) => {
        pg.fill(OLIVE).circle(M + 6, y + 3, 4, "f");
        pg.fill(OLIVE).text(M + 20, y, t.period, 8, "F2");
        pg.fill(INK).text(M + 96, y, t.title, 9.5, "F2");
        y -= 13;
        if (t.description) {
          pg.fill(MUTED);
          y = pg.paragraph(M + 96, y, t.description, 8, CW - 100) - 8;
        } else {
          y -= 6;
        }
      });
      pg.stroke(OLIVE).alpha("GS35").line(M + 6, lineTop, M + 6, y + 10, 1.2);
      pg.alpha("GS100");
    }

    footer(pg, pages.length + 1, 0);
    pages.push(pg);
  }

  // ---------- METODOLOGIA E PRIVACIDADE ----------
  const last = new Page();
  last.fill(CREAM).rect(0, 0, W, H);
  header(last, "Metodologia, limitações e privacidade", "Como este resultado foi construído");

  let y = H - 120;
  const meta: Array<[string, string]> = [
    ["Laboratório responsável", data.labName ?? "não informado"],
    ["Versão do algoritmo", data.algorithm ?? "não informada"],
    ["População de referência", data.referencePopulation ?? "não informada"],
    ["Data de processamento", data.processedAt ? new Date(`${data.processedAt}T00:00:00`).toLocaleDateString("pt-BR") : "não informada"],
    ["Responsável técnico", data.technicalLead ?? "não informado"],
    ["Versão do relatório", String(data.version)],
  ];
  meta.forEach(([k, v], i) => {
    const boxY = y - 34 - Math.floor(i / 2) * 46;
    const boxX = M + (i % 2) * (CW / 2 + 6);
    last.fill({ r: 0.93, g: 0.91, b: 0.86 }).rect(boxX, boxY, CW / 2 - 6, 38);
    last.fill(MUTED).text(boxX + 12, boxY + 24, k.toUpperCase(), 6.5, "F2");
    last.fill(INK).text(boxX + 12, boxY + 11, v, 9);
  });
  y -= 34 + Math.ceil(meta.length / 2) * 46 + 16;

  last.fill(INK).text(M, y, "Limitações", 13, "F2");
  y -= 20;
  [
    "Semelhança genética com uma região não determina pertencimento cultural, nacionalidade ou identidade.",
    "Predisposição genética não significa diagnóstico.",
    "Resultados podem mudar quando novos painéis de referência forem incorporados; nesse caso uma nova versão será gerada e você poderá comparar com a versão anterior.",
    "Este relatório tem caráter educativo e não substitui avaliação médica ou aconselhamento genético.",
  ].forEach((t) => {
    last.fill(GOLD).circle(M + 4, y + 3, 2.2, "f");
    last.fill(MUTED);
    y = last.paragraph(M + 14, y, t, 8.5, CW - 20) - 8;
  });

  y -= 12;
  last.fill(INK).text(M, y, "Privacidade", 13, "F2");
  y -= 20;
  last.fill(MUTED);
  y = last.paragraph(
    M,
    y,
    "Dados genéticos são sensíveis. O acesso a este resultado depende de autorização expressa do titular, pode ser compartilhado por link temporário com expiração e revogado a qualquer momento. Todo acesso é registrado em trilha de auditoria.",
    8.5,
    CW,
  );

  y -= 24;
  last.fill(INK).text(M, y, "Glossário", 13, "F2");
  y -= 20;
  [
    ["Região genética", "agrupamento de populações com perfis genéticos semelhantes, nem sempre coincidente com fronteiras políticas atuais."],
    ["Faixa estimada", "intervalo dentro do qual o percentual real provavelmente se encontra."],
    ["Nível de confiança", "grau de certeza estatística da atribuição daquela origem."],
  ].forEach(([k, v]) => {
    last.fill(OLIVE).text(M, y, k, 8.5, "F2");
    last.fill(MUTED);
    y = last.paragraph(M + 92, y, v, 8, CW - 96) - 8;
  });

  footer(last, pages.length + 1, 0);
  pages.push(last);

  // ---------- MONTAGEM DO ARQUIVO ----------
  const total = pages.length;
  const streams = pages.map((p, i) => {
    // corrige o total no rodapé (páginas 2+)
    let s = p.build();
    s = s.replace(/Pagina (\d+) de 0/g, (_m, n) => `Pagina ${n} de ${total}`);
    if (i === 0) return s;
    return s;
  });

  const objects: string[] = [];
  const pageObjIds: number[] = [];
  // 1 catalog, 2 pages, 3 font F1, 4 font F2, 5 extgstate
  const firstPageObj = 6;
  pages.forEach((_, i) => pageObjIds.push(firstPageObj + i * 2));

  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
  objects.push(
    `2 0 obj << /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${total} >> endobj\n`,
  );
  objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj\n");
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj\n");
  const gsEntries = Array.from({ length: 100 }, (_, i) => i + 1)
    .map((a) => `/GS${a} << /ca ${(a / 100).toFixed(2)} /CA ${(a / 100).toFixed(2)} >>`)
    .join(" ");
  objects.push(`5 0 obj << ${gsEntries} >> endobj\n`);

  streams.forEach((stream, i) => {
    const pageId = firstPageObj + i * 2;
    const contentId = pageId + 1;
    objects.push(
      `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> /ExtGState 5 0 R >> /Contents ${contentId} 0 R >> endobj\n`,
    );
    objects.push(`${contentId} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`);
  });

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o) => {
    offsets.push(body.length);
    body += o;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i += 1) bytes[i] = body.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}

export function downloadAncestryPdf(filename: string, data: AncestryPdfData) {
  const blob = buildAncestryPdf(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
