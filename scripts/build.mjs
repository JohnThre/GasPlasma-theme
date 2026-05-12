#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const palette = JSON.parse(readFileSync(path.join(root, "src/palette.json"), "utf8"));

const dirs = ["themes", "assets", "docs", "docs/assets", "dist"];
for (const dir of dirs) {
  mkdirSync(path.join(root, dir), { recursive: true });
}

function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Invalid hex color: ${hex}`);
  const value = match[1];
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function hexWithAlpha(hex, alpha) {
  const channel = Math.round(alpha * 255).toString(16).padStart(2, "0").toUpperCase();
  return `${hex}${channel}`;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plistColor(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return [
    "<dict>",
    "  <key>Alpha Component</key>",
    `  <real>${alpha}</real>`,
    "  <key>Blue Component</key>",
    `  <real>${(b / 255).toFixed(10)}</real>`,
    "  <key>Color Space</key>",
    "  <string>sRGB</string>",
    "  <key>Green Component</key>",
    `  <real>${(g / 255).toFixed(10)}</real>`,
    "  <key>Red Component</key>",
    `  <real>${(r / 255).toFixed(10)}</real>`,
    "</dict>"
  ].join("\n");
}

function writeItermColors() {
  const normal = palette.ansi.normal;
  const bright = palette.ansi.bright;
  const entries = [
    ["Ansi 0 Color", normal.black],
    ["Ansi 1 Color", normal.red],
    ["Ansi 2 Color", normal.green],
    ["Ansi 3 Color", normal.yellow],
    ["Ansi 4 Color", normal.blue],
    ["Ansi 5 Color", normal.magenta],
    ["Ansi 6 Color", normal.cyan],
    ["Ansi 7 Color", normal.white],
    ["Ansi 8 Color", bright.black],
    ["Ansi 9 Color", bright.red],
    ["Ansi 10 Color", bright.green],
    ["Ansi 11 Color", bright.yellow],
    ["Ansi 12 Color", bright.blue],
    ["Ansi 13 Color", bright.magenta],
    ["Ansi 14 Color", bright.cyan],
    ["Ansi 15 Color", bright.white],
    ["Background Color", palette.core.background],
    ["Bold Color", palette.core.bold],
    ["Cursor Color", palette.core.cursor],
    ["Cursor Text Color", palette.core.cursorText],
    ["Foreground Color", palette.core.foreground],
    ["Selected Text Color", palette.core.bold],
    ["Selection Color", palette.core.selection, palette.core.selectionAlpha]
  ];

  const body = entries
    .map(([key, hex, alpha]) => `  <key>${xmlEscape(key)}</key>\n${plistColor(hex, alpha ?? 1).split("\n").map((line) => `  ${line}`).join("\n")}`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${body}
</dict>
</plist>
`;

  writeFileSync(path.join(root, "GasPlasma.itermcolors"), xml);
}

