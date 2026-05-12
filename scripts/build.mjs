#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import * as simpleIcons from "simple-icons";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const palette = JSON.parse(readFileSync(path.join(root, "src/palette.json"), "utf8"));
const iconManifest = JSON.parse(readFileSync(path.join(root, "src/icon-manifest.json"), "utf8"));

for (const dir of ["docs/assets/icons", "icons/file/svg", "icons/product/svg"]) {
  rmSync(path.join(root, dir), { recursive: true, force: true });
}
rmSync(path.join(root, "icons/product/gas-plasma-product-icons.json"), { force: true });

const dirs = [
  "themes",
  "assets",
  "docs",
  "docs/assets",
  "docs/assets/icons",
  "dist",
  "icons",
  "icons/file",
  "icons/file/svg",
  "icons/product",
  "icons/product/svg"
];
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

function iconDefName(iconName) {
  return `_gp_${iconName.replaceAll("-", "_")}`;
}

function mapIconAssociations(values = {}) {
  return Object.fromEntries(
    Object.entries(values).map(([key, iconName]) => [key, iconDefName(iconName)])
  );
}

function fileIconSvg(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${xmlEscape(title)}">
  <defs>
    <linearGradient id="tile" x1="14" y1="10" x2="82" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2A1200"/>
      <stop offset=".48" stop-color="#160700"/>
      <stop offset="1" stop-color="#080200"/>
    </linearGradient>
    <linearGradient id="ember" x1="20" y1="15" x2="76" y2="83" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFD2A6"/>
      <stop offset=".28" stop-color="#FFD700"/>
      <stop offset=".72" stop-color="#FF8C00"/>
      <stop offset="1" stop-color="#FF4500"/>
    </linearGradient>
    <linearGradient id="panel" x1="24" y1="24" x2="72" y2="72" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2A1200"/>
      <stop offset=".6" stop-color="#100600"/>
      <stop offset="1" stop-color="#050100"/>
    </linearGradient>
    <linearGradient id="darkGlass" x1="24" y1="22" x2="72" y2="72" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2A1200"/>
      <stop offset=".58" stop-color="#100600"/>
      <stop offset="1" stop-color="#050100"/>
    </linearGradient>
    <radialGradient id="disc" cx="39%" cy="31%" r="68%">
      <stop offset="0" stop-color="#FFF0DB"/>
      <stop offset=".28" stop-color="#E8C547"/>
      <stop offset=".56" stop-color="#FF9B7A"/>
      <stop offset="1" stop-color="#4D2600"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#050100" flood-opacity=".48"/>
    </filter>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${body}
</svg>
`;
}

function glassTile(inner, accent = "#FF4500") {
  return `<g filter="url(#shadow)">
    <path d="M24 9h33l18 18v56H24c-4 0-7-3-7-7V16c0-4 3-7 7-7z" fill="url(#tile)" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M57 9v18h18" fill="#321500" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M26 17h20" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".38"/>
    <path d="M24 77h42" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>
    ${inner}
  </g>`;
}

function languageText(label, x, y, size, fill = "#FFD2A6", weight = 900) {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Inter, SF Pro Display, Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${xmlEscape(label)}</text>`;
}

function simpleIconColor(icon, fallback = "#FFD2A6") {
  if (!icon?.hex || icon.hex === "000000" || icon.hex === "000080") return fallback;
  return `#${icon.hex}`;
}

function simpleIconFileSvg(title, icon, options = {}) {
  if (!icon?.path) throw new Error(`Missing Simple Icons path for ${title}`);
  const scale = options.scale ?? 3;
  const offset = ((96 - (24 * scale)) / 2).toFixed(2);
  const fill = options.fill ?? simpleIconColor(icon, options.fallback ?? "#FFD2A6");
  const stroke = options.stroke ?? "#080200";
  const strokeWidth = options.strokeWidth ?? 0.52;

  return fileIconSvg(title, `<g filter="url(#shadow)">
    <path d="${icon.path}" transform="translate(${offset} ${offset}) scale(${scale})" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke fill" stroke-linejoin="round"/>
  </g>`);
}

