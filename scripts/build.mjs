#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

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
  <desc id="desc">A glowing plasma aperture around the letters GP.</desc>
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#261000"/>
      <stop offset=".58" stop-color="#1A0A00"/>
      <stop offset="1" stop-color="#080200"/>
    </linearGradient>
    <linearGradient id="ring" x1="76" y1="404" x2="434" y2="96">
      <stop offset="0" stop-color="#FF4500"/>
      <stop offset=".34" stop-color="#FFD700"/>
      <stop offset=".7" stop-color="#FF8C00"/>
      <stop offset="1" stop-color="#FF6B6B"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="smallGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#panel)"/>
  <path d="M116 361C83 295 94 218 144 164c62-68 166-79 242-25 78 56 97 163 45 240" fill="none" stroke="#4D2600" stroke-width="58" stroke-linecap="round"/>
  <path d="M116 361C83 295 94 218 144 164c62-68 166-79 242-25 78 56 97 163 45 240" fill="none" stroke="url(#ring)" stroke-width="36" stroke-linecap="round" filter="url(#glow)"/>
  <path d="M142 364c37 38 87 58 138 55 50-3 96-29 128-69" fill="none" stroke="#E8C547" stroke-width="14" stroke-linecap="round" opacity=".85" filter="url(#smallGlow)"/>
  <circle cx="252" cy="257" r="116" fill="#120600" stroke="#3A1800" stroke-width="2"/>
  <text x="256" y="303" text-anchor="middle" font-family="SF Mono, Menlo, Consolas, monospace" font-size="132" font-weight="900" letter-spacing="-8" fill="#FFD2A6">GP</text>
  <path d="M360 134l18 34 38 6-28 27 7 38-35-18-34 18 6-38-27-27 38-6z" fill="#FFD700" opacity=".95"/>