function writeVsCodeTheme() {
  const normal = palette.ansi.normal;
  const bright = palette.ansi.bright;
  const theme = {
    $schema: "vscode://schemas/color-theme",
    name: palette.name,
    type: "dark",
    semanticHighlighting: true,
    colors: {
      "activityBar.background": "#261000",
      "activityBar.foreground": palette.core.bold,
      "activityBarBadge.background": normal.red,
      "activityBarBadge.foreground": bright.white,
      "badge.background": normal.red,
      "badge.foreground": bright.white,
      "button.background": normal.red,
      "button.foreground": bright.white,
      "button.hoverBackground": bright.red,
      "dropdown.background": "#261000",
      "dropdown.border": bright.black,
      "editor.background": palette.core.background,
      "editor.foreground": palette.core.foreground,
      "editor.lineHighlightBackground": "#3A1800",
      "editor.selectionBackground": hexWithAlpha(palette.core.selection, palette.core.selectionAlpha),
      "editorCursor.foreground": palette.core.cursor,
      "editorIndentGuide.background1": "#4D2600",
      "editorIndentGuide.activeBackground1": "#CC7A00",
      "editorLineNumber.foreground": "#8F4A00",
      "editorLineNumber.activeForeground": bright.yellow,
      "editorWhitespace.foreground": "#4D2600",
      "input.background": "#261000",
      "input.border": bright.black,
      "input.foreground": palette.core.bold,
      "list.activeSelectionBackground": "#4D2600",
      "list.activeSelectionForeground": bright.white,
      "list.hoverBackground": "#331500",
      "panel.background": "#140800",
      "panel.border": "#4D2600",
      "sideBar.background": "#140800",
      "sideBar.foreground": palette.core.foreground,
      "sideBarSectionHeader.background": "#261000",
      "statusBar.background": "#3A1800",
      "statusBar.foreground": bright.white,
      "tab.activeBackground": palette.core.background,
      "tab.activeForeground": bright.white,
      "tab.inactiveBackground": "#261000",
      "tab.inactiveForeground": normal.white,
      "terminal.ansiBlack": normal.black,
      "terminal.ansiRed": normal.red,
      "terminal.ansiGreen": normal.green,
      "terminal.ansiYellow": normal.yellow,
      "terminal.ansiBlue": normal.blue,
      "terminal.ansiMagenta": normal.magenta,
      "terminal.ansiCyan": normal.cyan,
      "terminal.ansiWhite": normal.white,
      "terminal.ansiBrightBlack": bright.black,
      "terminal.ansiBrightRed": bright.red,
      "terminal.ansiBrightGreen": bright.green,
      "terminal.ansiBrightYellow": bright.yellow,
      "terminal.ansiBrightBlue": bright.blue,
      "terminal.ansiBrightMagenta": bright.magenta,
      "terminal.ansiBrightCyan": bright.cyan,
      "terminal.ansiBrightWhite": bright.white,
      "titleBar.activeBackground": "#261000",
      "titleBar.activeForeground": bright.white
    },
    tokenColors: [
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: normal.cyan, fontStyle: "italic" } },
      { scope: ["string", "constant.other.symbol"], settings: { foreground: normal.green } },
      { scope: ["constant.numeric", "constant.language"], settings: { foreground: bright.yellow } },
      { scope: ["keyword", "storage.type", "storage.modifier"], settings: { foreground: normal.red, fontStyle: "bold" } },
      { scope: ["entity.name.function", "support.function"], settings: { foreground: bright.blue } },
      { scope: ["entity.name.type", "support.class", "support.type"], settings: { foreground: bright.cyan } },
      { scope: ["variable", "meta.definition.variable.name"], settings: { foreground: palette.core.bold } },
      { scope: ["entity.name.tag", "support.constant"], settings: { foreground: bright.red } },
      { scope: ["invalid", "invalid.illegal"], settings: { foreground: bright.white, background: "#8A1C00" } }
    ],
    semanticTokenColors: {
      class: bright.cyan,
      enum: bright.cyan,
      function: bright.blue,
      interface: bright.cyan,
      keyword: normal.red,
      method: bright.blue,
      namespace: normal.yellow,
      parameter: palette.core.bold,
      property: normal.white,
      string: normal.green,
      variable: palette.core.bold
    }
  };

  writeFileSync(path.join(root, "themes/gas-plasma-color-theme.json"), `${JSON.stringify(theme, null, 2)}\n`);
}

function writeLogoSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">Gas Plasma logo</title>
  <desc id="desc">A glowing orange plasma ring around the letters GP.</desc>
  <defs>
    <radialGradient id="core" cx="50%" cy="45%" r="55%">
      <stop offset="0" stop-color="#FFF0DB"/>
      <stop offset="0.28" stop-color="#FFD700"/>
      <stop offset="0.58" stop-color="#FF6B3D"/>
      <stop offset="1" stop-color="#1A0A00"/>
    </radialGradient>
    <linearGradient id="flare" x1="70" y1="430" x2="440" y2="90">
      <stop offset="0" stop-color="#FF4500"/>
      <stop offset="0.5" stop-color="#FFD700"/>
      <stop offset="1" stop-color="#FF9B7A"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="13" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 1 0 .45 0 0 .27 0 0 .1 0 0 0 0 0 .85 0"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="96" fill="#1A0A00"/>
  <circle cx="256" cy="256" r="184" fill="none" stroke="url(#core)" stroke-width="52" filter="url(#glow)"/>
  <path d="M93 375C167 244 259 151 419 98" fill="none" stroke="url(#flare)" stroke-width="18" stroke-linecap="round" opacity=".9"/>
  <circle cx="256" cy="256" r="130" fill="#1A0A00" opacity=".92"/>
  <text x="256" y="305" text-anchor="middle" font-family="SF Mono, Menlo, Consolas, monospace" font-size="136" font-weight="800" letter-spacing="-10" fill="#FFD2A6">GP</text>