function languageBadge(label, accent = "#E8C547", kind = "mono") {
  const size = label.length === 1 ? 36 : label.length <= 2 ? 31 : label.length <= 3 ? 25 : label.length <= 4 ? 19 : 15;
  const labelY = label.length <= 4 ? 57 : 56;
  const centerLabel = languageText(label, 48, labelY, size);
  const frame = `<rect x="23" y="23" width="50" height="50" rx="12" fill="url(#tile)" stroke="${accent}" stroke-width="4" stroke-linejoin="round"/>`;
  let inner;

  switch (kind) {
    case "hex":
      inner = `<path d="M48 17l29 17v31L48 82 19 65V34z" fill="url(#tile)" stroke="${accent}" stroke-width="4.5" stroke-linejoin="round"/>
    ${centerLabel}`;
      break;
    case "split":
      inner = `${frame}
    <path d="M48 24v48" stroke="${accent}" stroke-width="3" opacity=".34"/>
    ${centerLabel}`;
      break;
    case "snake":
      inner = `${frame}
    <path d="M31 38c0-8 6-13 15-13h12" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>
    <path d="M65 62c0 8-6 13-15 13H38" fill="none" stroke="#FFD2A6" stroke-width="5" stroke-linecap="round" opacity=".84"/>
    ${centerLabel}`;
      break;
    case "steam":
      inner = `${frame}
    <path d="M37 38c-3-5 5-7 1-12M48 38c-3-5 5-7 1-12M59 38c-3-5 5-7 1-12" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 64h32" stroke="#FFD2A6" stroke-width="4" stroke-linecap="round" opacity=".78"/>
    ${centerLabel}`;
      break;
    case "gear":
      inner = `<circle cx="48" cy="49" r="25" fill="url(#tile)" stroke="${accent}" stroke-width="4.5"/>
    <path d="M48 18v8M48 72v8M17 49h8M71 49h8M27 28l6 6M63 64l6 6M69 28l-6 6M33 64l-6 6" stroke="${accent}" stroke-width="3.2" stroke-linecap="round"/>
    ${centerLabel}`;
      break;
    case "gem":
      inner = `<path d="M48 18l28 18-28 45-28-45z" fill="url(#tile)" stroke="${accent}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M22 36h52M36 36l12 43 12-43" fill="none" stroke="#FFD2A6" stroke-width="2.7" stroke-linejoin="round" opacity=".34"/>
    ${centerLabel}`;
      break;
    case "lambda":
      inner = `<path d="M36 66l12-37 12 37M43 53h17" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".62"/>
    ${centerLabel}`;
      break;
    case "orbit":
      inner = `<circle cx="48" cy="49" r="24" fill="url(#tile)" stroke="${accent}" stroke-width="4.5"/>
    <path d="M19 51c14-21 43-27 58-11M75 45c-14 22-43 28-58 12" fill="none" stroke="#FFD2A6" stroke-width="3" stroke-linecap="round" opacity=".42"/>
    ${centerLabel}`;
      break;
    case "flame":
      inner = `<path d="M35 69c-12-18 2-29 8-48 14 9 25 22 21 39-3 12-12 18-22 16 5-5 6-12 2-19-3 6-6 10-9 12z" fill="url(#tile)" stroke="${accent}" stroke-width="4.5" stroke-linejoin="round"/>
    ${centerLabel}`;
      break;
    case "pill":
      inner = `<rect x="18" y="31" width="60" height="34" rx="17" fill="url(#tile)" stroke="${accent}" stroke-width="4.5"/>
    ${centerLabel}`;
      break;
    case "wave":
      inner = `${frame}
    <path d="M25 63c9-23 22-24 32-3 5 9 10 10 16 1" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" opacity=".72"/>
    ${centerLabel}`;
      break;
    case "terminal":
      inner = `${frame}
    <path d="M31 40l8 8-8 8M45 56h18" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".72"/>
    ${languageText(label, 49, 67, Math.max(14, size - 7))}`;
      break;
    case "bars":
      inner = `${frame}
    <path d="M30 36h36M30 48h30M30 60h36" stroke="#FFD2A6" stroke-width="4" stroke-linecap="round" opacity=".34"/>
    ${centerLabel}`;
      break;
    case "dart":
      inner = `<path d="M24 24h31l18 18v30H42L23 53z" fill="url(#tile)" stroke="${accent}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M24 24l20 20h29M42 72V44" fill="none" stroke="#FFD2A6" stroke-width="3" stroke-linejoin="round" opacity=".36"/>
    ${centerLabel}`;
      break;
    case "shield":
      inner = `<path d="M24 18h48l-4 51-20 11-20-11z" fill="url(#tile)" stroke="${accent}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M36 30h27M34 45h25M36 60h20" stroke="#FFD2A6" stroke-width="3" stroke-linecap="round" opacity=".24"/>
    ${centerLabel}`;
      break;
    case "square":
      inner = `<rect x="20" y="20" width="56" height="56" rx="10" fill="url(#tile)" stroke="${accent}" stroke-width="4.5" stroke-linejoin="round"/>
    ${centerLabel}`;
      break;
    case "mono":
    default:
      inner = `${frame}
    <path d="M30 34h36" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
    ${centerLabel}
    <path d="M32 62h32" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity=".52"/>`;
      break;
  }

  return `<g filter="url(#shadow)">
    ${inner}
  </g>`;
}