</svg>
`;
  writeFileSync(path.join(root, "assets/logo.svg"), svg);
  writeFileSync(path.join(root, "docs/assets/logo.svg"), svg);
}

function writeMockupSvg() {
  const codeLine = (line, y, parts) => {
    const content = parts.map(([text, color]) => `<tspan fill="${color}">${xmlEscape(text)}</tspan>`).join("");
    return `<text x="770" y="${y}" font-family="SF Mono, Menlo, Consolas, monospace" font-size="25"><tspan fill="#8F4A00">${String(line).padStart(2, " ")}</tspan><tspan dx="34">${content}</tspan></text>`;
  };
  const editorLines = [
    codeLine(1, 220, [["const ", "#FF6B3D"], ["theme", "#FFD2A6"], [" = ", "#FFF0DB"], ["{", "#FFF0DB"]]),
    codeLine(2, 258, [["  name", "#E8C547"], [": ", "#FFF0DB"], ["'Gas Plasma'", "#B5CC18"], [",", "#FFF0DB"]]),
    codeLine(3, 296, [["  background", "#E8C547"], [": ", "#FFF0DB"], ["'#1A0A00'", "#B5CC18"], [",", "#FFF0DB"]]),
    codeLine(4, 334, [["  foreground", "#E8C547"], [": ", "#FFF0DB"], ["'#FF8C00'", "#B5CC18"], [",", "#FFF0DB"]]),
    codeLine(5, 372, [["  accents", "#E8C547"], [": [", "#FFF0DB"], ["'plasma'", "#B5CC18"], [", ", "#FFF0DB"], ["'ember'", "#B5CC18"], ["]", "#FFF0DB"]]),
    codeLine(6, 410, [["};", "#FFF0DB"]]),
    codeLine(7, 486, [["export ", "#FF6B3D"], ["default ", "#FF6B3D"], ["theme", "#FFD2A6"], [";", "#FFF0DB"]])
  ].join("\n  ");
  const swatches = [
    ["#1A0A00", "bg"],
    ["#FF8C00", "fg"],
    ["#FF4500", "red"],
    ["#8B9A00", "green"],
    ["#FFD700", "yellow"],
    ["#E8C547", "cyan"],
    ["#FFF0DB", "white"]
  ].map(([hex, label], index) => {
    const x = 110 + index * 78;
    return `<g transform="translate(${x}, 755)">
    <rect width="52" height="52" rx="8" fill="${hex}" stroke="#4D2600"/>
    <text x="26" y="78" text-anchor="middle" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="14">${label}</text>
  </g>`;
  }).join("\n  ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1080" viewBox="0 0 1800 1080" role="img" aria-labelledby="title desc">
  <title id="title">Gas Plasma theme mockup</title>
  <desc id="desc">A polished design mockup showing Gas Plasma in Terminal, iTerm2, and VS Code.</desc>
  <defs>
    <linearGradient id="stage" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B0300"/>
      <stop offset=".48" stop-color="#1A0A00"/>
      <stop offset="1" stop-color="#261000"/>
    </linearGradient>
    <linearGradient id="window" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1E0B00"/>
      <stop offset="1" stop-color="#0F0500"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FF4500"/>
      <stop offset=".5" stop-color="#FFD700"/>
      <stop offset="1" stop-color="#E8C547"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#000" flood-opacity=".55"/>
    </filter>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0v42" fill="none" stroke="#3A1800" stroke-width="1" opacity=".3"/>
    </pattern>
  </defs>
  <rect width="1800" height="1080" fill="url(#stage)"/>
  <rect width="1800" height="1080" fill="url(#grid)"/>
  <path d="M0 840C260 760 428 830 640 754c260-93 351-322 642-315 207 5 358 132 518 80v561H0z" fill="#100600" opacity=".64"/>
  <text x="88" y="112" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="56" font-weight="900">Gas Plasma</text>
  <text x="92" y="154" fill="#E8C547" font-family="SF Mono, Menlo, Consolas, monospace" font-size="24">Apple Terminal · iTerm2 · VS Code</text>
  <rect x="94" y="180" width="418" height="8" rx="4" fill="url(#accent)"/>

  <g filter="url(#shadow)">
    <rect x="88" y="232" width="640" height="480" rx="18" fill="url(#window)" stroke="#4D2600" stroke-width="2"/>
    <rect x="88" y="232" width="640" height="58" rx="18" fill="#261000"/>
    <path d="M88 272h640" stroke="#4D2600"/>
    <circle cx="128" cy="261" r="10" fill="#FF4500"/>
    <circle cx="160" cy="261" r="10" fill="#FFB347"/>
    <circle cx="192" cy="261" r="10" fill="#8B9A00"/>
    <text x="230" y="270" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="19">GasPlasma.terminal</text>
    <text x="126" y="338" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="24">$ npm run build</text>
    <text x="126" y="382" fill="#FFD700" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">generated GasPlasma.itermcolors</text>
    <text x="126" y="422" fill="#E8C547" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">generated gas-plasma-color-theme.json</text>
    <text x="126" y="462" fill="#B5CC18" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">Generated GasPlasma.terminal</text>
    <text x="126" y="526" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="24">$ open GasPlasma.terminal</text>
    <text x="126" y="566" fill="#FF9B7A" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">$ code --install-extension gas-plasma</text>
    <rect x="126" y="620" width="14" height="30" fill="#FF8C00"/>
  </g>

  <g filter="url(#shadow)">
    <rect x="650" y="148" width="1062" height="746" rx="18" fill="#120600" stroke="#4D2600" stroke-width="2"/>
    <rect x="650" y="148" width="1062" height="60" rx="18" fill="#261000"/>
    <path d="M650 190h1062" stroke="#4D2600"/>
    <text x="690" y="185" fill="#FFF0DB" font-family="SF Mono, Menlo, Consolas, monospace" font-size="19">gas-plasma-color-theme.json</text>
    <rect x="650" y="208" width="220" height="686" fill="#0D0500"/>
    <text x="690" y="268" fill="#FFD700" font-family="SF Mono, Menlo, Consolas, monospace" font-size="20">src</text>
    <text x="690" y="308" fill="#E8C547" font-family="SF Mono, Menlo, Consolas, monospace" font-size="20">themes</text>
    <text x="690" y="348" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="20">assets</text>
    <text x="690" y="388" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="20">README.md</text>
    <rect x="870" y="208" width="842" height="506" fill="#1A0A00"/>
    ${editorLines}
    <rect x="870" y="714" width="842" height="132" fill="#100600" stroke="#4D2600"/>
    <text x="905" y="764" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">$ npm run package</text>
    <text x="905" y="804" fill="#B5CC18" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">DONE Packaged: johnthre.gas-plasma-theme-0.1.0.vsix</text>
    <rect x="650" y="846" width="1062" height="48" rx="0" fill="#3A1800"/>
    <text x="690" y="878" fill="#FFF0DB" font-family="SF Mono, Menlo, Consolas, monospace" font-size="18">Open VSX namespace: johnthre</text>
  </g>

  ${swatches}
  <g transform="translate(86 920)">
    <rect width="362" height="62" rx="8" fill="#1A0A00" stroke="#CC7A00"/>
    <text x="28" y="40" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">#1A0A00 / #FF8C00</text>
  </g>
  <g transform="translate(486 920)">
    <rect width="350" height="62" rx="8" fill="#1A0A00" stroke="#8B9A00"/>
    <text x="28" y="40" fill="#B5CC18" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">syntax colors intact</text>
  </g>
  <g transform="translate(874 920)">
    <rect width="452" height="62" rx="8" fill="#1A0A00" stroke="#E8C547"/>
    <text x="28" y="40" fill="#E8C547" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">single palette, four targets</text>
  </g>
</svg>
`;
  writeFileSync(path.join(root, "assets/mockup.svg"), svg);
  writeFileSync(path.join(root, "docs/assets/mockup.svg"), svg);
}