</svg>
`;
  writeFileSync(path.join(root, "assets/logo.svg"), svg);
  writeFileSync(path.join(root, "docs/assets/logo.svg"), svg);
}

function writeMockupSvg() {
  const lines = [
    ["const plasma = createTheme({", "#FF6B3D", 80],
    ["  background: '#1A0A00',", "#FFD2A6", 70],
    ["  foreground: '#FF8C00',", "#FFB347", 72],
    ["  accent: ionize(tokens),", "#E8C547", 63],
    ["});", "#FF6B6B", 28]
  ];
  const svgLines = lines.map(([text, color], index) => {
    const y = 210 + index * 42;
    return `<text x="565" y="${y}" fill="${color}" font-family="SF Mono, Menlo, Consolas, monospace" font-size="26">${xmlEscape(text)}</text>`;
  }).join("\n  ");
  const terminalLines = Array.from({ length: 8 }, (_, index) => {
    const width = [320, 250, 290, 210, 360, 275, 330, 230][index];
    const color = [palette.ansi.bright.yellow, palette.ansi.normal.red, palette.ansi.normal.green, palette.ansi.bright.cyan][index % 4];
    return `<rect x="120" y="${205 + index * 34}" width="${width}" height="12" rx="6" fill="${color}" opacity=".9"/>`;
  }).join("\n  ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
  <title id="title">Gas Plasma theme mockup</title>
  <desc id="desc">A design mockup showing Gas Plasma in terminal and editor windows.</desc>
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="80%">
      <stop offset="0" stop-color="#4D2600"/>
      <stop offset="0.45" stop-color="#1A0A00"/>
      <stop offset="1" stop-color="#0D0500"/>
    </radialGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <circle cx="1320" cy="130" r="150" fill="#FF4500" opacity=".22" filter="url(#softGlow)"/>
  <circle cx="210" cy="870" r="180" fill="#FFD700" opacity=".14" filter="url(#softGlow)"/>
  <rect x="72" y="110" width="640" height="520" rx="18" fill="#1A0A00" stroke="#4D2600" stroke-width="2"/>
  <rect x="72" y="110" width="640" height="56" rx="18" fill="#261000"/>
  <circle cx="112" cy="139" r="10" fill="#FF4500"/>
  <circle cx="144" cy="139" r="10" fill="#FFB347"/>
  <circle cx="176" cy="139" r="10" fill="#8B9A00"/>
  <text x="220" y="148" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="20">Gas Plasma Terminal</text>
  ${terminalLines}
  <text x="118" y="535" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="24">$ swift generate-theme.swift</text>
  <rect x="505" y="510" width="14" height="30" fill="#FF8C00"/>
  <rect x="520" y="185" width="980" height="660" rx="18" fill="#140800" stroke="#4D2600" stroke-width="2"/>
  <rect x="520" y="185" width="980" height="58" rx="18" fill="#261000"/>
  <text x="560" y="222" fill="#FFF0DB" font-family="SF Mono, Menlo, Consolas, monospace" font-size="20">gas-plasma-color-theme.json</text>
  <rect x="520" y="245" width="190" height="600" fill="#100600"/>
  <text x="555" y="295" fill="#E8C547" font-family="SF Mono, Menlo, Consolas, monospace" font-size="21">themes</text>
  <text x="555" y="335" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="21">assets</text>
  <text x="555" y="375" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="21">README.md</text>
  ${svgLines}
  <rect x="565" y="465" width="760" height="2" fill="#4D2600"/>
  <rect x="565" y="510" width="640" height="22" rx="11" fill="#FF4500" opacity=".78"/>
  <rect x="565" y="555" width="720" height="22" rx="11" fill="#B5CC18" opacity=".78"/>
  <rect x="565" y="600" width="510" height="22" rx="11" fill="#E09530" opacity=".78"/>
  <rect x="565" y="645" width="690" height="22" rx="11" fill="#FF9B7A" opacity=".78"/>
  <rect x="565" y="715" width="840" height="78" rx="16" fill="#1A0A00" stroke="#CC7A00"/>
  <text x="600" y="765" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="24">Open VSX: johnthre.gas-plasma-theme</text>
</svg>
`;
  writeFileSync(path.join(root, "assets/mockup.svg"), svg);
  writeFileSync(path.join(root, "docs/assets/mockup.svg"), svg);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(file, width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      const target = row + 1 + x * 4;
      raw[target] = pixels[source];
      raw[target + 1] = pixels[source + 1];
      raw[target + 2] = pixels[source + 2];
      raw[target + 3] = pixels[source + 3];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
  writeFileSync(file, png);
}