const fileIconRenderers = {
  cd: () => fileIconSvg("Gas Plasma CD icon", `<g filter="url(#shadow)">
    <circle cx="48" cy="48" r="34" fill="url(#disc)" stroke="#FFD2A6" stroke-width="2"/>
    <circle cx="48" cy="48" r="13" fill="#140800" stroke="#FFF0DB" stroke-width="3"/>
    <circle cx="48" cy="48" r="5" fill="#FF8C00"/>
    <path d="M27 27c14-10 39-8 52 7" fill="none" stroke="#FFF0DB" stroke-width="4" stroke-linecap="round" opacity=".62"/>
    <path d="M23 58c14 8 35 10 51-2" fill="none" stroke="#1A0A00" stroke-width="3" stroke-linecap="round" opacity=".36"/>
  </g>`),
  code: () => fileIconSvg("Gas Plasma code icon", glassTile(`<rect x="26" y="27" width="44" height="38" rx="8" fill="url(#darkGlass)" stroke="#4D2600" stroke-width="2"/>
    <path d="M41 38l-8 8 8 8M55 38l8 8-8 8" fill="none" stroke="#FFD2A6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50 36l-5 22" stroke="#E8C547" stroke-width="4" stroke-linecap="round"/>`, "#E8C547")),
  crypto: () => fileIconSvg("Gas Plasma crypto icon", glassTile(`<circle cx="42" cy="45" r="17" fill="#140800" stroke="#FFD700" stroke-width="5"/>
    <circle cx="56" cy="45" r="17" fill="none" stroke="#FFD2A6" stroke-width="5"/>
    <path d="M36 45h26" stroke="#FF8C00" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 33v24" stroke="#E8C547" stroke-width="4" stroke-linecap="round" opacity=".85"/>`, "#FFD700")),
  crt: () => fileIconSvg("Gas Plasma CRT file icon", `<g filter="url(#shadow)">
    <rect x="15" y="19" width="66" height="49" rx="14" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2"/>
    <rect x="25" y="28" width="46" height="30" rx="7" fill="url(#darkGlass)" stroke="#4D2600" stroke-width="2"/>
    <path d="M33 40h12M33 49h27" stroke="#FF8C00" stroke-width="4" stroke-linecap="round" filter="url(#softGlow)"/>
    <path d="M39 69h18l4 9H35z" fill="#3A1800" stroke="#CC7A00" stroke-width="2"/>
    <path d="M27 24c11-5 28-5 42 0" fill="none" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  </g>`),
  document: () => fileIconSvg("Gas Plasma document icon", `<g filter="url(#shadow)">
    <path d="M25 13h32l16 16v54H25z" fill="#FFD2A6" stroke="#FF8C00" stroke-width="2" stroke-linejoin="round"/>
    <path d="M57 13v17h16" fill="#4D2600" stroke="#FF8C00" stroke-width="2" stroke-linejoin="round"/>
    <path d="M34 42h27M34 52h27M34 62h20" stroke="#4D2600" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 20c8-3 16-3 24 0" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  </g>`),
  floppy: () => fileIconSvg("Gas Plasma floppy disk icon", `<g filter="url(#shadow)">
    <rect x="18" y="13" width="60" height="70" rx="11" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2"/>
    <rect x="29" y="18" width="35" height="20" rx="2" fill="#3A1800"/>
    <rect x="56" y="18" width="8" height="20" rx="1" fill="#E8C547"/>
    <rect x="30" y="52" width="36" height="21" rx="5" fill="#FFD2A6"/>
    <path d="M37 60h22M37 67h16" stroke="#4D2600" stroke-width="3" stroke-linecap="round"/>
    <path d="M25 19c8-3 23-4 36-1" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".56"/>
  </g>`),
  folder: () => fileIconSvg("Gas Plasma folder icon", `<g filter="url(#shadow)">
    <path d="M12 29c0-6 4-10 10-10h17l7 8h29c6 0 10 4 10 10v10H12z" fill="#6E2E00" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M13 36h70L75 80H20z" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M22 41c14-5 34-5 51 1" fill="none" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  </g>`),
  "folder-open": () => fileIconSvg("Gas Plasma open folder icon", `<g filter="url(#shadow)">
    <path d="M12 29c0-6 4-10 10-10h17l7 8h29c6 0 10 4 10 10v11H12z" fill="#6E2E00" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M11 43h75L76 80H20z" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M22 47c15-5 36-5 52 0" fill="none" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  </g>`),
  "fsf-bull": () => fileIconSvg("Gas Plasma free software bull icon", glassTile(`<path d="M36 39C27 28 18 28 13 38c8-2 15 2 20 9M60 39c9-11 18-11 23-1-8-2-15 2-20 9" fill="none" stroke="#FFD2A6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M34 44c0-12 6-20 14-20s14 8 14 20c0 10-6 18-14 24-8-6-14-14-14-24z" fill="#140800" stroke="#FFD2A6" stroke-width="4" stroke-linejoin="round"/>
    <path d="M40 48h16M42 58h12" stroke="#FF8C00" stroke-width="4" stroke-linecap="round"/>`, "#FFD2A6")),
  linux: () => fileIconSvg("Gas Plasma penguin icon", glassTile(`<circle cx="48" cy="48" r="24" fill="#140800" stroke="#FFD2A6" stroke-width="3"/>
    <path d="M36 56c1-19 5-30 12-30s11 11 12 30c-3 8-7 12-12 12s-9-4-12-12z" fill="#FFD2A6"/>
    <path d="M42 45h12" stroke="#FF8C00" stroke-width="4" stroke-linecap="round"/>
    <path d="M38 66h20" stroke="#FF8C00" stroke-width="4" stroke-linecap="round" opacity=".9"/>`, "#FFD2A6")),
  package: () => fileIconSvg("Gas Plasma package icon", `<g filter="url(#shadow)">
    <path d="M48 14l30 17v34L48 82 18 65V31z" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M18 31l30 16 30-16M48 47v35" fill="none" stroke="#4D2600" stroke-width="3" stroke-linejoin="round"/>
    <path d="M33 23l30 16" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".52"/>
  </g>`),
  palette: () => fileIconSvg("Gas Plasma palette icon", glassTile(`<rect x="29" y="28" width="15" height="15" rx="4" fill="#FF4500"/>
    <rect x="52" y="28" width="15" height="15" rx="4" fill="#FFD700"/>
    <rect x="29" y="52" width="15" height="15" rx="4" fill="#8B9A00"/>
    <rect x="52" y="52" width="15" height="15" rx="4" fill="#E8C547"/>`, "#E8C547")),
  "terminal-crt": () => fileIconSvg("Gas Plasma terminal CRT icon", `<g filter="url(#shadow)">
    <rect x="14" y="18" width="68" height="52" rx="14" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2"/>
    <rect x="24" y="27" width="48" height="33" rx="8" fill="#080200" stroke="#4D2600" stroke-width="2"/>
    <path d="M32 39l8 7-8 7M47 53h13" fill="none" stroke="#FF8C00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)"/>
    <path d="M38 71h20l4 8H34z" fill="#3A1800" stroke="#CC7A00" stroke-width="2"/>
    <path d="M26 23c10-5 29-5 43 0" fill="none" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  </g>`),
  workflow: () => fileIconSvg("Gas Plasma workflow icon", glassTile(`<path d="M38 38h20M42 43l8 12M54 43l-8 12" stroke="#4D2600" stroke-width="4" stroke-linecap="round"/>
    <circle cx="34" cy="36" r="7" fill="#140800" stroke="#FFD700" stroke-width="4"/>
    <circle cx="62" cy="36" r="7" fill="#140800" stroke="#E8C547" stroke-width="4"/>
    <circle cx="48" cy="62" r="7" fill="#140800" stroke="#FF4500" stroke-width="4"/>`, "#FF4500"))
};

