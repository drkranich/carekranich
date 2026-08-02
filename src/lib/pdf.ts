import careLogoUrl from "@/assets/care-kranich-logo.png";

type PdfLogo = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 54;
const TOP_Y = 680;
const BOTTOM_Y = 86;

function escapePdfText(value: string) {
  const latin = Array.from(value)
    .map((ch) => (ch.charCodeAt(0) <= 255 ? ch : "-"))
    .join("");
  return latin.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function text(value: string, x: number, y: number, size = 10, color = "0.20 0.33 0.40") {
  return [
    "BT",
    `${color} rg`,
    "/F1 " + size + " Tf",
    `${x} ${y} Td`,
    `(${escapePdfText(value)}) Tj`,
    "ET",
  ].join("\n");
}

function wrapLine(value: string, maxChars: number) {
  if (!value.trim()) return [""];
  const words = value.split(/\s+/);
  const rows: string[] = [];
  let row = "";
  for (const word of words) {
    if ((row + " " + word).trim().length > maxChars && row) {
      rows.push(row);
      row = word;
    } else {
      row = (row + " " + word).trim();
    }
  }
  if (row) rows.push(row);
  return rows;
}

function bytesFromString(value: string) {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i) & 0xff;
  return out;
}

function concatBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function loadLogo(): Promise<PdfLogo | null> {
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = careLogoUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    const maxWidth = 420;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f8f3ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    return { bytes: base64ToBytes(base64), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

function pageChrome(page: number, count: number, title: string, logo: PdfLogo | null) {
  const parts = [
    "0.973 0.949 0.910 rg 0 0 612 792 re f",
    "0.847 0.925 0.868 rg 388 0 224 792 re f",
    "0.871 0.933 0.945 rg 0 704 612 88 re f",
    "0.604 0.725 0.540 rg 0 704 612 3 re f",
    "0.839 0.278 0.235 rg 54 704 72 3 re f",
    logo ? "q 56 0 0 56 54 714 cm /Logo Do Q" : "",
    text("CARE KRANICH", logo ? 122 : 54, 742, 16, "0.20 0.33 0.40"),
    text("Care intelligence report", logo ? 122 : 54, 724, 9, "0.38 0.48 0.42"),
    text(title, 54, 686, 18, "0.02 0.09 0.08"),
    "0.82 0.75 0.65 RG 54 64 504 0.8 re S",
    text("Care Kranich - branded report", 54, 42, 8, "0.38 0.48 0.42"),
    text(`Page ${page} of ${count}`, 504, 42, 8, "0.38 0.48 0.42"),
  ];
  return parts.filter(Boolean).join("\n");
}

function buildContentPages(title: string, lines: string[], logo: PdfLogo | null) {
  const pages: string[][] = [[]];
  let page = 0;
  let y = TOP_Y - 38;

  const nextPage = () => {
    page += 1;
    pages[page] = [];
    y = TOP_Y - 38;
  };

  const addText = (line: string, size = 10, color = "0.20 0.33 0.40", indent = 0) => {
    if (y < BOTTOM_Y) nextPage();
    pages[page].push(text(line, MARGIN_X + indent, y, size, color));
    y -= size + 6;
  };

  for (const rawLine of lines) {
    const line = String(rawLine ?? "");
    if (!line.trim()) {
      y -= 10;
      continue;
    }
    const isSection = !line.startsWith("- ") && line.length <= 44 && /:$/.test(line);
    if (isSection) {
      y -= 6;
      addText(line.replace(/:$/, ""), 12, "0.11 0.31 0.22");
      pages[page].push("0.604 0.725 0.540 RG 54 " + (y + 9) + " 120 0.8 re S");
      continue;
    }
    const rows = wrapLine(line, line.startsWith("- ") ? 82 : 92);
    rows.forEach((row, index) => addText(row, 10, "0.20 0.33 0.40", line.startsWith("- ") && index > 0 ? 10 : 0));
  }

  const count = pages.length;
  return pages.map((body, index) => [pageChrome(index + 1, count, title, logo), ...body].join("\n"));
}

export async function createSimplePdf(title: string, lines: string[]) {
  const logo = await loadLogo();
  const pageStreams = buildContentPages(title, lines, logo);
  const objects: Uint8Array[] = [];
  const imageObjectId = logo ? 4 : null;
  const firstPageObjectId = logo ? 5 : 4;
  const pageIds = pageStreams.map((_, index) => firstPageObjectId + index * 2);
  const contentIds = pageStreams.map((_, index) => firstPageObjectId + index * 2 + 1);
  const xObject = logo ? " /XObject << /Logo 4 0 R >>" : "";

  objects.push(bytesFromString("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"));
  objects.push(bytesFromString(`2 0 obj << /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >> endobj\n`));
  objects.push(bytesFromString("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj\n"));
  if (logo && imageObjectId) {
    objects.push(concatBytes([
      bytesFromString(`${imageObjectId} 0 obj << /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >> stream\n`),
      logo.bytes,
      bytesFromString("\nendstream endobj\n"),
    ]));
  }

  pageStreams.forEach((stream, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];
    objects.push(bytesFromString(`${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R >>${xObject} >> /Contents ${contentId} 0 R >> endobj\n`));
    objects.push(bytesFromString(`${contentId} 0 obj << /Length ${bytesFromString(stream).length} >> stream\n${stream}\nendstream endobj\n`));
  });

  const chunks: Uint8Array[] = [bytesFromString("%PDF-1.4\n")];
  const offsets = [0];
  let position = chunks[0].length;
  for (const object of objects) {
    offsets.push(position);
    chunks.push(object);
    position += object.length;
  }
  const xref = position;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  trailer += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  trailer += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  chunks.push(bytesFromString(trailer));
  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
}

export async function downloadPdf(filename: string, title: string, lines: string[]) {
  const blob = await createSimplePdf(title, lines);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