function renderSvgToPng(svgPath, pngPath) {
  const svg = readFileSync(svgPath);
  const png = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: {
      fontFamily: "SF Mono",
      loadSystemFonts: true
    }
  }).render().asPng();
  writeFileSync(pngPath, png);
}

function writeLogoPng() {
  renderSvgToPng(path.join(root, "assets/logo.svg"), path.join(root, "assets/logo.png"));
  copyFileSync(path.join(root, "assets/logo.png"), path.join(root, "docs/assets/logo.png"));
}

function writeMockupPng() {
  renderSvgToPng(path.join(root, "assets/mockup.svg"), path.join(root, "assets/mockup.png"));
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
      --bg: #0B0300;
      --surface: ${palette.core.background};
      --surface-2: #261000;
      --surface-3: #3A1800;
      --text: ${palette.core.bold};
      --muted: #E09530;
      --accent: ${palette.core.foreground};
      --red: ${palette.ansi.normal.red};
      --green: ${palette.ansi.bright.green};
      --yellow: ${palette.ansi.bright.yellow};
      --cyan: ${palette.ansi.bright.cyan};
      --line: #4D2600;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body {
      margin: 0;
      background:
        linear-gradient(135deg, rgba(255,69,0,.10), transparent 32rem),
        linear-gradient(180deg, var(--bg) 0, var(--surface) 56rem, #0B0300 100%);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a { color: var(--yellow); text-decoration-thickness: 1px; text-underline-offset: 4px; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .wrap {
      width: min(1180px, calc(100% - 40px));
      margin: 0 auto;
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 26px 0;
      color: var(--muted);
      font-size: 15px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text);
      font-weight: 800;
    }
    .brand img { width: 34px; height: 34px; }
    .links {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, .78fr) minmax(560px, 1.22fr);
      gap: 42px;
      align-items: center;
      min-height: 720px;
      padding: 30px 0 70px;
    }
    .hero-logo { width: 118px; height: 118px; margin-bottom: 28px; }
    h1 {
      margin: 0;
      color: var(--text);
      font-size: 78px;
      line-height: .96;
      letter-spacing: 0;
    }
    .lead {
      max-width: 560px;
      margin: 24px 0 0;
      color: #FFC887;
      font-size: 20px;
      line-height: 1.65;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 32px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 18px;
      border: 1px solid var(--line);
      background: var(--surface-2);
      color: var(--text);
      font-weight: 760;
      text-decoration: none;
      border-radius: 8px;
    }
    .button.primary {
      background: var(--red);
      border-color: var(--red);
      color: #FFF0DB;
    }
    .mockup {
      display: block;
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0D0500;
      box-shadow: 0 32px 80px rgba(0,0,0,.45);
    }
    .band {
      border-top: 1px solid var(--line);
      padding: 56px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .tile {
      border: 1px solid var(--line);
      background: rgba(38,16,0,.78);
      border-radius: 8px;
      padding: 22px;
      min-height: 178px;
    }
    h2 {
      margin: 0 0 22px;
      font-size: 28px;
      line-height: 1.15;
      letter-spacing: 0;
    }
    h3 {
      margin: 0 0 12px;
      color: var(--yellow);
      font-size: 19px;
      letter-spacing: 0;
    }
    p {
      margin: 0;
      color: #FFC887;
      line-height: 1.65;
    }
    .command {
      display: block;
      margin-top: 16px;
      padding: 14px;
      overflow-x: auto;
      background: #100600;
      color: var(--green);
      border: 1px solid var(--line);
      border-radius: 8px;
      font-size: 14px;
      white-space: nowrap;
    }
    .palette {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .swatch {
      min-height: 84px;
      padding: 12px;
      color: #FFF0DB;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      text-shadow: 0 1px 8px rgba(0,0,0,.65);
    }
    .footer {
      border-top: 1px solid var(--line);
      color: var(--muted);
      padding: 30px 0 46px;
      font-size: 14px;
    }
    @media (max-width: 980px) {
      .hero { grid-template-columns: 1fr; min-height: 0; }
      h1 { font-size: 56px; }
      .grid { grid-template-columns: 1fr; }
      .palette { grid-template-columns: repeat(4, 1fr); }
    }
    @media (max-width: 560px) {
      .wrap { width: min(100% - 28px, 1180px); }
      .nav { align-items: flex-start; flex-direction: column; }
      h1 { font-size: 44px; }
      .lead { font-size: 18px; }
      .palette { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <nav class="wrap nav">
    <a class="brand" href="https://github.com/JohnThre/GasPlasma-theme">
      <img src="assets/logo.svg" alt="">
      <span>Gas Plasma</span>
    </a>
    <div class="links">
      <a href="#install">Install</a>
      <a href="#palette">Palette</a>
      <a href="https://open-vsx.org/extension/johnthre/gas-plasma-theme">Open VSX</a>
      <a href="https://github.com/JohnThre/GasPlasma-theme">GitHub</a>
    </div>
  </nav>
  <main>
    <section class="wrap hero">
      <div>
        <img class="hero-logo" src="assets/logo.svg" alt="Gas Plasma logo">
        <h1>Gas Plasma</h1>
        <p class="lead">${xmlEscape(palette.description)} A single warm, high-contrast palette for Apple Terminal, iTerm2, VS Code, and Open VSX-compatible editors.</p>
        <div class="actions">
          <a class="button primary" href="https://github.com/JohnThre/GasPlasma-theme/releases">Releases</a>
          <a class="button" href="https://open-vsx.org/extension/johnthre/gas-plasma-theme">Open VSX</a>
        </div>
      </div>
      <img class="mockup" src="assets/mockup.svg" alt="Gas Plasma terminal and editor mockup">
    </section>
    <section id="install" class="band">
      <div class="wrap">
        <h2>Install Targets</h2>
        <div class="grid">
          <article class="tile">
            <h3>Apple Terminal</h3>
            <p>Download <code>GasPlasma.terminal</code> from GitHub Releases and open it in Terminal.</p>
            <code class="command">open GasPlasma.terminal</code>
          </article>
          <article class="tile">
            <h3>iTerm2</h3>
            <p>Import <code>GasPlasma.itermcolors</code> from iTerm2 color presets.</p>
            <code class="command">GasPlasma.itermcolors</code>
          </article>
          <article class="tile">
            <h3>VS Code</h3>
            <p>Install the published VSIX from Open VSX-compatible editors.</p>
            <code class="command">johnthre.gas-plasma-theme</code>
          </article>
        </div>
      </div>
    </section>
    <section id="palette" class="band">
      <div class="wrap">
        <h2>Palette</h2>
        <div class="palette" aria-label="Gas Plasma palette">
          <div class="swatch" style="background:#1A0A00">#1A0A00</div>
          <div class="swatch" style="background:#FF8C00">#FF8C00</div>
          <div class="swatch" style="background:#FF4500">#FF4500</div>
          <div class="swatch" style="background:#8B9A00">#8B9A00</div>
          <div class="swatch" style="background:#FFD700">#FFD700</div>
          <div class="swatch" style="background:#CC7A00">#CC7A00</div>
          <div class="swatch" style="background:#FF6B6B">#FF6B6B</div>
          <div class="swatch" style="background:#E8C547">#E8C547</div>
        </div>
      </div>
    </section>
  </main>
  <footer class="wrap footer">GPL-3.0-or-later · Generated from one shared palette · GitHub Pages</footer>
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