Object.assign(fileIconRenderers, {
  archive: () => fileIconSvg("Gas Plasma archive icon", glassTile(`<path d="M32 32h32v31H32z" fill="#FFD2A6" stroke="#4D2600" stroke-width="3" stroke-linejoin="round"/>
    <path d="M39 32v31M47 32v31M55 32v31" stroke="#4D2600" stroke-width="3"/>
    <path d="M36 45h24" stroke="#FF8C00" stroke-width="4" stroke-linecap="round"/>`, "#E09530")),
  audio: () => fileIconSvg("Gas Plasma audio icon", glassTile(`<path d="M38 55c0 5-4 8-9 8s-8-3-8-7 4-8 9-8c2 0 4 1 5 2V32h23v7H42v16z" fill="#FFD2A6"/>
    <path d="M60 36c5 5 7 14 1 23" fill="none" stroke="#E8C547" stroke-width="4" stroke-linecap="round"/>`, "#E8C547")),
  cmake: () => fileIconSvg("Gas Plasma CMake icon", glassTile(`<path d="M48 26l20 36H28z" fill="#140800" stroke="#FFD2A6" stroke-width="4" stroke-linejoin="round"/>
    <path d="M48 34l8 16H40z" fill="#FF8C00"/>
    <text x="48" y="68" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="900" fill="#FFD2A6">MAKE</text>`, "#B5CC18")),
  config: () => fileIconSvg("Gas Plasma config icon", glassTile(`<path d="M33 36h30M33 48h30M33 60h30" stroke="#FFD2A6" stroke-width="4" stroke-linecap="round"/>
    <circle cx="43" cy="36" r="5" fill="#FF8C00"/>
    <circle cx="55" cy="48" r="5" fill="#E8C547"/>
    <circle cx="39" cy="60" r="5" fill="#FFD700"/>`, "#E8C547")),
  database: () => fileIconSvg("Gas Plasma database icon", glassTile(`<ellipse cx="48" cy="34" rx="19" ry="8" fill="#FFD2A6" stroke="#4D2600" stroke-width="3"/>
    <path d="M29 34v25c0 5 9 9 19 9s19-4 19-9V34" fill="#140800" stroke="#FFD2A6" stroke-width="3"/>
    <path d="M29 47c0 5 9 9 19 9s19-4 19-9" fill="none" stroke="#FF8C00" stroke-width="3"/>`, "#B5CC18")),
  docker: () => fileIconSvg("Gas Plasma container icon", glassTile(`<rect x="30" y="42" width="12" height="10" rx="2" fill="#FFD2A6"/>
    <rect x="44" y="42" width="12" height="10" rx="2" fill="#E8C547"/>
    <rect x="58" y="42" width="12" height="10" rx="2" fill="#FFD700"/>
    <rect x="37" y="30" width="12" height="10" rx="2" fill="#FF8C00"/>
    <rect x="51" y="30" width="12" height="10" rx="2" fill="#FFD2A6"/>
    <path d="M26 56h44c-4 8-11 12-22 12s-18-4-22-12z" fill="#140800" stroke="#FFD2A6" stroke-width="3" stroke-linejoin="round"/>`, "#E8C547")),
  font: () => fileIconSvg("Gas Plasma font icon", glassTile(`<text x="48" y="57" text-anchor="middle" font-family="Georgia, serif" font-size="31" font-weight="900" fill="#FFD2A6">Aa</text>
    <path d="M31 63h34" stroke="#E8C547" stroke-width="4" stroke-linecap="round"/>`, "#E8C547")),
  git: () => fileIconSvg("Gas Plasma git icon", glassTile(`<path d="M34 34l28 28M34 62l28-28" stroke="#FF8C00" stroke-width="5" stroke-linecap="round"/>
    <circle cx="34" cy="34" r="7" fill="#FFD2A6"/>
    <circle cx="62" cy="34" r="7" fill="#FFD700"/>
    <circle cx="34" cy="62" r="7" fill="#E8C547"/>`, "#FF4500")),
  image: () => fileIconSvg("Gas Plasma image icon", glassTile(`<rect x="29" y="31" width="38" height="32" rx="5" fill="#140800" stroke="#FFD2A6" stroke-width="3"/>
    <circle cx="57" cy="40" r="5" fill="#FFD700"/>
    <path d="M32 61l11-12 8 8 6-6 9 10z" fill="#FF8C00"/>`, "#FFD700")),
  lock: () => fileIconSvg("Gas Plasma security icon", glassTile(`<rect x="31" y="43" width="34" height="24" rx="7" fill="#FFD2A6" stroke="#4D2600" stroke-width="3"/>
    <path d="M38 43v-8c0-7 4-12 10-12s10 5 10 12v8" fill="none" stroke="#FFD2A6" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 51v8" stroke="#4D2600" stroke-width="4" stroke-linecap="round"/>`, "#FFD700")),
  markdown: () => fileIconSvg("Gas Plasma Markdown icon", `<g filter="url(#shadow)">
    <rect x="12" y="26" width="72" height="44" rx="8" fill="url(#tile)" stroke="#E8C547" stroke-width="4"/>
    <text x="38" y="56" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="950" fill="#FFD2A6">MD</text>
    <path d="M65 38v22M56 52l9 9 9-9" fill="none" stroke="#E8C547" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`),
  npm: () => fileIconSvg("Gas Plasma package manifest icon", glassTile(`<rect x="28" y="34" width="40" height="27" rx="4" fill="#FFD2A6"/>
    <text x="48" y="53" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="950" fill="#4D2600">npm</text>`, "#FF4500")),
  pdf: () => fileIconSvg("Gas Plasma PDF icon", glassTile(`<path d="M32 27h24l10 10v32H32z" fill="#FFD2A6" stroke="#4D2600" stroke-width="3" stroke-linejoin="round"/>
    <path d="M56 27v11h10" fill="#4D2600"/>
    <text x="49" y="58" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="950" fill="#4D2600">PDF</text>`, "#FF6B6B")),
  video: () => fileIconSvg("Gas Plasma video icon", glassTile(`<rect x="29" y="32" width="38" height="31" rx="7" fill="#140800" stroke="#FFD2A6" stroke-width="3"/>
    <path d="M44 40l15 8-15 8z" fill="#FF8C00"/>
    <path d="M30 32l7 31M45 32l7 31" stroke="#4D2600" stroke-width="3"/>`, "#FF6B6B")),
  yaml: () => fileIconSvg("Gas Plasma YAML icon", glassTile(`<path d="M32 35h32M32 48h24M32 61h31" stroke="#FFD2A6" stroke-width="4" stroke-linecap="round"/>
    <path d="M35 35l6 7 7-7M35 48l6 7 7-7" fill="none" stroke="#E8C547" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`, "#E8C547")),
  json: () => fileIconSvg("Gas Plasma JSON icon", glassTile(`<path d="M39 32c-6 0-9 4-9 9v3c0 3-2 5-5 5 3 0 5 2 5 5v3c0 5 3 9 9 9M57 32c6 0 9 4 9 9v3c0 3 2 5 5 5-3 0-5 2-5 5v3c0 5-3 9-9 9" fill="none" stroke="#FFD2A6" stroke-width="5" stroke-linecap="round"/>
    <path d="M45 42h6M45 55h6" stroke="#FF8C00" stroke-width="4" stroke-linecap="round"/>`, "#FFD700"))
});