function putPixel(pixels, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width) return;
  const index = (y * width + x) * 4;
  const alpha = (color.a ?? 255) / 255;
  const destAlpha = pixels[index + 3] / 255;
  const outAlpha = alpha + destAlpha * (1 - alpha);
  if (outAlpha <= 0) return;
  pixels[index] = Math.round((color.r * alpha + pixels[index] * destAlpha * (1 - alpha)) / outAlpha);
  pixels[index + 1] = Math.round((color.g * alpha + pixels[index + 1] * destAlpha * (1 - alpha)) / outAlpha);
  pixels[index + 2] = Math.round((color.b * alpha + pixels[index + 2] * destAlpha * (1 - alpha)) / outAlpha);
  pixels[index + 3] = Math.round(outAlpha * 255);
}

function fillRect(pixels, width, height, x, y, rectWidth, rectHeight, color) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(width, Math.round(x + rectWidth));
  const y1 = Math.min(height, Math.round(y + rectHeight));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      putPixel(pixels, width, xx, yy, color);
    }
  }
}

function color(hex, a = 255) {
  return { ...hexToRgb(hex), a };
}

function writeLogoPng() {
  const width = 512;
  const height = 512;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const bg = color("#1A0A00", 255);
  fillRect(pixels, width, height, 0, 0, width, height, bg);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - 256;
      const dy = y - 256;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 155 && distance < 220) {
        const t = (distance - 155) / 65;
        const angle = Math.atan2(dy, dx);
        const glow = 0.5 + 0.5 * Math.sin(angle * 3 + distance * 0.045);
        const r = Math.round(255);
        const g = Math.round(70 + 150 * (1 - t) + 40 * glow);
        const b = Math.round(10 + 50 * glow);
        putPixel(pixels, width, x, y, { r, g, b, a: Math.round(210 * (1 - Math.abs(t - 0.5))) });
      }
      if (distance < 132) {
        putPixel(pixels, width, x, y, color("#1A0A00", 235));
      }
    }
  }

  fillRect(pixels, width, height, 132, 180, 42, 160, color("#FFD2A6"));
  fillRect(pixels, width, height, 132, 180, 120, 38, color("#FFD2A6"));
  fillRect(pixels, width, height, 132, 302, 120, 38, color("#FFD2A6"));
  fillRect(pixels, width, height, 210, 258, 42, 82, color("#FFD2A6"));
  fillRect(pixels, width, height, 190, 258, 62, 34, color("#FFD2A6"));
  fillRect(pixels, width, height, 286, 180, 42, 160, color("#FFF0DB"));
  fillRect(pixels, width, height, 286, 180, 112, 38, color("#FFF0DB"));
  fillRect(pixels, width, height, 356, 218, 42, 62, color("#FFF0DB"));
  fillRect(pixels, width, height, 286, 272, 112, 36, color("#FFF0DB"));

  writePng(path.join(root, "assets/logo.png"), width, height, pixels);
  copyFileSync(path.join(root, "assets/logo.png"), path.join(root, "docs/assets/logo.png"));
}