const languageIconSpecs = {
  ada: ["ADA", "#02A3A3", "hex"],
  assembly: ["ASM", "#6E4C13", "terminal"],
  astro: ["AST", "#FF5D01", "orbit"],
  batch: ["BAT", "#4D8AC8", "terminal"],
  c: ["C", "#5E97D1", "hex"],
  clojure: ["CLJ", "#5881D8", "orbit"],
  cobol: ["COB", "#576CBC", "bars"],
  coffeescript: ["CF", "#8B5A2B", "steam"],
  cpp: ["C++", "#659AD2", "hex"],
  crystal: ["CR", "#B7B7B7", "gem"],
  csharp: ["C#", "#9B4F96", "hex"],
  css: ["CSS", "#1572B6", "shield"],
  d: ["D", "#BA1200", "hex"],
  dart: ["DART", "#0175C2", "dart"],
  ejs: ["EJS", "#A91E50", "bars"],
  elixir: ["EX", "#6E4A7E", "gem"],
  elm: ["ELM", "#60B5CC", "gem"],
  erlang: ["ERL", "#A90533", "wave"],
  fortran: ["FOR", "#734F96", "bars"],
  fsharp: ["F#", "#378BBA", "lambda"],
  gdscript: ["GDS", "#478CBF", "hex"],
  go: ["GO", "#00ADD8", "orbit"],
  graphql: ["GQL", "#E10098", "orbit"],
  groovy: ["GRV", "#4298B8", "wave"],
  handlebars: ["HBS", "#F0772B", "bars"],
  haskell: ["HS", "#5D4F85", "lambda"],
  hcl: ["HCL", "#7B42BC", "hex"],
  html: ["HTML", "#E34F26", "shield"],
  java: ["JAVA", "#E76F00", "steam"],
  javascript: ["JS", "#F7DF1E", "square"],
  julia: ["JL", "#9558B2", "orbit"],
  kotlin: ["KT", "#A97BFF", "square"],
  latex: ["TEX", "#008080", "lambda"],
  lisp: ["LSP", "#3FB68B", "lambda"],
  lua: ["LUA", "#2C2D72", "orbit"],
  make: ["MK", "#5E7F38", "bars"],
  matlab: ["MAT", "#E16737", "wave"],
  nim: ["NIM", "#FFE953", "hex"],
  nix: ["NIX", "#7EBAE4", "hex"],
  objectivec: ["OC", "#438EFF", "hex"],
  objectivecpp: ["OC++", "#438EFF", "split"],
  ocaml: ["ML", "#EC6813", "lambda"],
  pascal: ["PAS", "#E3A335", "bars"],
  perl: ["PL", "#39457E", "wave"],
  php: ["PHP", "#777BB4", "pill"],
  powershell: ["PS", "#5391FE", "terminal"],
  proto: ["PB", "#336791", "hex"],
  pug: ["PUG", "#A86454", "hex"],
  purescript: ["PS", "#1D222D", "lambda"],
  python: ["PY", "#3776AB", "snake"],
  r: ["R", "#276DC3", "orbit"],
  reason: ["RE", "#DD4B39", "lambda"],
  ruby: ["RB", "#CC342D", "gem"],
  rust: ["RS", "#D08743", "gear"],
  scala: ["SC", "#DC322F", "wave"],
  scheme: ["SCM", "#3FB68B", "lambda"],
  smalltalk: ["ST", "#5968A6", "pill"],
  sql: ["SQL", "#336791", "bars"],
  svelte: ["SV", "#FF3E00", "flame"],
  swift: ["SW", "#F05138", "square"],
  terraform: ["TF", "#7B42BC", "hex"],
  typescript: ["TS", "#3178C6", "square"],
  vala: ["VALA", "#7A5C99", "wave"],
  vb: ["VB", "#68217A", "split"],
  verilog: ["VG", "#D6A600", "bars"],
  vhdl: ["VHD", "#D6A600", "bars"],
  vue: ["VUE", "#41B883", "gem"],
  wasm: ["WASM", "#654FF0", "hex"],
  zig: ["ZIG", "#F7A41D", "flame"]
};

const officialLanguageIcons = {
  ada: [simpleIcons.siAda],
  astro: [simpleIcons.siAstro],
  c: [simpleIcons.siC],
  clojure: [simpleIcons.siClojure],
  coffeescript: [simpleIcons.siCoffeescript],
  cpp: [simpleIcons.siCplusplus],
  crystal: [simpleIcons.siCrystal],
  css: [simpleIcons.siCss, { fill: "#1572B6" }],
  dart: [simpleIcons.siDart],
  elixir: [simpleIcons.siElixir],
  elm: [simpleIcons.siElm],
  erlang: [simpleIcons.siErlang],
  fortran: [simpleIcons.siFortran],
  fsharp: [simpleIcons.siFsharp],
  gdscript: [simpleIcons.siGodotengine],
  go: [simpleIcons.siGo],
  graphql: [simpleIcons.siGraphql],
  groovy: [simpleIcons.siApachegroovy],
  handlebars: [simpleIcons.siHandlebarsdotjs],
  haskell: [simpleIcons.siHaskell],
  hcl: [simpleIcons.siHashicorp],
  html: [simpleIcons.siHtml5],
  java: [simpleIcons.siOpenjdk, { fill: "#E76F00" }],
  javascript: [simpleIcons.siJavascript],
  julia: [simpleIcons.siJulia],
  kotlin: [simpleIcons.siKotlin],
  latex: [simpleIcons.siLatex],
  lua: [simpleIcons.siLua, { fill: "#5D6EFF" }],
  make: [simpleIcons.siMake],
  nim: [simpleIcons.siNim],
  nix: [simpleIcons.siNixos],
  ocaml: [simpleIcons.siOcaml],
  pascal: [simpleIcons.siDelphi],
  perl: [simpleIcons.siPerl],
  php: [simpleIcons.siPhp],
  proto: [simpleIcons.siProtocolsdotio],
  pug: [simpleIcons.siPug],
  purescript: [simpleIcons.siPurescript],
  python: [simpleIcons.siPython],
  r: [simpleIcons.siR],
  reason: [simpleIcons.siReason],
  ruby: [simpleIcons.siRuby],
  rust: [simpleIcons.siRust, { fill: "#D08743" }],
  scala: [simpleIcons.siScala],
  sql: [simpleIcons.siSqlite],
  svelte: [simpleIcons.siSvelte],
  swift: [simpleIcons.siSwift],
  terraform: [simpleIcons.siTerraform],
  typescript: [simpleIcons.siTypescript],
  vala: [simpleIcons.siVala],
  vue: [simpleIcons.siVuedotjs],
  wasm: [simpleIcons.siWebassembly],
  zig: [simpleIcons.siZig]
};

for (const [iconName, [label, accent, kind]] of Object.entries(languageIconSpecs)) {
  const officialIcon = officialLanguageIcons[iconName];
  fileIconRenderers[iconName] = officialIcon
    ? () => simpleIconFileSvg(`Gas Plasma ${label} language icon`, officialIcon[0], officialIcon[1])
    : () => fileIconSvg(`Gas Plasma ${label} language icon`, languageBadge(label, accent, kind));
}

Object.assign(fileIconRenderers, {
  cmake: () => simpleIconFileSvg("Gas Plasma CMake icon", simpleIcons.siCmake, { fill: "#E8C547" }),
  docker: () => simpleIconFileSvg("Gas Plasma Docker icon", simpleIcons.siDocker),
  git: () => simpleIconFileSvg("Gas Plasma Git icon", simpleIcons.siGit),
  java: () => fileIconSvg("Gas Plasma Java language icon", `<g filter="url(#shadow)">
    <path d="M41 23c-7 8 13 10 2 19M52 18c-8 10 15 12 2 25M63 24c-6 7 10 9 1 17" fill="none" stroke="#E76F00" stroke-width="4" stroke-linecap="round"/>
    <path d="M31 48h31v8c0 8-7 14-16 14s-15-6-15-14z" fill="none" stroke="#5382A1" stroke-width="5" stroke-linejoin="round"/>
    <path d="M62 50h5c5 0 8 4 7 9-1 6-7 9-13 8" fill="none" stroke="#5382A1" stroke-width="5" stroke-linecap="round"/>
    <path d="M25 75c12 5 31 5 45 0" fill="none" stroke="#E76F00" stroke-width="4" stroke-linecap="round"/>
  </g>`),
  json: () => simpleIconFileSvg("Gas Plasma JSON icon", simpleIcons.siJson, { fill: "#FFD700" }),
  linux: () => simpleIconFileSvg("Gas Plasma Linux icon", simpleIcons.siLinux, { strokeWidth: 0.45 }),
  markdown: () => simpleIconFileSvg("Gas Plasma Markdown icon", simpleIcons.siMarkdown, { fill: "#FFD2A6" }),
  npm: () => simpleIconFileSvg("Gas Plasma npm icon", simpleIcons.siNpm, { fill: "#CB3837" }),
  yaml: () => simpleIconFileSvg("Gas Plasma YAML icon", simpleIcons.siYaml)
});

function writeFileIcons() {
  const fileTheme = iconManifest.fileTheme;
  const iconNames = new Set([
    ...Object.values(fileTheme.icons),
    ...Object.values(fileTheme.fileExtensions),
    ...Object.values(fileTheme.fileNames),
    ...Object.values(fileTheme.folderNames),
    ...Object.values(fileTheme.languageIds)
  ]);
  const iconDir = path.join(root, "icons/file/svg");
  const docsIconDir = path.join(root, "docs/assets/icons");

  for (const iconName of [...iconNames].sort()) {
    const render = fileIconRenderers[iconName];
    if (!render) throw new Error(`Missing file icon renderer for ${iconName}`);
    const svg = render();
    writeFileSync(path.join(iconDir, `${iconName}.svg`), svg);
    if (fileTheme.gallery.includes(iconName)) {
      writeFileSync(path.join(docsIconDir, `${iconName}.svg`), svg);
    }
  }

  const theme = {
    $schema: "vscode://schemas/icon-theme",
    hidesExplorerArrows: false,
    showLanguageModeIcons: true,
    iconDefinitions: Object.fromEntries(
      [...iconNames].sort().map((iconName) => [
        iconDefName(iconName),
        { iconPath: `./svg/${iconName}.svg` }
      ])
    ),
    file: iconDefName(fileTheme.icons.file),
    folder: iconDefName(fileTheme.icons.folder),
    folderExpanded: iconDefName(fileTheme.icons.folderExpanded),
    rootFolder: iconDefName(fileTheme.icons.rootFolder),
    rootFolderExpanded: iconDefName(fileTheme.icons.rootFolderExpanded),
    fileExtensions: mapIconAssociations(fileTheme.fileExtensions),
    fileNames: mapIconAssociations(fileTheme.fileNames),
    folderNames: mapIconAssociations(fileTheme.folderNames),
    folderNamesExpanded: mapIconAssociations(fileTheme.folderNames),
    languageIds: mapIconAssociations(fileTheme.languageIds)
  };

  writeFileSync(
    path.join(root, "icons/file/gas-plasma-icon-theme.json"),
    `${JSON.stringify(theme, null, 2)}\n`
  );
}

const productCodiconNames = {
  branch: "source-control",
  check: "check",
  close: "close",
  crt: "terminal",
  error: "error",
  file: "file",
  floppy: "save",
  folder: "folder",
  "folder-open": "folder-opened",
  gear: "gear",
  info: "info",
  package: "extensions",
  run: "play",
  search: "search",
  sync: "sync",
  warning: "warning"
};

function productGlyphSvg(glyphName) {
  const codiconName = productCodiconNames[glyphName];
  if (!codiconName) throw new Error(`Missing VS Code codicon mapping for ${glyphName}`);
  const svgPath = path.join(root, "node_modules/@vscode/codicons/src/icons", `${codiconName}.svg`);
  const svg = readFileSync(svgPath, "utf8");
  return svg.replace('fill="currentColor"', 'fill="#000"');
}