function writeMockupPng() {
  const width = 1600;
  const height = 1000;
  const pixels = new Uint8ClampedArray(width * height * 4);
  fillRect(pixels, width, height, 0, 0, width, height, color("#0D0500"));
  fillRect(pixels, width, height, 70, 110, 650, 520, color("#1A0A00"));
  fillRect(pixels, width, height, 70, 110, 650, 56, color("#261000"));
  fillRect(pixels, width, height, 520, 185, 980, 660, color("#140800"));
  fillRect(pixels, width, height, 520, 185, 980, 58, color("#261000"));
  fillRect(pixels, width, height, 520, 245, 190, 600, color("#100600"));

  const terminalColors = ["#FFD700", "#FF4500", "#8B9A00", "#E8C547", "#FF6B3D", "#FF9B7A"];
  for (let i = 0; i < 11; i += 1) {
    fillRect(pixels, width, height, 120, 205 + i * 34, 190 + ((i * 47) % 185), 13, color(terminalColors[i % terminalColors.length], 225));
  }
  for (let i = 0; i < 14; i += 1) {
    fillRect(pixels, width, height, 565, 290 + i * 34, 480 + ((i * 73) % 310), 16, color(terminalColors[(i + 2) % terminalColors.length], 220));
  }
  for (let i = 0; i < 6; i += 1) {
    fillRect(pixels, width, height, 555, 295 + i * 40, 95 + ((i * 29) % 80), 14, color(["#E8C547", "#FF8C00", "#FFD2A6"][i % 3], 210));
  }
  fillRect(pixels, width, height, 565, 715, 840, 78, color("#1A0A00"));
  fillRect(pixels, width, height, 600, 750, 600, 20, color("#FF8C00", 235));
  copyFileSync(path.join(root, "assets/logo.png"), path.join(root, "docs/assets/logo.png"));
  writePng(path.join(root, "assets/mockup.png"), width, height, pixels);
  copyFileSync(path.join(root, "assets/mockup.png"), path.join(root, "docs/assets/mockup.png"));
  copyFileSync(path.join(root, "assets/mockup.png"), path.join(root, "screenshot.png"));
}

function writeDocsIndex() {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gas Plasma Theme</title>
  <meta name="description" content="${xmlEscape(palette.description)}">
  <style>
    :root {
      color-scheme: dark;
      --bg: ${palette.core.background};
      --fg: ${palette.core.foreground};
      --bold: ${palette.core.bold};
      --red: ${palette.ansi.normal.red};
      --yellow: ${palette.ansi.bright.yellow};
      --panel: #261000;
      --line: #4D2600;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at 70% 10%, rgba(255,69,0,.22), transparent 28%), var(--bg);
      color: var(--fg);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 48px 0 64px;
    }
    header {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 28px;
      align-items: center;
      margin-bottom: 32px;
    }
    .logo { width: 120px; height: 120px; }
    h1 { margin: 0 0 10px; color: var(--bold); font-size: clamp(38px, 8vw, 82px); line-height: .95; }
    p { max-width: 760px; line-height: 1.7; }
    .mockup {
      display: block;
      width: 100%;
      border: 1px solid var(--line);
      background: #0d0500;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-top: 28px;
    }
    .tile {
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--panel), transparent 10%);
      padding: 18px;
    }
    h2 { margin: 0 0 12px; color: var(--yellow); font-size: 20px; }
    code { color: var(--bold); }
    a { color: var(--yellow); }
    @media (max-width: 640px) {
      header { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <img class="logo" src="assets/logo.svg" alt="Gas Plasma logo">
      <div>
        <h1>Gas Plasma</h1>
        <p>${xmlEscape(palette.description)} Built for Apple Terminal, iTerm2, VS Code, and Open VSX-compatible editors.</p>
      </div>
    </header>
    <img class="mockup" src="assets/mockup.svg" alt="Gas Plasma terminal and editor mockup">
    <section class="grid" aria-label="Installation options">
      <article class="tile">
        <h2>Apple Terminal</h2>
        <p>Download <code>GasPlasma.terminal</code> from the latest GitHub release and open it in Terminal.</p>
      </article>
      <article class="tile">
        <h2>iTerm2</h2>
        <p>Import <code>GasPlasma.itermcolors</code> from iTerm2 Profiles color presets.</p>
      </article>
      <article class="tile">
        <h2>VS Code</h2>
        <p>Install the VSIX from GitHub Releases or search Open VSX for <code>johnthre.gas-plasma-theme</code>.</p>
      </article>
      <article class="tile">
        <h2>Source</h2>
        <p><a href="https://github.com/JohnThre/GasPlasma-theme">View the repository on GitHub</a>.</p>
      </article>
    </section>
  </main>
</body>
</html>
`;
  writeFileSync(path.join(root, "docs/index.html"), html);
}

writeItermColors();
writeVsCodeTheme();
writeLogoSvg();
writeMockupSvg();
writeLogoPng();
writeMockupPng();
writeDocsIndex();

const built = [
  "GasPlasma.itermcolors",
  "themes/gas-plasma-color-theme.json",
  "assets/logo.svg",
  "assets/logo.png",
  "assets/mockup.svg",
  "assets/mockup.png",
  "screenshot.png",
  "docs/index.html"
];

for (const file of built) {
  const data = readFileSync(path.join(root, file));
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
  console.log(`generated ${file} ${hash}`);
}