async function writeProductIcons() {
  const productTheme = iconManifest.productTheme;
  const glyphDir = path.join(root, "icons/product/svg");
  const outputDir = path.join(root, "icons/product");
  const codepoints = {};

  for (const [glyphName, codepoint] of Object.entries(productTheme.glyphs)) {
    codepoints[glyphName] = Number.parseInt(codepoint, 16);
    writeFileSync(path.join(glyphDir, `${glyphName}.svg`), productGlyphSvg(glyphName));
  }

  const fantasticon = await import("fantasticon");
  const generateFonts = fantasticon.generateFonts ?? fantasticon.default?.generateFonts;
  if (!generateFonts) {
    throw new Error("fantasticon did not expose generateFonts");
  }

  await generateFonts({
    name: productTheme.font,
    inputDir: glyphDir,
    outputDir,
    fontTypes: ["woff"],
    assetTypes: [],
    codepoints,
    fontHeight: 1000,
    normalize: true,
    round: 10e12
  });

  const theme = {
    $schema: "vscode://schemas/product-icon-theme",
    fonts: [
      {
        id: productTheme.font,
        src: [{ path: `./${productTheme.font}.woff`, format: "woff" }],
        weight: "normal",
        style: "normal"
      }
    ],
    iconDefinitions: Object.fromEntries(
      Object.entries(productTheme.iconDefinitions).map(([iconId, glyphName]) => [
        iconId,
        {
          fontCharacter: `\\${productTheme.glyphs[glyphName]}`,
          fontId: productTheme.font
        }
      ])
    )
  };

  writeFileSync(
    path.join(root, "icons/product/gas-plasma-product-icon-theme.json"),
    `${JSON.stringify(theme, null, 2)}\n`
  );
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
    <g font-family="SF Mono, Menlo, Consolas, monospace" font-size="20">
      <g transform="translate(690 248)">
        <rect width="24" height="20" rx="4" fill="#FF8C00" stroke="#FFD2A6"/>
        <path d="M3 4h7l3 4h8" stroke="#FFF0DB" stroke-width="2" opacity=".55"/>
        <text x="36" y="18" fill="#FFD700">src</text>
      </g>
      <g transform="translate(690 288)">
        <rect width="24" height="24" rx="5" fill="#140800" stroke="#E8C547"/>
        <rect x="5" y="5" width="6" height="6" rx="2" fill="#FF4500"/>
        <rect x="13" y="5" width="6" height="6" rx="2" fill="#FFD700"/>
        <rect x="5" y="13" width="6" height="6" rx="2" fill="#8B9A00"/>
        <rect x="13" y="13" width="6" height="6" rx="2" fill="#E8C547"/>
        <text x="36" y="20" fill="#E8C547">themes</text>
      </g>
      <g transform="translate(690 328)">
        <circle cx="12" cy="12" r="11" fill="#E8C547" stroke="#FFD2A6"/>
        <circle cx="12" cy="12" r="4" fill="#140800" stroke="#FFF0DB"/>
        <text x="36" y="20" fill="#FF8C00">assets</text>
      </g>
      <g transform="translate(690 368)">
        <path d="M5 1h12l7 7v22H5z" fill="#FFD2A6" stroke="#FF8C00"/>
        <path d="M17 1v8h7" fill="#4D2600"/>
        <text x="36" y="20" fill="#FFD2A6">README.md</text>
      </g>
      <g transform="translate(690 408)">
        <circle cx="13" cy="17" r="12" fill="#140800" stroke="#FFD2A6"/>
        <path d="M8 21c1-10 3-15 6-15s5 5 6 15c-2 4-4 6-6 6s-4-2-6-6z" fill="#FFD2A6"/>
        <path d="M11 16h6" stroke="#FF8C00" stroke-width="3" stroke-linecap="round"/>
        <text x="36" y="24" fill="#FFF0DB">linux</text>
      </g>
      <g transform="translate(690 448)">
        <circle cx="10" cy="14" r="9" fill="#140800" stroke="#FFD700" stroke-width="3"/>
        <circle cx="18" cy="14" r="9" fill="none" stroke="#FFD2A6" stroke-width="3"/>
        <path d="M8 14h15" stroke="#FF8C00" stroke-width="3" stroke-linecap="round"/>
        <text x="36" y="22" fill="#FFD700">crypto</text>
      </g>
    </g>
    <rect x="870" y="208" width="842" height="506" fill="#1A0A00"/>
    ${editorLines}
    <rect x="870" y="714" width="842" height="132" fill="#100600" stroke="#4D2600"/>
    <text x="905" y="764" fill="#FF8C00" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">$ npm run package</text>
    <text x="905" y="804" fill="#B5CC18" font-family="SF Mono, Menlo, Consolas, monospace" font-size="22">DONE Packaged: jpfchang.gas-plasma-theme-0.1.0.vsix</text>
    <rect x="650" y="846" width="1062" height="48" rx="0" fill="#3A1800"/>
    <text x="690" y="878" fill="#FFF0DB" font-family="SF Mono, Menlo, Consolas, monospace" font-size="18">Open VSX namespace: jpfchang</text>
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

function writeArchitectureSvg() {
  const node = ({ x, y, width = 270, title, body, accent = "#FF8C00" }) => `<g transform="translate(${x} ${y})">
    <rect width="${width}" height="126" rx="10" fill="#140800" stroke="${accent}" stroke-width="2"/>
    <rect x="0" y="0" width="${width}" height="36" rx="10" fill="#261000"/>
    <path d="M0 36h${width}" stroke="#4D2600"/>
    <text x="20" y="25" fill="#FFF0DB" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">${xmlEscape(title)}</text>
    <text x="20" y="66" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="14">${xmlEscape(body[0])}</text>
    <text x="20" y="91" fill="#E8C547" font-family="SF Mono, Menlo, Consolas, monospace" font-size="14">${xmlEscape(body[1])}</text>
  </g>`;
  const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}H${x2 - 18}" fill="none" stroke="#CC7A00" stroke-width="3" stroke-linecap="round"/>
  <path d="M${x2 - 20} ${y2 - 7}l16 7-16 7z" fill="#CC7A00"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="780" viewBox="0 0 1440 780" role="img" aria-labelledby="title desc">
  <title id="title">Gas Plasma build architecture</title>
  <desc id="desc">A diagram showing palette and icon sources flowing through generators into terminal, editor, documentation, and release artifacts.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B0300"/>
      <stop offset=".55" stop-color="#1A0A00"/>
      <stop offset="1" stop-color="#261000"/>
    </linearGradient>
    <filter id="shadow" x="-8%" y="-12%" width="116%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000" flood-opacity=".45"/>
    </filter>
  </defs>
  <rect width="1440" height="780" fill="url(#bg)"/>
  <text x="70" y="82" fill="#FFD2A6" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="900">Gas Plasma Generation Pipeline</text>
  <text x="70" y="122" fill="#FFC887" font-family="Inter, Arial, sans-serif" font-size="19">One palette and icon manifest drive every shipped theme asset, release package, and documentation surface.</text>
  <g filter="url(#shadow)">
    ${node({ x: 70, y: 200, title: "Source Data", body: ["src/palette.json", "src/icon-manifest.json"], accent: "#E8C547" })}
    ${node({ x: 70, y: 396, title: "Upstream Icons", body: ["simple-icons", "@vscode/codicons"], accent: "#FFD700" })}
    ${node({ x: 400, y: 298, title: "Generators", body: ["scripts/build.mjs", "generate-theme.swift"], accent: "#FF8C00" })}
    ${node({ x: 730, y: 146, title: "Terminal Assets", body: ["GasPlasma.terminal", "GasPlasma.itermcolors"], accent: "#B5CC18" })}
    ${node({ x: 730, y: 312, title: "Editor Assets", body: ["themes/*.json", "icons/**/*"], accent: "#FF6B3D" })}
    ${node({ x: 730, y: 478, title: "Documentation", body: ["assets/*.svg/png", "docs/index.html"], accent: "#E8C547" })}
    ${node({ x: 1060, y: 312, title: "Release Channels", body: ["GitHub Releases", "Open VSX VSIX"], accent: "#FFD700" })}
  </g>
  ${arrow(340, 263, 400, 263)}
  ${arrow(340, 459, 400, 459)}
  <path d="M670 361h34c15 0 26-12 26-26v-73" fill="none" stroke="#CC7A00" stroke-width="3" stroke-linecap="round"/>
  <path d="M714 255l16 7-16 7z" fill="#CC7A00"/>
  ${arrow(670, 361, 730, 361)}
  <path d="M670 361h34c15 0 26 12 26 26v210" fill="none" stroke="#CC7A00" stroke-width="3" stroke-linecap="round"/>
  <path d="M714 590l16 7-16 7z" fill="#CC7A00"/>
  ${arrow(1000, 375, 1060, 375)}
  <g transform="translate(70 642)">
    <rect width="1298" height="62" rx="10" fill="#100600" stroke="#4D2600"/>
    <text x="24" y="39" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="18">npm run build -> npm run check -> npm run package -> signed release tag -> Open VSX publish</text>
  </g>
</svg>
`;
  writeFileSync(path.join(root, "assets/architecture.svg"), svg);
  writeFileSync(path.join(root, "docs/assets/architecture.svg"), svg);
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
  const iconGallery = iconManifest.fileTheme.gallery.map((iconName) => {
    const label = iconName.replaceAll("-", " ");
    return `<figure class="icon-sample">
      <img src="assets/icons/${iconName}.svg" alt="">
      <figcaption>${xmlEscape(label)}</figcaption>
    </figure>`;
  }).join("\n          ");
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
    .diagram {
      display: block;
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0D0500;
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
    .section-note { margin-bottom: 22px; }
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
    .icon-strip {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 14px;
    }
    .icon-sample {
      margin: 0;
      min-height: 128px;
      display: grid;
      place-items: center;
      gap: 10px;
      padding: 16px 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(20, 8, 0, .78);
    }
    .icon-sample img {
      width: 72px;
      height: 72px;
      display: block;
    }
    .icon-sample figcaption {
      color: #FFD2A6;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      text-align: center;
      text-transform: uppercase;
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
      .icon-strip { grid-template-columns: repeat(4, 1fr); }
      .palette { grid-template-columns: repeat(4, 1fr); }
    }
    @media (max-width: 560px) {
      .wrap { width: min(100% - 28px, 1180px); }
      .nav { align-items: flex-start; flex-direction: column; }
      h1 { font-size: 44px; }
      .lead { font-size: 18px; }
      .icon-strip { grid-template-columns: repeat(2, 1fr); }
      .palette { grid-template-columns: repeat(2, 1fr); }
      .diagram { min-height: 300px; object-fit: cover; object-position: left center; }
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
      <a href="#icons">Icons</a>
      <a href="#architecture">Architecture</a>
      <a href="#palette">Palette</a>
      <a href="https://open-vsx.org/extension/jpfchang/gas-plasma-theme">Open VSX</a>
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
          <a class="button" href="https://open-vsx.org/extension/jpfchang/gas-plasma-theme">Open VSX</a>
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
            <code class="command">jpfchang.gas-plasma-theme</code>
          </article>
        </div>
      </div>
    </section>
    <section id="icons" class="band">
      <div class="wrap">
        <h2>VS Code Icons</h2>
        <p class="section-note">File icons are generated from recognizable upstream language and ecosystem logo geometry where available. Product icons are generated from VS Code Codicons to preserve the original editor UI language.</p>
        <div class="icon-strip" aria-label="Gas Plasma file icon samples">
          ${iconGallery}
        </div>
      </div>
    </section>
    <section id="architecture" class="band">
      <div class="wrap">
        <h2>Build Architecture</h2>
        <p class="section-note">The release package is generated from one palette, one icon manifest, upstream icon sources, and deterministic build scripts.</p>
        <img class="diagram" src="assets/architecture.svg" alt="Gas Plasma build architecture diagram">
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
writeFileIcons();
await writeProductIcons();
writeLogoSvg();
writeMockupSvg();
writeArchitectureSvg();
writeLogoPng();
writeMockupPng();
writeDocsIndex();

const built = [
  "GasPlasma.itermcolors",
  "themes/gas-plasma-color-theme.json",
  "icons/file/gas-plasma-icon-theme.json",
  "icons/product/gas-plasma-product-icon-theme.json",
  "icons/product/gas-plasma-product-icons.woff",
  "assets/logo.svg",
  "assets/logo.png",
  "assets/architecture.svg",
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
