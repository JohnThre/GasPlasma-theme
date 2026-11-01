#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import * as simpleIcons from "simple-icons";
import { contrastRatio, hexToRgb, mixHex, relativeLuminance } from "./lib/color.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.join(root, "src/palette.json"), "utf8"));
const iconManifest = JSON.parse(readFileSync(path.join(root, "src/icon-manifest.json"), "utf8"));
const themeVariants = Object.values(palette.variants);
const darkVariant = palette.variants.dark;
const lightVariant = palette.variants.light;
const author = "Pengfan Chang <developer@jpfchang.org>";
const authorName = "Pengfan Chang";
const repositoryUrl = pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");

for (const dir of [
  "docs/assets/icons",
  "docs/assets/screenshots",
  "icons/file/svg",
  "icons/file/svg-light",
  "icons/product/svg",
  "zed/gas-plasma-icons/icon_themes",
  "zed/gas-plasma-icons/icons",
  "zed/gas-plasma-theme/themes"
]) {
  rmSync(path.join(root, dir), { recursive: true, force: true });
}
rmSync(path.join(root, "icons/product/gas-plasma-product-icons.json"), { force: true });

const dirs = [
  "themes",
  "assets",
  "docs",
  "docs/assets",
  "docs/assets/icons",
  "docs/assets/icons/light",
  "docs/assets/screenshots",
  "dist",
  "icons",
  "icons/file",
  "icons/file/svg",
  "icons/file/svg-light",
  "icons/product",
  "icons/product/svg",
  "zed",
  "zed/gas-plasma-icons",
  "zed/gas-plasma-icons/icon_themes",
  "zed/gas-plasma-icons/icons",
  "zed/gas-plasma-icons/icons/light",
  "zed/gas-plasma-theme",
  "zed/gas-plasma-theme/themes"
];
for (const dir of dirs) {
  mkdirSync(path.join(root, dir), { recursive: true });
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

function tomlString(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function writeZedExtensionManifest(relativeDir, extension) {
  const content = [
    `id = ${tomlString(extension.id)}`,
    `name = ${tomlString(extension.name)}`,
    `version = ${tomlString(pkg.version)}`,
    "schema_version = 1",
    `authors = [${tomlString(author)}]`,
    `description = ${tomlString(extension.description)}`,
    `repository = ${tomlString(repositoryUrl)}`,
    ""
  ].join("\n");

  const extensionDir = path.join(root, relativeDir);
  writeFileSync(path.join(extensionDir, "extension.toml"), content);
  copyFileSync(path.join(root, "LICENSE"), path.join(extensionDir, "LICENSE"));
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

function variantSlugSuffix(variant) {
  return variant.fileSuffix.toLowerCase();
}

function vscodeThemePath(variant) {
  return `themes/gas-plasma${variantSlugSuffix(variant)}-color-theme.json`;
}

function itermEntries(variant) {
  const { core, ansi: { normal, bright } } = variant;
  return [
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
    ["Background Color", core.background],
    ["Bold Color", core.bold],
    ["Cursor Color", core.cursor],
    ["Cursor Text Color", core.cursorText],
    ["Foreground Color", core.foreground],
    ["Selected Text Color", core.bold],
    ["Selection Color", core.selection, core.selectionAlpha]
  ];
}

function writeItermPlist(fileName, entries) {
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

  writeFileSync(path.join(root, fileName), xml);
}

function writeItermColors(variant) {
  writeItermPlist(`GasPlasma${variant.fileSuffix}.itermcolors`, itermEntries(variant));
}

// iTerm2 3.5+ "Use separate colors for light and dark mode": the preset carries
// "(Dark)" and "(Light)" copies of every key; the plain keys keep older versions on dark.
const autoVariantPairs = [
  { dark: palette.variants.dark, light: palette.variants.light, suffix: "" },
  { dark: palette.variants.colorblind, light: palette.variants.colorblindLight, suffix: "-ColorBlind" }
];

function writeItermAutoColors({ dark: darkSource, light: lightSource, suffix }) {
  const dark = itermEntries(darkSource);
  const light = itermEntries(lightSource);
  writeItermPlist(`GasPlasma${suffix}-Auto.itermcolors`, [
    ...dark,
    ...dark.map(([key, hex, alpha]) => [`${key} (Dark)`, hex, alpha]),
    ...light.map(([key, hex, alpha]) => [`${key} (Light)`, hex, alpha])
  ]);
}

function writeVsCodeTheme(variant) {
  const { core, ui, syntax, semantic, ansi: { normal, bright } } = variant;
  const theme = {
    $schema: "vscode://schemas/color-theme",
    name: variant.name,
    type: variant.appearance,
    semanticHighlighting: true,
    colors: {
      "activityBar.background": ui.raised,
      "activityBar.foreground": core.bold,
      "activityBarBadge.background": ui.accent,
      "activityBarBadge.foreground": ui.onAccent,
      "badge.background": ui.accent,
      "badge.foreground": ui.onAccent,
      "button.background": ui.accent,
      "button.foreground": ui.onAccent,
      "button.hoverBackground": ui.accentHover,
      "dropdown.background": ui.raised,
      "dropdown.border": ui.border,
      "editor.background": core.background,
      "editor.foreground": core.foreground,
      "editor.lineHighlightBackground": ui.active,
      "editor.selectionBackground": hexWithAlpha(core.selection, core.selectionAlpha),
      "editorCursor.foreground": core.cursor,
      "editorIndentGuide.background1": ui.border,
      "editorIndentGuide.activeBackground1": ui.guide,
      "editorLineNumber.foreground": ui.muted,
      "editorLineNumber.activeForeground": ui.focus,
      "editorWhitespace.foreground": ui.border,
      "input.background": ui.raised,
      "input.border": ui.border,
      "input.foreground": core.bold,
      "list.activeSelectionBackground": ui.border,
      "list.activeSelectionForeground": ui.strong,
      "list.hoverBackground": ui.hover,
      "panel.background": ui.deep,
      "panel.border": ui.border,
      "sideBar.background": ui.deep,
      "sideBar.foreground": core.foreground,
      "sideBarSectionHeader.background": ui.raised,
      "statusBar.background": ui.active,
      "statusBar.foreground": ui.strong,
      "tab.activeBackground": core.background,
      "tab.activeForeground": ui.strong,
      "tab.inactiveBackground": ui.raised,
      "tab.inactiveForeground": ui.textMuted,
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
      "titleBar.activeBackground": ui.raised,
      "titleBar.activeForeground": ui.strong,
      // Status colors come from palette.semantic so every variant controls its own
      // color-vision-safe pairs instead of inheriting VS Code's default red/green.
      "gitDecoration.addedResourceForeground": semantic.added,
      "gitDecoration.untrackedResourceForeground": semantic.added,
      "gitDecoration.modifiedResourceForeground": semantic.modified,
      "gitDecoration.stageModifiedResourceForeground": semantic.modified,
      "gitDecoration.deletedResourceForeground": semantic.deleted,
      "gitDecoration.stageDeletedResourceForeground": semantic.deleted,
      "gitDecoration.renamedResourceForeground": semantic.renamed,
      "gitDecoration.conflictingResourceForeground": semantic.conflict,
      "gitDecoration.ignoredResourceForeground": semantic.ignored,
      "editorGutter.addedBackground": semantic.added,
      "editorGutter.modifiedBackground": semantic.modified,
      "editorGutter.deletedBackground": semantic.deleted,
      "minimapGutter.addedBackground": semantic.added,
      "minimapGutter.modifiedBackground": semantic.modified,
      "minimapGutter.deletedBackground": semantic.deleted,
      "editorOverviewRuler.addedForeground": hexWithAlpha(semantic.added, 0.6),
      "editorOverviewRuler.modifiedForeground": hexWithAlpha(semantic.modified, 0.6),
      "editorOverviewRuler.deletedForeground": hexWithAlpha(semantic.deleted, 0.6),
      "editorOverviewRuler.errorForeground": semantic.error,
      "editorOverviewRuler.warningForeground": semantic.warning,
      "editorOverviewRuler.infoForeground": semantic.info,
      "diffEditor.insertedTextBackground": hexWithAlpha(semantic.added, 0.22),
      "diffEditor.removedTextBackground": hexWithAlpha(semantic.deleted, 0.22),
      "diffEditor.insertedLineBackground": hexWithAlpha(semantic.added, 0.12),
      "diffEditor.removedLineBackground": hexWithAlpha(semantic.deleted, 0.12),
      "diffEditorGutter.insertedLineBackground": hexWithAlpha(semantic.added, 0.3),
      "diffEditorGutter.removedLineBackground": hexWithAlpha(semantic.deleted, 0.3),
      "merge.currentHeaderBackground": hexWithAlpha(semantic.added, 0.4),
      "merge.currentContentBackground": hexWithAlpha(semantic.added, 0.16),
      "merge.incomingHeaderBackground": hexWithAlpha(semantic.conflict, 0.4),
      "merge.incomingContentBackground": hexWithAlpha(semantic.conflict, 0.16),
      "editorError.foreground": semantic.error,
      "editorWarning.foreground": semantic.warning,
      "editorInfo.foreground": semantic.info,
      "editorHint.foreground": semantic.hint,
      "problemsErrorIcon.foreground": semantic.error,
      "problemsWarningIcon.foreground": semantic.warning,
      "problemsInfoIcon.foreground": semantic.info,
      "list.errorForeground": semantic.error,
      "list.warningForeground": semantic.warning,
      "testing.iconPassed": semantic.success,
      "testing.iconFailed": semantic.error,
      "testing.iconErrored": semantic.error,
      "testing.iconQueued": semantic.warning,
      "notificationsErrorIcon.foreground": semantic.error,
      "notificationsWarningIcon.foreground": semantic.warning,
      "notificationsInfoIcon.foreground": semantic.info,
      "terminalCommandDecoration.successBackground": semantic.success,
      "terminalCommandDecoration.errorBackground": semantic.error
    },
    tokenColors: [
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: syntax.comment, fontStyle: "italic" } },
      { scope: ["string", "constant.other.symbol"], settings: { foreground: syntax.string } },
      { scope: ["constant.numeric", "constant.language"], settings: { foreground: syntax.constant } },
      { scope: ["keyword", "storage.type", "storage.modifier"], settings: { foreground: syntax.keyword, fontStyle: "bold" } },
      { scope: ["entity.name.function", "support.function"], settings: { foreground: syntax.function } },
      { scope: ["entity.name.type", "support.class", "support.type"], settings: { foreground: syntax.type } },
      { scope: ["variable", "meta.definition.variable.name"], settings: { foreground: syntax.variable } },
      { scope: ["entity.name.tag", "support.constant"], settings: { foreground: syntax.tag } },
      { scope: ["invalid", "invalid.illegal"], settings: { foreground: syntax.invalid, background: ui.invalidBackground } }
    ],
    semanticTokenColors: {
      class: syntax.type,
      enum: syntax.type,
      function: syntax.function,
      interface: syntax.type,
      keyword: syntax.keyword,
      method: syntax.function,
      namespace: syntax.namespace,
      parameter: syntax.variable,
      property: syntax.property,
      string: syntax.string,
      variable: syntax.variable
    }
  };

  writeFileSync(path.join(root, vscodeThemePath(variant)), `${JSON.stringify(theme, null, 2)}\n`);
}

function zedStyle(variant) {
  const { core, ui, syntax, semantic, ansi: { normal, bright } } = variant;
  return {
    accents: [ui.accent, normal.yellow, ui.focus, syntax.type],
    "background.appearance": "opaque",
    background: core.background,
    "surface.background": ui.deep,
    "elevated_surface.background": ui.raised,
    foreground: core.foreground,
    text: core.bold,
    "text.muted": ui.textMuted,
    "text.placeholder": ui.muted,
    "text.disabled": ui.muted,
    "text.accent": ui.focus,
    icon: ui.textMuted,
    "icon.muted": ui.muted,
    "icon.disabled": ui.border,
    "icon.placeholder": ui.muted,
    "icon.accent": ui.focus,
    border: ui.border,
    "border.variant": ui.active,
    "border.disabled": ui.active,
    "border.focused": ui.focus,
    "border.selected": core.foreground,
    "border.transparent": "#00000000",
    "element.background": ui.raised,
    "element.hover": ui.hover,
    "element.active": ui.active,
    "element.selected": ui.border,
    "element.disabled": ui.deep,
    "ghost_element.background": "#00000000",
    "ghost_element.hover": ui.raised,
    "ghost_element.active": ui.active,
    "ghost_element.selected": ui.border,
    "ghost_element.disabled": ui.deep,
    "title_bar.background": ui.raised,
    "title_bar.inactive_background": ui.deep,
    "toolbar.background": ui.raised,
    "tab_bar.background": ui.deep,
    "tab.active_background": core.background,
    "tab.inactive_background": ui.raised,
    "status_bar.background": ui.active,
    "panel.background": ui.deep,
    "panel.focused_border": ui.border,
    "panel.indent_guide": ui.border,
    "panel.indent_guide_active": ui.guide,
    "panel.indent_guide_hover": ui.focus,
    "pane.focused_border": ui.border,
    "pane_group.border": ui.border,
    "editor.background": core.background,
    "editor.foreground": core.foreground,
    "editor.gutter.background": core.background,
    "editor.subheader.background": ui.raised,
    "editor.active_line.background": ui.active,
    "editor.highlighted_line.background": ui.active,
    "editor.line_number": ui.muted,
    "editor.active_line_number": ui.focus,
    "editor.indent_guide": ui.border,
    "editor.indent_guide_active": ui.guide,
    "editor.wrap_guide": ui.border,
    "editor.active_wrap_guide": ui.guide,
    "editor.invisible": ui.border,
    "editor.document_highlight.read_background": hexWithAlpha(normal.yellow, 0.18),
    "editor.document_highlight.write_background": hexWithAlpha(ui.accent, 0.18),
    "editor.document_highlight.bracket_background": hexWithAlpha(ui.focus, 0.18),
    "scrollbar.thumb.background": hexWithAlpha(ui.textMuted, 0.28),
    "scrollbar.thumb.hover_background": hexWithAlpha(ui.focus, 0.38),
    "scrollbar.thumb.border": "#00000000",
    "scrollbar.track.background": "#00000000",
    "scrollbar.track.border": "#00000000",
    "drop_target.background": hexWithAlpha(ui.focus, 0.18),
    "search.match_background": hexWithAlpha(ui.focus, 0.3),
    "link_text.hover": ui.link,
    ...Object.fromEntries(
      [
        ["error", semantic.error, 0.18],
        ["warning", semantic.warning, 0.16],
        ["success", semantic.success, 0.16],
        ["hint", semantic.hint, 0.16],
        ["info", semantic.info, 0.16],
        ["created", semantic.added, 0.16],
        ["modified", semantic.modified, 0.16],
        ["deleted", semantic.deleted, 0.16],
        ["conflict", semantic.conflict, 0.16],
        ["renamed", semantic.renamed, 0.16],
        ["predictive", normal.green, 0.14]
      ].flatMap(([key, color, alpha]) => [
        [key, color],
        [`${key}.background`, hexWithAlpha(color, alpha)],
        [`${key}.border`, color]
      ])
    ),
    ignored: semantic.ignored,
    "version_control.added": semantic.added,
    "version_control.modified": semantic.modified,
    "version_control.deleted": semantic.deleted,
    "version_control.renamed": semantic.renamed,
    "version_control.conflict": semantic.conflict,
    "version_control.ignored": semantic.ignored,
    "version_control.word_added": hexWithAlpha(semantic.added, 0.35),
    "version_control.word_deleted": hexWithAlpha(semantic.deleted, 0.35),
    "version_control.conflict_marker.ours": hexWithAlpha(semantic.added, 0.16),
    "version_control.conflict_marker.theirs": hexWithAlpha(semantic.conflict, 0.16),
    hidden: ui.muted,
    unreachable: ui.muted,
    "terminal.background": core.background,
    "terminal.foreground": core.foreground,
    "terminal.bright_foreground": ui.strong,
    "terminal.dim_foreground": bright.black,
    "terminal.ansi.background": normal.black,
    "terminal.ansi.black": normal.black,
    "terminal.ansi.red": normal.red,
    "terminal.ansi.green": normal.green,
    "terminal.ansi.yellow": normal.yellow,
    "terminal.ansi.blue": normal.blue,
    "terminal.ansi.magenta": normal.magenta,
    "terminal.ansi.cyan": normal.cyan,
    "terminal.ansi.white": normal.white,
    "terminal.ansi.bright_black": bright.black,
    "terminal.ansi.bright_red": bright.red,
    "terminal.ansi.bright_green": bright.green,
    "terminal.ansi.bright_yellow": bright.yellow,
    "terminal.ansi.bright_blue": bright.blue,
    "terminal.ansi.bright_magenta": bright.magenta,
    "terminal.ansi.bright_cyan": bright.cyan,
    "terminal.ansi.bright_white": bright.white,
    players: [
      {
        background: core.background,
        cursor: core.cursor,
        selection: hexWithAlpha(core.selection, core.selectionAlpha)
      }
    ],
    syntax: {
      attribute: { color: syntax.type },
      comment: { color: syntax.comment, font_style: "italic" },
      constant: { color: syntax.constant },
      constructor: { color: syntax.type },
      embedded: { color: syntax.type },
      function: { color: syntax.function },
      keyword: { color: syntax.keyword, font_weight: 700 },
      number: { color: syntax.constant },
      operator: { color: syntax.keyword },
      property: { color: syntax.property },
      punctuation: { color: syntax.punctuation },
      string: { color: syntax.string },
      "string.escape": { color: syntax.constant },
      tag: { color: syntax.tag },
      type: { color: syntax.type },
      variable: { color: syntax.variable },
      "variable.special": { color: syntax.constant }
    }
  };
}

function writeZedTheme() {
  const themeFamily = {
    $schema: "https://zed.dev/schema/themes/v0.2.0.json",
    name: palette.name,
    author: authorName,
    themes: themeVariants.map((variant) => ({
      name: variant.name,
      appearance: variant.appearance,
      style: zedStyle(variant)
    }))
  };

  writeZedExtensionManifest("zed/gas-plasma-theme", {
    id: "gas-plasma-theme",
    name: "Gas Plasma Theme",
    description: palette.description
  });
  writeFileSync(
    path.join(root, "zed/gas-plasma-theme/themes/gas-plasma.json"),
    `${JSON.stringify(themeFamily, null, 2)}\n`
  );
}

function iconDefName(iconName) {
  return `_gp_${iconName.replaceAll("-", "_")}`;
}

function mapIconAssociations(values = {}, suffix = "") {
  return Object.fromEntries(
    Object.entries(values).map(([key, iconName]) => [key, iconDefName(iconName) + suffix])
  );
}

function mapFolderAssociations(values = {}, open = false, suffix = "") {
  return Object.fromEntries(
    Object.entries(values).map(([folderName, emblem]) => [folderName, iconDefName(folderIconName(emblem, open)) + suffix])
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
    <!--glyph-->${inner}<!--/glyph-->
  </g>`;
}

function languageText(label, x, y, size, fill = "#FFD2A6", weight = 900) {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Inter, SF Pro Display, Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${xmlEscape(label)}</text>`;
}

// Icons sit on near-black (#140800) tiles; lift brand colors that would vanish there
// toward the theme's peach so every mark keeps at least ~3.5:1 contrast.
const minIconLuminance = 0.14;
const iconLiftColor = "#FFD2A6";

function liftForDarkTile(hex, fallback = iconLiftColor) {
  if (relativeLuminance(hex) >= minIconLuminance) return hex.toUpperCase();
  const { r, g, b } = hexToRgb(hex);
  if (Math.max(r, g, b) - Math.min(r, g, b) < 24) return fallback;
  for (let amount = 0.05; amount < 1; amount += 0.05) {
    const lifted = mixHex(hex, iconLiftColor, amount);
    if (relativeLuminance(lifted) >= minIconLuminance) return lifted;
  }
  return fallback;
}

function rgbToHsl({ r, g, b }) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d) + (gn < bn ? 6 : 0);
  else if (max === gn) h = ((bn - rn) / d) + 2;
  else h = ((rn - gn) / d) + 4;
  return { h: h / 6, s, l };
}

function hslToHex({ h, s, l }) {
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + ((q - p) * 6 * t);
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + ((q - p) * ((2 / 3) - t) * 6);
    return p;
  };
  let r = l;
  let g = l;
  let b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
    const p = (2 * l) - q;
    r = hue(p, q, h + (1 / 3));
    g = hue(p, q, h);
    b = hue(p, q, h - (1 / 3));
  }
  const channel = (value) => Math.round(value * 255).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

// Light variants of generated artwork: the warm near-black/peach neutrals are mirrored
// in lightness (dark tiles become cream, peach strokes become deep brown) while
// mid-tone accents and brand colors keep their hue and are only deepened toward
// brown until they reach `minContrast` against the light tile.
const lightTileColor = "#FFF3E6";
const lightDeepenColor = "#5C2400";
const lightShadow = { color: "#5C2400", opacity: ".2" };

function deepenForLightTile(hex, minContrast = 3) {
  if (contrastRatio(hex, lightTileColor) >= minContrast) return hex.toUpperCase();
  for (let amount = 0.05; amount < 1; amount += 0.05) {
    const deepened = mixHex(hex, lightDeepenColor, amount);
    if (contrastRatio(deepened, lightTileColor) >= minContrast) return deepened;
  }
  return lightDeepenColor;
}

function lightCounterpart(hex, minContrast = 3) {
  const hsl = rgbToHsl(hexToRgb(hex));
  if (hsl.l < 0.25) return hslToHex({ ...hsl, l: 1 - hsl.l });
  if (hsl.l > 0.78) return hslToHex({ ...hsl, l: Math.max(1 - hsl.l, 0.12) });
  return deepenForLightTile(hex, minContrast);
}

function toLightSvg(svg, { minContrast = 3 } = {}) {
  const cache = new Map();
  return svg
    .replace(/#[0-9A-Fa-f]{6}\b/g, (hex) => {
      const key = hex.toUpperCase();
      if (!cache.has(key)) cache.set(key, lightCounterpart(key, minContrast));
      return cache.get(key);
    })
    .replace(/flood-color="[^"]*" flood-opacity="[^"]*"/g, `flood-color="${lightShadow.color}" flood-opacity="${lightShadow.opacity}"`);
}

function simpleIconColor(icon, fallback = iconLiftColor) {
  if (!icon?.hex) return fallback;
  return liftForDarkTile(`#${icon.hex}`, fallback);
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

function badgeLabelSize(label, max = 40) {
  const sizes = [40, 40, 32, 25, 20, 16];
  return Math.min(max, sizes[Math.min(label.length, sizes.length - 1)]);
}

// Framed badges: dark tile, bold label, solid accent band carrying a small kind motif.
const badgeBandMotifs = {
  bars: `<path d="M34 69h8M44 69h8M54 69h8" stroke="#140800" stroke-width="3.4" stroke-linecap="round"/>`,
  split: `<path d="M48 63v12" stroke="#140800" stroke-width="3.4" stroke-linecap="round"/>`,
  steam: `<path d="M38 72c-2-3 3-4 1-7M48 72c-2-3 3-4 1-7M58 72c-2-3 3-4 1-7" fill="none" stroke="#140800" stroke-width="2.6" stroke-linecap="round"/>`,
  snake: `<path d="M33 69c5-5 10 5 15 0s10 5 15 0" fill="none" stroke="#140800" stroke-width="3" stroke-linecap="round"/>`,
  terminal: `<path d="M34 65l5 4-5 4M44 73h10" fill="none" stroke="#140800" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  wave: `<path d="M31 70c4-6 8-6 11 0s8 6 11 0 8-6 11 0" fill="none" stroke="#140800" stroke-width="3" stroke-linecap="round"/>`,
  mono: ""
};

function languageBadge(label, accent = "#E8C547", kind = "mono") {
  accent = liftForDarkTile(accent);
  const size = badgeLabelSize(label);
  const centerLabel = languageText(label, 48, 49 + (size * 0.36), size);

  if (kind in badgeBandMotifs) {
    const bandLabelSize = badgeLabelSize(label, 30);
    return `<g filter="url(#shadow)">
    <rect x="17" y="17" width="62" height="62" rx="14" fill="url(#tile)" stroke="${accent}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M19 61h58v4c0 7-5 12-12 12H31c-7 0-12-5-12-12z" fill="${accent}"/>
    <path d="M27 24c11-4 31-4 42 0" fill="none" stroke="#FFF0DB" stroke-width="3" stroke-linecap="round" opacity=".32"/>
    ${languageText(label, 48, 41 + (bandLabelSize * 0.36), bandLabelSize)}
    ${badgeBandMotifs[kind]}
  </g>`;
  }

  let inner;
  switch (kind) {
    case "hex":
      inner = `<path d="M48 13l32 18.5v35L48 85 16 66.5v-35z" fill="url(#tile)" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
    ${centerLabel}`;
      break;
    case "gear":
      inner = `<circle cx="48" cy="48" r="27" fill="url(#tile)" stroke="${accent}" stroke-width="5"/>
    <path d="M48 13v8M48 75v8M13 48h8M75 48h8M23 23l6 6M67 67l6 6M73 23l-6 6M29 67l-6 6" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
    ${centerLabel}`;
      break;
    case "gem":
      inner = `<path d="M48 15l31 20-31 47-31-47z" fill="url(#tile)" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M19 35h58" stroke="${accent}" stroke-width="3" opacity=".6"/>
    ${languageText(label, 48, 54 + (Math.min(size, 25) * 0.36), Math.min(size, 25))}`;
      break;
    case "lambda":
      inner = `<rect x="16" y="16" width="64" height="64" rx="32" fill="url(#tile)" stroke="${accent}" stroke-width="5"/>
    <path d="M35 69l13-38 13 38M43 54h16" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".42"/>
    ${centerLabel}`;
      break;
    case "orbit":
      inner = `<circle cx="48" cy="48" r="27" fill="url(#tile)" stroke="${accent}" stroke-width="5"/>
    <path d="M15 51c15-23 47-29 64-12M81 45c-15 24-47 30-64 13" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity=".5"/>
    ${centerLabel}`;
      break;
    case "flame":
      inner = `<path d="M33 72c-13-19 2-31 9-52 15 10 27 24 23 42-3 13-13 20-24 18 5-6 7-13 2-21-3 7-7 11-10 13z" fill="url(#tile)" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
    ${centerLabel}`;
      break;
    case "pill":
      inner = `<rect x="12" y="27" width="72" height="42" rx="21" fill="url(#tile)" stroke="${accent}" stroke-width="5"/>
    ${centerLabel}`;
      break;
    case "dart":
      inner = `<path d="M20 20h35l21 21v35H40L19 55z" fill="url(#tile)" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
    ${centerLabel}`;
      break;
    case "shield":
      inner = `<path d="M20 15h56l-5 56-23 12-23-12z" fill="url(#tile)" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
    ${centerLabel}`;
      break;
    case "square":
    default:
      inner = `<rect x="16" y="16" width="64" height="64" rx="12" fill="url(#tile)" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
    ${centerLabel}`;
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
    <path d="M18 31l30 16 30-16M48 47v35" fill="none" stroke="#FF8C00" stroke-width="3.5" stroke-linejoin="round"/>
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
  racket: ["RKT", "#9F1D20", "lambda"],
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
  css: [simpleIcons.siCss, { fill: "#2D8FD8" }],
  d: [simpleIcons.siD],
  dart: [simpleIcons.siDart],
  ejs: [simpleIcons.siEjs],
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
  lisp: [simpleIcons.siCommonlisp],
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
  racket: [simpleIcons.siRacket],
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

// Ecosystem and tooling logos (Simple Icons geometry, colors lifted for the dark tile).
const ecosystemIcons = {
  angular: [simpleIcons.siAngular, { fill: "#E23237" }],
  ansible: [simpleIcons.siAnsible],
  babel: [simpleIcons.siBabel],
  bazel: [simpleIcons.siBazel],
  biome: [simpleIcons.siBiome],
  bun: [simpleIcons.siBun, { fill: "#FBF0DF" }],
  cloudflare: [simpleIcons.siCloudflare],
  cuda: [simpleIcons.siNvidia, { fill: "#76B900" }],
  cypress: [simpleIcons.siCypress],
  deno: [simpleIcons.siDeno],
  editorconfig: [simpleIcons.siEditorconfig],
  eslint: [simpleIcons.siEslint],
  githubactions: [simpleIcons.siGithubactions],
  gitlab: [simpleIcons.siGitlab],
  gleam: [simpleIcons.siGleam],
  gradle: [simpleIcons.siGradle, { fill: "#5CB8C9" }],
  haxe: [simpleIcons.siHaxe],
  helm: [simpleIcons.siHelm],
  jenkins: [simpleIcons.siJenkins],
  jest: [simpleIcons.siJest],
  jupyter: [simpleIcons.siJupyter],
  kubernetes: [simpleIcons.siKubernetes],
  less: [simpleIcons.siLess, { fill: "#5B8BD0" }],
  maven: [simpleIcons.siApachemaven],
  netlify: [simpleIcons.siNetlify],
  nextjs: [simpleIcons.siNextdotjs],
  nginx: [simpleIcons.siNginx],
  nodejs: [simpleIcons.siNodedotjs],
  nuxt: [simpleIcons.siNuxt],
  pnpm: [simpleIcons.siPnpm],
  poetry: [simpleIcons.siPoetry],
  postcss: [simpleIcons.siPostcss],
  prettier: [simpleIcons.siPrettier],
  prisma: [simpleIcons.siPrisma, { fill: "#A0AEC0" }],
  pytest: [simpleIcons.siPytest],
  react: [simpleIcons.siReact],
  rollup: [simpleIcons.siRollupdotjs],
  ruff: [simpleIcons.siRuff],
  sass: [simpleIcons.siSass],
  solidity: [simpleIcons.siSolidity],
  storybook: [simpleIcons.siStorybook],
  stylus: [simpleIcons.siStylus],
  tailwind: [simpleIcons.siTailwindcss],
  typst: [simpleIcons.siTypst],
  uv: [simpleIcons.siUv],
  vercel: [simpleIcons.siVercel],
  vite: [simpleIcons.siVite, { fill: "#BD34FE" }],
  vitest: [simpleIcons.siVitest, { fill: "#FCC72B" }],
  webpack: [simpleIcons.siWebpack],
  xml: [simpleIcons.siXml],
  yarn: [simpleIcons.siYarn]
};

for (const [iconName, [icon, options]] of Object.entries(ecosystemIcons)) {
  fileIconRenderers[iconName] = () => simpleIconFileSvg(`Gas Plasma ${icon.title} icon`, icon, options);
}

// Generic file kinds drawn in the house glass-tile style.
Object.assign(fileIconRenderers, {
  api: () => fileIconSvg("Gas Plasma API icon", glassTile(`<path d="M30 40h32M54 32l8 8-8 8" fill="none" stroke="#FFD2A6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M66 56H34M42 48l-8 8 8 8" fill="none" stroke="#FF8C00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`, "#FF4500")),
  binary: () => fileIconSvg("Gas Plasma binary icon", glassTile(`<rect x="27" y="28" width="42" height="38" rx="6" fill="#140800" stroke="#4D2600" stroke-width="2"/>
    <text x="48" y="45" text-anchor="middle" font-family="SF Mono, Menlo, Consolas, monospace" font-size="14" font-weight="800" fill="#FFD2A6">0101</text>
    <text x="48" y="61" text-anchor="middle" font-family="SF Mono, Menlo, Consolas, monospace" font-size="14" font-weight="800" fill="#FF8C00">1010</text>`, "#FF6B6B")),
  certificate: () => fileIconSvg("Gas Plasma certificate icon", glassTile(`<rect x="27" y="28" width="42" height="28" rx="4" fill="#FFD2A6" stroke="#4D2600" stroke-width="2"/>
    <path d="M33 36h22M33 43h16" stroke="#4D2600" stroke-width="3" stroke-linecap="round"/>
    <path d="M53 58l-4 13 7-4 7 4-4-13" fill="#FF8C00" stroke="#4D2600" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="56" cy="53" r="8" fill="#FFD700" stroke="#4D2600" stroke-width="2.5"/>`, "#FFD700")),
  component: () => fileIconSvg("Gas Plasma component icon", glassTile(`<rect x="28" y="28" width="17" height="17" rx="4" fill="#FF8C00"/>
    <rect x="51" y="28" width="17" height="17" rx="4" fill="#FFD2A6"/>
    <rect x="28" y="51" width="17" height="17" rx="4" fill="#FFD2A6"/>
    <rect x="51" y="51" width="17" height="17" rx="4" fill="#FFD700" transform="rotate(45 59.5 59.5)"/>`, "#FF8C00")),
  diff: () => fileIconSvg("Gas Plasma diff icon", glassTile(`<path d="M30 37h14M37 30v14" stroke="#B5CC18" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 37h14" stroke="#FFD2A6" stroke-width="4" stroke-linecap="round" opacity=".55"/>
    <path d="M30 60h14" stroke="#FF6B6B" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 60h14" stroke="#FFD2A6" stroke-width="4" stroke-linecap="round" opacity=".55"/>`, "#FFD700")),
  env: () => fileIconSvg("Gas Plasma environment icon", glassTile(`<text x="37" y="61" text-anchor="middle" font-family="SF Mono, Menlo, Consolas, monospace" font-size="30" font-weight="900" fill="#FFD700">$</text>
    <path d="M51 42h15M51 54h15" stroke="#FFD2A6" stroke-width="4.5" stroke-linecap="round"/>`, "#E8C547")),
  http: () => fileIconSvg("Gas Plasma HTTP request icon", glassTile(`<circle cx="48" cy="47" r="19" fill="#140800" stroke="#FFD2A6" stroke-width="3.5"/>
    <path d="M29 47h38M48 28c-7 6-7 32 0 38M48 28c7 6 7 32 0 38" fill="none" stroke="#FF8C00" stroke-width="3"/>`, "#FF8C00")),
  layout: () => fileIconSvg("Gas Plasma layout icon", glassTile(`<rect x="27" y="28" width="42" height="38" rx="5" fill="#140800" stroke="#FFD2A6" stroke-width="3.5"/>
    <path d="M27 38h42M41 38v28" stroke="#FFD2A6" stroke-width="3"/>
    <path d="M48 47h14M48 55h10" stroke="#FF8C00" stroke-width="3.5" stroke-linecap="round"/>`, "#E8C547")),
  locale: () => fileIconSvg("Gas Plasma locale icon", glassTile(`<circle cx="48" cy="47" r="19" fill="#140800" stroke="#FFD2A6" stroke-width="3.5"/>
    <ellipse cx="48" cy="47" rx="8" ry="19" fill="none" stroke="#E8C547" stroke-width="3"/>
    <path d="M31 39h34M31 55h34" stroke="#E8C547" stroke-width="3"/>`, "#E8C547")),
  log: () => fileIconSvg("Gas Plasma log icon", glassTile(`<rect x="28" y="31" width="6" height="5" rx="1.5" fill="#FF8C00"/>
    <rect x="28" y="44" width="6" height="5" rx="1.5" fill="#FFD700"/>
    <rect x="28" y="57" width="6" height="5" rx="1.5" fill="#FF6B6B"/>
    <path d="M40 33.5h26M40 46.5h20M40 59.5h24" stroke="#FFD2A6" stroke-width="4" stroke-linecap="round"/>`, "#FFD2A6")),
  model3d: () => fileIconSvg("Gas Plasma 3D model icon", glassTile(`<path d="M48 27l19 11v22L48 71 29 60V38z" fill="#140800" stroke="#FFD2A6" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M29 38l19 11 19-11M48 49v22" fill="none" stroke="#FF8C00" stroke-width="3" stroke-linejoin="round"/>`, "#E8C547")),
  notebook: () => fileIconSvg("Gas Plasma notebook icon", glassTile(`<rect x="31" y="26" width="36" height="44" rx="5" fill="#140800" stroke="#FFD2A6" stroke-width="3.5"/>
    <path d="M27 34h8M27 46h8M27 58h8" stroke="#FFD2A6" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="40" y="33" width="20" height="10" rx="2" fill="#FF8C00"/>
    <rect x="40" y="49" width="20" height="10" rx="2" fill="#E8C547" opacity=".85"/>`, "#F37626")),
  plugin: () => fileIconSvg("Gas Plasma plugin icon", glassTile(`<path d="M41 27v10M55 27v10" stroke="#FFD2A6" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 37h28v9c0 8-6 14-14 14s-14-6-14-14z" fill="#140800" stroke="#FFD2A6" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M48 60v9" stroke="#FF8C00" stroke-width="5" stroke-linecap="round"/>`, "#FFD700")),
  shader: () => fileIconSvg("Gas Plasma shader icon", glassTile(`<path d="M48 27l21 38H27z" fill="url(#ember)" stroke="#FFD2A6" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="48" cy="52" r="6" fill="#140800" opacity=".55"/>`, "#FF6B6B")),
  slides: () => fileIconSvg("Gas Plasma slides icon", glassTile(`<rect x="26" y="28" width="44" height="30" rx="4" fill="#140800" stroke="#FFD2A6" stroke-width="3.5"/>
    <path d="M36 51V43M45 51V37M54 51V46" stroke="#FF8C00" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 58v8M40 68h16" stroke="#FFD2A6" stroke-width="3.5" stroke-linecap="round"/>`, "#FF8C00")),
  spreadsheet: () => fileIconSvg("Gas Plasma spreadsheet icon", glassTile(`<rect x="27" y="28" width="42" height="38" rx="5" fill="#140800" stroke="#FFD2A6" stroke-width="3.5"/>
    <path d="M27 38h42" stroke="#B5CC18" stroke-width="6"/>
    <path d="M27 50h42M41 32v34M55 32v34" stroke="#FFD2A6" stroke-width="2.5" opacity=".7"/>`, "#B5CC18")),
  test: () => fileIconSvg("Gas Plasma test icon", glassTile(`<path d="M41 27h14M43 27v14L31 62c-2 4 0 7 4 7h26c4 0 6-3 4-7L53 41V27" fill="#140800" stroke="#FFD2A6" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M36 55h24l5 8c1 3 0 5-3 5H34c-3 0-4-2-3-5z" fill="#B5CC18"/>
    <circle cx="45" cy="47" r="2.5" fill="#FF8C00"/>`, "#B5CC18")),
  tool: () => fileIconSvg("Gas Plasma tool icon", glassTile(`<path d="M62 29a11 11 0 0 0-13 14L31 61a4.5 4.5 0 0 0 6.5 6.5L55.5 49.5A11 11 0 0 0 69 36l-7 7-7-2-2-7z" fill="#FFD2A6" stroke="#4D2600" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="35" cy="63.5" r="2" fill="#FF8C00"/>`, "#E8C547"))
});

// Named folders: the generic folder silhouette with the mapped icon set into its front panel.
function folderShape(open) {
  return open
    ? `<g filter="url(#shadow)">
    <path d="M12 29c0-6 4-10 10-10h17l7 8h29c6 0 10 4 10 10v11H12z" fill="#6E2E00" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M11 43h75L76 80H20z" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
  </g>`
    : `<g filter="url(#shadow)">
    <path d="M12 29c0-6 4-10 10-10h17l7 8h29c6 0 10 4 10 10v10H12z" fill="#6E2E00" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M13 36h70L75 80H20z" fill="url(#tile)" stroke="#FFD2A6" stroke-width="2" stroke-linejoin="round"/>
  </g>`;
}

function iconEmblem(iconName) {
  const render = fileIconRenderers[iconName];
  if (!render) throw new Error(`Missing file icon renderer for folder emblem ${iconName}`);
  const svg = render();
  const glyph = /<!--glyph-->([\s\S]*?)<!--\/glyph-->/.exec(svg);
  if (glyph) return { body: glyph[1], span: 44 };
  const body = /<\/defs>\n([\s\S]*)<\/svg>\s*$/.exec(svg);
  if (!body) throw new Error(`Cannot extract folder emblem body for ${iconName}`);
  return { body: body[1], span: 70 };
}

function folderIconName(emblem, open) {
  return `folder-${emblem}${open ? "-open" : ""}`;
}

function folderIconSvg(emblem, open) {
  const { body, span } = iconEmblem(emblem);
  const size = open ? 36 : 40;
  const [cx, cy] = open ? [48.5, 62] : [48, 58.5];
  const scale = (size / span).toFixed(4);
  return fileIconSvg(`Gas Plasma ${emblem} ${open ? "open " : ""}folder icon`, `${folderShape(open)}
  <g transform="translate(${cx} ${cy}) scale(${scale}) translate(-48 -48)">
  ${body.trim()}
  </g>`);
}

function writeFileIcons() {
  const fileTheme = iconManifest.fileTheme;
  const fileIconNames = new Set([
    ...Object.values(fileTheme.icons),
    ...Object.values(fileTheme.fileExtensions),
    ...Object.values(fileTheme.fileNames),
    ...Object.values(fileTheme.languageIds)
  ]);
  // folderNames values are emblem keys; each yields a closed and an open folder icon.
  const folderRenderers = new Map();
  for (const emblem of new Set(Object.values(fileTheme.folderNames))) {
    for (const open of [false, true]) {
      folderRenderers.set(folderIconName(emblem, open), () => folderIconSvg(emblem, open));
    }
  }
  const iconNames = new Set([...fileIconNames, ...folderRenderers.keys()]);
  const definitionNames = new Map();
  for (const iconName of iconNames) {
    const definition = iconDefName(iconName);
    if (definitionNames.has(definition)) {
      throw new Error(`Icon definition ${definition} is shared by ${definitionNames.get(definition)} and ${iconName}`);
    }
    definitionNames.set(definition, iconName);
  }
  for (const iconName of fileTheme.gallery) {
    if (!iconNames.has(iconName)) throw new Error(`Gallery icon ${iconName} is not generated`);
  }
  const iconDir = path.join(root, "icons/file/svg");
  const lightIconDir = path.join(root, "icons/file/svg-light");
  const docsIconDir = path.join(root, "docs/assets/icons");
  const docsLightIconDir = path.join(root, "docs/assets/icons/light");
  const zedIconDir = path.join(root, "zed/gas-plasma-icons/icons");
  const zedLightIconDir = path.join(root, "zed/gas-plasma-icons/icons/light");

  for (const iconName of [...iconNames].sort()) {
    const render = folderRenderers.get(iconName) ?? fileIconRenderers[iconName];
    if (!render) throw new Error(`Missing file icon renderer for ${iconName}`);
    const svg = render();
    const lightSvg = toLightSvg(svg);
    writeFileSync(path.join(iconDir, `${iconName}.svg`), svg);
    writeFileSync(path.join(lightIconDir, `${iconName}.svg`), lightSvg);
    writeFileSync(path.join(zedIconDir, `${iconName}.svg`), svg);
    writeFileSync(path.join(zedLightIconDir, `${iconName}.svg`), lightSvg);
    if (fileTheme.gallery.includes(iconName)) {
      writeFileSync(path.join(docsIconDir, `${iconName}.svg`), svg);
      writeFileSync(path.join(docsLightIconDir, `${iconName}.svg`), lightSvg);
    }
  }

  // VS Code swaps to the `light` associations whenever a light color theme is active,
  // so one icon theme follows Light, Dark, and auto-detected color schemes.
  const associations = (suffix) => ({
    file: iconDefName(fileTheme.icons.file) + suffix,
    folder: iconDefName(fileTheme.icons.folder) + suffix,
    folderExpanded: iconDefName(fileTheme.icons.folderExpanded) + suffix,
    rootFolder: iconDefName(fileTheme.icons.rootFolder) + suffix,
    rootFolderExpanded: iconDefName(fileTheme.icons.rootFolderExpanded) + suffix,
    fileExtensions: mapIconAssociations(fileTheme.fileExtensions, suffix),
    fileNames: mapIconAssociations(fileTheme.fileNames, suffix),
    folderNames: mapFolderAssociations(fileTheme.folderNames, false, suffix),
    folderNamesExpanded: mapFolderAssociations(fileTheme.folderNames, true, suffix),
    languageIds: mapIconAssociations(fileTheme.languageIds, suffix)
  });
  const sortedIconNames = [...iconNames].sort();
  const theme = {
    $schema: "vscode://schemas/icon-theme",
    hidesExplorerArrows: false,
    showLanguageModeIcons: true,
    iconDefinitions: Object.fromEntries([
      ...sortedIconNames.map((iconName) => [iconDefName(iconName), { iconPath: `./svg/${iconName}.svg` }]),
      ...sortedIconNames.map((iconName) => [`${iconDefName(iconName)}_light`, { iconPath: `./svg-light/${iconName}.svg` }])
    ]),
    ...associations(""),
    light: associations("_light")
  };

  writeFileSync(
    path.join(root, "icons/file/gas-plasma-icon-theme.json"),
    `${JSON.stringify(theme, null, 2)}\n`
  );

  const zedIconTheme = (name, appearance, dir) => ({
    name,
    appearance,
    directory_icons: {
      collapsed: `${dir}/${fileTheme.icons.folder}.svg`,
      expanded: `${dir}/${fileTheme.icons.folderExpanded}.svg`
    },
    named_directory_icons: Object.fromEntries(
      Object.entries(fileTheme.folderNames).map(([folderName, iconName]) => [
        folderName,
        {
          collapsed: `${dir}/${folderIconName(iconName, false)}.svg`,
          expanded: `${dir}/${folderIconName(iconName, true)}.svg`
        }
      ])
    ),
    // Zed looks the whole file name up in stems and suffixes before trying each
    // dotted suffix, and only then falls back to the part before the first dot.
    // Dotted names therefore go in by full name; only extensionless names are stems,
    // so `main.tf` can no longer claim `main.foo` through a `main` stem.
    file_stems: Object.fromEntries(
      Object.entries(fileTheme.fileNames).filter(([fileName]) => !fileName.includes("."))
    ),
    file_suffixes: {
      ...fileTheme.fileExtensions,
      ...Object.fromEntries(
        Object.entries(fileTheme.fileNames).filter(([fileName]) => fileName.includes("."))
      )
    },
    file_icons: {
      default: { path: `${dir}/${fileTheme.icons.file}.svg` },
      ...Object.fromEntries(
        [...fileIconNames].sort().map((iconName) => [
          iconName,
          { path: `${dir}/${iconName}.svg` }
        ])
      )
    }
  });

  const zedTheme = {
    $schema: "https://zed.dev/schema/icon_themes/v0.3.0.json",
    name: fileTheme.label,
    author: authorName,
    themes: [
      zedIconTheme(fileTheme.label, "dark", "./icons"),
      zedIconTheme(`${fileTheme.label} Light`, "light", "./icons/light")
    ]
  };

  writeZedExtensionManifest("zed/gas-plasma-icons", {
    id: "gas-plasma-icons",
    name: fileTheme.label,
    description: "Orange-dominant file icons inspired by the Gas Plasma palette."
  });
  writeFileSync(
    path.join(root, "zed/gas-plasma-icons/icon_themes/gas-plasma-icons.json"),
    `${JSON.stringify(zedTheme, null, 2)}\n`
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
  warning: "warning",
  account: "account",
  add: "add",
  bell: "bell",
  breakpoint: "circle-filled",
  bug: "bug",
  "chevron-down": "chevron-down",
  "chevron-right": "chevron-right",
  cloud: "cloud",
  copy: "copy",
  debug: "debug-alt",
  diff: "diff",
  edit: "edit",
  ellipsis: "ellipsis",
  filter: "filter",
  history: "history",
  list: "list-flat",
  lock: "lock",
  merge: "git-merge",
  output: "output",
  pin: "pinned",
  refresh: "refresh",
  split: "split-horizontal",
  stop: "debug-stop",
  trash: "trash",
  tree: "list-tree"
};

function productGlyphSvg(glyphName) {
  const codiconName = productCodiconNames[glyphName];
  if (!codiconName) throw new Error(`Missing VS Code codicon mapping for ${glyphName}`);
  const svgPath = path.join(root, "node_modules/@vscode/codicons/src/icons", `${codiconName}.svg`);
  if (!existsSync(svgPath)) throw new Error(`Missing VS Code codicon ${codiconName} for ${glyphName}`);
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

// The preview mockups are drawn straight from each palette variant, so the dark,
// light, and color-blind images always show the exact theme colors. Status is
// double-coded with letters and shapes (M/A/D, PASS/FAIL, circle/triangle) so the
// picture reads without relying on hue alone.
const mockupFont = "SF Mono, Menlo, Consolas, monospace";
const mockupCharWidth = 0.6;

function renderIconByName(iconName) {
  if (fileIconRenderers[iconName]) return fileIconRenderers[iconName]();
  const folder = /^folder-(.+?)(-open)?$/.exec(iconName);
  if (folder) return folderIconSvg(folder[1], Boolean(folder[2]));
  throw new Error(`Missing file icon renderer for mockup icon ${iconName}`);
}

let mockupIconCount = 0;
function mockupIcon(iconName, x, y, size, light) {
  const prefix = `i${mockupIconCount += 1}-`;
  const svg = light ? toLightSvg(renderIconByName(iconName)) : renderIconByName(iconName);
  return svg
    .trim()
    .replace(/^<svg [^>]*>/, `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 96 96">`)
    .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
}

function mockupText(x, y, parts, { size = 22, weight, anchor } = {}) {
  const spans = (Array.isArray(parts) ? parts : [parts])
    .map(([text, color, extra = ""]) => `<tspan fill="${color}"${extra}>${xmlEscape(text)}</tspan>`)
    .join("");
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${mockupFont}"`,
    `font-size="${size}"`,
    weight ? `font-weight="${weight}"` : "",
    anchor ? `text-anchor="${anchor}"` : "",
    `xml:space="preserve"`
  ].filter(Boolean).join(" ");
  return `<text ${attrs}>${spans}</text>`;
}

function squiggle(x, y, width, color) {
  const step = 5;
  let d = `M${x} ${y}`;
  for (let offset = step, up = true; offset <= width; offset += step, up = !up) {
    d += `L${(x + offset).toFixed(1)} ${up ? y - 3 : y}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
}

function mockupSvg(variant, { label, light }) {
  const { core, ui, syntax, semantic, ansi: { normal, bright } } = variant;
  const shadow = light ? lightShadow : { color: "#000000", opacity: ".55" };
  const mono = (size) => size * mockupCharWidth;

  // Terminal window: git status, a test run, and the full 16-color ANSI ramp.
  const term = { x: 88, y: 232, w: 604, h: 600 };
  const prompt = (y, command) => mockupText(term.x + 30, y, [
    ["~/gas-plasma", syntax.function],
    [" main", normal.magenta],
    [" $ ", ui.strong],
    [command, core.foreground]
  ], { size: 21 });
  const terminalLines = [
    prompt(term.y + 96, "git status --short"),
    mockupText(term.x + 30, term.y + 130, [["A ", normal.green, ' font-weight="700"'], [" src/palette.json", core.foreground]], { size: 21 }),
    mockupText(term.x + 30, term.y + 162, [[" M", normal.red, ' font-weight="700"'], [" src/theme.ts", core.foreground]], { size: 21 }),
    mockupText(term.x + 30, term.y + 194, [[" D", normal.red, ' font-weight="700"'], [" legacy/old-theme.ts", core.foreground]], { size: 21 }),
    mockupText(term.x + 30, term.y + 226, [["??", normal.red, ' font-weight="700"'], [" docs/notes.md", core.foreground]], { size: 21 }),
    prompt(term.y + 276, "npm test"),
    mockupText(term.x + 30, term.y + 310, [[" PASS ", core.background, ""], ["  palette contrast", core.foreground]], { size: 21 }),
    mockupText(term.x + 30, term.y + 344, [[" SKIP ", core.background, ""], ["  zed snapshot", core.foreground]], { size: 21 }),
    mockupText(term.x + 30, term.y + 378, [[" FAIL ", core.background, ""], ["  icons: 1 missing", core.foreground]], { size: 21 }),
    prompt(term.y + 428, "")
  ];
  const badges = [[normal.green, 310], [normal.yellow, 344], [normal.red, 378]]
    .map(([color, dy]) => `<rect x="${term.x + 28}" y="${term.y + dy - 22}" width="${mono(21) * 6 + 4}" height="30" rx="4" fill="${color}"/>`)
    .join("\n    ");
  const cursorX = term.x + 30 + mono(21) * "~/gas-plasma main $ ".length;
  const ansiNames = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
  const ansiRamp = [normal, bright].map((row, rowIndex) => ansiNames.map((name, index) => {
    const x = term.x + 30 + index * 68;
    const y = term.y + 478 + rowIndex * 50;
    return `<rect x="${x}" y="${y}" width="60" height="40" rx="6" fill="${row[name]}" stroke="${ui.border}"/>`;
  }).join("")).join("\n    ");

  // Editor window: project panel with the real icon theme, git gutter, diagnostics.
  const ed = { x: 744, y: 148, w: 968, h: 704 };
  const panelW = 262;
  const rowH = 38;
  const tree = [
    { icon: "folder-code-open", name: "src", depth: 0, color: ui.strong },
    { icon: "typescript", name: "theme.ts", depth: 1, color: semantic.modified, status: "M", active: true },
    { icon: "json", name: "palette.json", depth: 1, color: semantic.added, status: "A" },
    { icon: "rust", name: "glow.rs", depth: 1, color: core.foreground },
    { icon: "folder-test", name: "tests", depth: 0, color: ui.strong },
    { icon: "folder-markdown", name: "docs", depth: 0, color: semantic.added, status: "U" },
    { icon: "docker", name: "Dockerfile", depth: 0, color: core.foreground },
    { icon: "npm", name: "package.json", depth: 0, color: semantic.modified, status: "M" },
    { icon: "markdown", name: "README.md", depth: 0, color: core.foreground },
    { icon: "git", name: ".gitignore", depth: 0, color: core.foreground },
    { icon: "folder", name: "dist", depth: 0, color: semantic.ignored }
  ];
  const treeRows = tree.map((row, index) => {
    const y = ed.y + 104 + index * rowH;
    const x = ed.x + 22 + row.depth * 22;
    const highlight = row.active
      ? `<rect x="${ed.x}" y="${y - 6}" width="${panelW}" height="${rowH - 2}" fill="${ui.border}"/>`
      : "";
    const status = row.status
      ? mockupText(ed.x + panelW - 18, y + 21, [[row.status, row.color]], { size: 18, weight: 700, anchor: "end" })
      : "";
    return `${highlight}
      ${mockupIcon(row.icon, x, y - 2, 28, light)}
      ${mockupText(x + 38, y + 21, [[row.name, row.color]], { size: 19 })}
      ${status}`;
  }).join("\n      ");

  const codeSize = 21;
  const codeX = ed.x + panelW + 92;
  const codeTop = ed.y + 118;
  const lineH = 36;
  const kw = syntax.keyword;
  const p = syntax.punctuation;
  const code = [
    { parts: [["import ", kw], ["{ ", p], ["palette", syntax.variable], [" } ", p], ["from ", kw], ['"./palette.json"', syntax.string], [";", p]] },
    { parts: [] },
    { parts: [["export ", kw], ["interface ", kw], ["Variant", syntax.type], [" {", p]] },
    { parts: [["  name", syntax.property], [": ", p], ["string", syntax.type], [";", p]] },
    { parts: [["  appearance", syntax.property], [": ", p], ['"dark"', syntax.string], [" | ", p], ['"light"', syntax.string], [";", p]], git: "modified" },
    { parts: [["}", p]] },
    { parts: [] },
    { parts: [["// ", syntax.comment], ["Ember accent for each variant", syntax.comment]], git: "added", italic: true },
    { parts: [["export ", kw], ["function ", kw], ["accent", syntax.function], ["(", p], ["v", syntax.variable], [": ", p], ["Variant", syntax.type], [") {", p]], git: "added" },
    { parts: [["  const ", kw], ["glow", syntax.variable], [" = ", p], ["0.42", syntax.constant], [";", p]], git: "added", warning: [8, 4] },
    { parts: [["  return ", kw], ["palette", syntax.variable], [".", p], ["variants", syntax.property], ["[", p], ["v", syntax.variable], [".", p], ["nam", syntax.property], ["].", p], ["accent", syntax.property], [";", p]], git: "added", error: [27, 3], active: true },
    { parts: [["}", p]], git: "added", deletedAfter: true }
  ];
  const activeLine = code.findIndex((line) => line.active);
  const codeLines = code.map((line, index) => {
    const baseline = codeTop + index * lineH;
    const top = baseline - 25;
    const pieces = [];
    if (line.active) pieces.push(`<rect x="${ed.x + panelW}" y="${top}" width="${ed.w - panelW}" height="${lineH}" fill="${ui.active}"/>`);
    if (line.git) pieces.push(`<rect x="${ed.x + panelW + 8}" y="${top + 2}" width="5" height="${lineH - 4}" rx="1" fill="${semantic[line.git]}"/>`);
    if (line.deletedAfter) {
      const y = top + lineH;
      pieces.push(`<path d="M${ed.x + panelW + 6} ${y - 7}l9 7-9 7z" fill="${semantic.deleted}"/>`);
    }
    pieces.push(mockupText(codeX - 24, baseline, [[String(index + 1), index === activeLine ? ui.focus : ui.muted]], { size: 19, anchor: "end" }));
    const parts = line.italic ? line.parts.map(([text, color]) => [text, color, ' font-style="italic"']) : line.parts;
    if (parts.length) pieces.push(mockupText(codeX, baseline, parts, { size: codeSize }));
    for (const [kind, color] of [["error", semantic.error], ["warning", semantic.warning]]) {
      if (!line[kind]) continue;
      const [column, length] = line[kind];
      pieces.push(squiggle(codeX + column * mono(codeSize), baseline + 6, length * mono(codeSize), color));
    }
    return pieces.join("\n    ");
  }).join("\n    ");

  // Hover card for the error on the active line, with a shape cue as well as color.
  const hoverY = codeTop + activeLine * lineH + 18;
  const hoverX = codeX + 6 * mono(codeSize);
  const hover = `<g filter="url(#shadow)">
      <rect x="${hoverX}" y="${hoverY}" width="452" height="84" rx="10" fill="${ui.raised}" stroke="${semantic.error}" stroke-width="2"/>
    </g>
    <circle cx="${hoverX + 26}" cy="${hoverY + 30}" r="10" fill="${semantic.error}"/>
    <path d="M${hoverX + 21} ${hoverY + 25}l10 10m0-10l-10 10" stroke="${ui.raised}" stroke-width="2.5" stroke-linecap="round"/>
    ${mockupText(hoverX + 46, hoverY + 37, [["error", semantic.error, ' font-weight="700"'], [" TS2551", ui.textMuted]], { size: 18 })}
    ${mockupText(hoverX + 20, hoverY + 66, [["Property 'nam' does not exist on 'Variant'.", ui.strong]], { size: 16 })}`;

  const statusY = ed.y + ed.h - 46;
  const statusBar = `<rect x="${ed.x}" y="${statusY}" width="${ed.w}" height="46" fill="${ui.active}"/>
    <path d="M${ed.x} ${statusY}h${ed.w}" stroke="${ui.border}"/>
    <circle cx="${ed.x + 34}" cy="${statusY + 23}" r="9" fill="${semantic.error}"/>
    <path d="M${ed.x + 30} ${statusY + 19}l8 8m0-8l-8 8" stroke="${ui.active}" stroke-width="2.2" stroke-linecap="round"/>
    ${mockupText(ed.x + 52, statusY + 30, [["1", ui.strong]], { size: 18 })}
    <path d="M${ed.x + 92} ${statusY + 32}l10-18 10 18z" fill="${semantic.warning}"/>
    ${mockupText(ed.x + 120, statusY + 30, [["1", ui.strong]], { size: 18 })}
    ${mockupText(ed.x + 170, statusY + 30, [["main", ui.strong], ["  +5", semantic.added], [" ~1", semantic.modified], [" -1", semantic.deleted]], { size: 18 })}
    ${mockupText(ed.x + ed.w - 24, statusY + 30, [["TypeScript  Ln 11, Col 28", ui.textMuted]], { size: 18, anchor: "end" })}`;

  const swatchSpecs = [
    [core.background, "bg"],
    [core.foreground, "fg"],
    [ui.accent, "accent"],
    [syntax.string, "string"],
    [semantic.added, "added"],
    [semantic.modified, "modified"],
    [semantic.deleted, "deleted"],
    [semantic.warning, "warning"],
    [semantic.error, "error"]
  ];
  const swatches = swatchSpecs.map(([hex, name], index) => {
    const x = 88 + index * 74;
    return `<g transform="translate(${x} 884)">
    <rect width="54" height="54" rx="10" fill="${hex}" stroke="${ui.border}" stroke-width="2"/>
    ${mockupText(27, 80, [[name, ui.textMuted]], { size: 13, anchor: "middle" })}
  </g>`;
  }).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1080" viewBox="0 0 1800 1080" role="img" aria-labelledby="title desc">
  <title id="title">${xmlEscape(variant.name)} theme mockup</title>
  <desc id="desc">${xmlEscape(variant.name)} in a terminal showing git status, test results, and the ANSI palette, next to an editor with the Gas Plasma file icons, git gutter, and diagnostics.</desc>
  <defs>
    <linearGradient id="stage" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ui.page}"/>
      <stop offset=".5" stop-color="${core.background}"/>
      <stop offset="1" stop-color="${ui.raised}"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ui.accent}"/>
      <stop offset=".5" stop-color="${ui.focus}"/>
      <stop offset="1" stop-color="${syntax.type}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="${shadow.color}" flood-opacity="${shadow.opacity}"/>
    </filter>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0v42" fill="none" stroke="${ui.border}" stroke-width="1" opacity=".22"/>
    </pattern>
  </defs>
  <rect width="1800" height="1080" fill="url(#stage)"/>
  <rect width="1800" height="1080" fill="url(#grid)"/>
  ${mockupText(88, 104, [[variant.name, ui.strong]], { size: 52, weight: 900 })}
  ${mockupText(92, 148, [["Apple Terminal  |  iTerm2  |  VS Code  |  Zed", syntax.type]], { size: 23 })}
  <rect x="94" y="172" width="418" height="8" rx="4" fill="url(#accentBar)"/>
  <g transform="translate(${1712 - 24 - label.length * mono(20)} 72)">
    <rect width="${label.length * mono(20) + 24}" height="40" rx="20" fill="${ui.raised}" stroke="${ui.accent}" stroke-width="2"/>
    ${mockupText(12, 27, [[label, ui.strong]], { size: 20 })}
  </g>

  <g filter="url(#shadow)">
    <rect x="${term.x}" y="${term.y}" width="${term.w}" height="${term.h}" rx="16" fill="${core.background}" stroke="${ui.border}" stroke-width="2"/>
  </g>
  <path d="M${term.x} ${term.y + 52}V${term.y + 16}a16 16 0 0 1 16-16h${term.w - 32}a16 16 0 0 1 16 16V${term.y + 52}z" fill="${ui.raised}"/>
  <path d="M${term.x} ${term.y + 52}h${term.w}" stroke="${ui.border}"/>
  <circle cx="${term.x + 28}" cy="${term.y + 26}" r="8" fill="#FF5F57"/>
  <circle cx="${term.x + 54}" cy="${term.y + 26}" r="8" fill="#FEBC2E"/>
  <circle cx="${term.x + 80}" cy="${term.y + 26}" r="8" fill="#28C840"/>
  ${mockupText(term.x + term.w / 2, term.y + 33, [["iTerm2 - zsh", ui.textMuted]], { size: 18, anchor: "middle" })}
  ${badges}
  ${terminalLines.join("\n  ")}
  <rect x="${cursorX}" y="${term.y + 408}" width="${mono(21)}" height="28" fill="${core.cursor}"/>
  ${mockupText(term.x + 30, term.y + 466, [["ANSI 0-7 / 8-15", ui.textMuted]], { size: 15 })}
  ${ansiRamp}

  <g filter="url(#shadow)">
    <rect x="${ed.x}" y="${ed.y}" width="${ed.w}" height="${ed.h}" rx="16" fill="${core.background}" stroke="${ui.border}" stroke-width="2"/>
  </g>
  <path d="M${ed.x} ${ed.y + 52}V${ed.y + 16}a16 16 0 0 1 16-16h${ed.w - 32}a16 16 0 0 1 16 16V${ed.y + 52}z" fill="${ui.raised}"/>
  <path d="M${ed.x} ${ed.y + 52}h${ed.w}" stroke="${ui.border}"/>
  <rect x="${ed.x}" y="${ed.y + 52}" width="${panelW}" height="${ed.h - 98}" fill="${ui.deep}"/>
  <path d="M${ed.x + panelW} ${ed.y + 52}v${ed.h - 98}" stroke="${ui.border}"/>
  ${mockupText(ed.x + 22, ed.y + 84, [["GAS-PLASMA", ui.textMuted]], { size: 15, weight: 700 })}
  <rect x="${ed.x + panelW}" y="${ed.y + 8}" width="170" height="44" fill="${core.background}"/>
  <path d="M${ed.x + panelW} ${ed.y + 50}h170" stroke="${ui.accent}" stroke-width="3"/>
  ${mockupIcon("typescript", ed.x + panelW + 14, ed.y + 16, 26, light)}
  ${mockupText(ed.x + panelW + 48, ed.y + 37, [["theme.ts", ui.strong]], { size: 18 })}
  <circle cx="${ed.x + panelW + 150}" cy="${ed.y + 30}" r="5" fill="${semantic.modified}"/>
  ${mockupText(ed.x + panelW + 190, ed.y + 37, [["palette.json", ui.textMuted]], { size: 18 })}
  ${mockupText(ed.x + ed.w - 24, ed.y + 37, [["Zed", ui.muted]], { size: 18, anchor: "end" })}
      ${treeRows}
    ${codeLines}
    ${hover}
    ${statusBar}

  ${swatches}
  <g transform="translate(780 884)">
    <rect width="430" height="54" rx="10" fill="${ui.deep}" stroke="${semantic.added}" stroke-width="2"/>
    ${mockupText(24, 35, [["A", semantic.added, ' font-weight="700"'], [" added  ", ui.textMuted], ["M", semantic.modified, ' font-weight="700"'], [" modified  ", ui.textMuted], ["D", semantic.deleted, ' font-weight="700"'], [" deleted", ui.textMuted]], { size: 19 })}
  </g>
  <g transform="translate(1230 884)">
    <rect width="482" height="54" rx="10" fill="${ui.deep}" stroke="${syntax.type}" stroke-width="2"/>
    ${mockupText(24, 35, [["single palette, four targets", syntax.type]], { size: 19 })}
  </g>
</svg>
`;
}

const mockupVariants = [
  { variant: palette.variants.dark, file: "mockup", label: "Dark", light: false },
  { variant: palette.variants.light, file: "mockup-light", label: "Light", light: true },
  { variant: palette.variants.colorblind, file: "mockup-colorblind", label: "Color Blind", light: false }
];

function writeMockupSvg() {
  for (const { variant, file, label, light } of mockupVariants) {
    const svg = mockupSvg(variant, { label, light });
    writeFileSync(path.join(root, `assets/${file}.svg`), svg);
    writeFileSync(path.join(root, `docs/assets/${file}.svg`), svg);
  }
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
    ${node({ x: 1060, y: 312, title: "Release Channels", body: ["GitHub Releases", "Open VSX + Zed"], accent: "#FFD700" })}
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
    <text x="24" y="39" fill="#FFD2A6" font-family="SF Mono, Menlo, Consolas, monospace" font-size="18">npm run build -> npm run check -> npm run package -> signed release tag -> Open VSX + Zed publish</text>
  </g>
</svg>
`;
  writeFileSync(path.join(root, "assets/architecture.svg"), svg);
  writeFileSync(path.join(root, "docs/assets/architecture.svg"), svg);
  writeFileSync(path.join(root, "docs/assets/architecture-light.svg"), toLightSvg(svg, { minContrast: 4.5 }));
}

function renderSvgToPng(svgPath, pngPath, { zoom = 1 } = {}) {
  const svg = readFileSync(svgPath);
  const png = new Resvg(svg, {
    fitTo: zoom === 1 ? { mode: "original" } : { mode: "zoom", value: zoom },
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 0,
    font: {
      defaultFontFamily: "SF Mono",
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
  for (const { file } of mockupVariants) {
    renderSvgToPng(path.join(root, `assets/${file}.svg`), path.join(root, `assets/${file}.png`), { zoom: 2 });
    copyFileSync(path.join(root, `assets/${file}.png`), path.join(root, `docs/assets/${file}.png`));
  }
  copyFileSync(path.join(root, "assets/mockup.png"), path.join(root, "screenshot.png"));
}

function writeArchitecturePng() {
  renderSvgToPng(path.join(root, "assets/architecture.svg"), path.join(root, "assets/architecture.png"), { zoom: 2 });
  copyFileSync(path.join(root, "assets/architecture.png"), path.join(root, "docs/assets/architecture.png"));
  renderSvgToPng(path.join(root, "docs/assets/architecture-light.svg"), path.join(root, "docs/assets/architecture-light.png"), { zoom: 2 });
}

function docsCssVariables(variant) {
  const { core, ui, syntax, ansi } = variant;
  const dark = variant.appearance === "dark";
  return [
    `color-scheme: ${variant.appearance};`,
    `--bg: ${ui.page};`,
    `--surface: ${core.background};`,
    `--surface-2: ${ui.raised};`,
    `--surface-3: ${ui.active};`,
    `--text: ${core.bold};`,
    `--muted: ${syntax.function};`,
    `--subtle: ${ui.subtle};`,
    `--strong: ${ui.strong};`,
    `--on-accent: ${ui.onAccent};`,
    `--caption: ${ui.textMuted};`,
    `--accent: ${core.foreground};`,
    `--red: ${ui.accent};`,
    `--green: ${dark ? ansi.bright.green : ansi.normal.green};`,
    `--yellow: ${dark ? ui.focus : ui.link};`,
    `--cyan: ${syntax.type};`,
    `--line: ${ui.border};`,
    `--well: ${dark ? "#0D0500" : ui.deep};`,
    `--command-bg: ${dark ? "#100600" : ui.deep};`,
    `--tile-bg: ${ui.raised}C7;`,
    `--icon-bg: ${ui.deep}C7;`,
    `--glow: ${dark ? "rgba(255,69,0,.10)" : "rgba(255,140,0,.12)"};`,
    `--shadow: ${dark ? "rgba(0,0,0,.45)" : "rgba(92,36,0,.16)"};`
  ].join("\n      ");
}

function docsSwatches(variant) {
  const { core, ansi } = variant;
  return [core.background, core.foreground, ansi.normal.red, ansi.normal.green, ansi.bright.yellow, ansi.normal.blue, ansi.normal.magenta, ansi.bright.cyan]
    .map((hex) => {
      const text = relativeLuminance(hex) > 0.35 ? "#2A1200" : "#FFF0DB";
      return `<div class="swatch" style="background:${hex};color:${text}">${hex}</div>`;
    })
    .join("\n          ");
}

// Real captures from iTerm2 and Zed (scripts/capture-screenshots.mjs). They are committed
// rather than generated, so the docs page only lists the ones that exist.
const screenshotSpecs = [
  ["zed-dark", "Zed with Gas Plasma and Gas Plasma Icons"],
  ["zed-light", "Zed with Gas Plasma Light"],
  ["zed-colorblind", "Zed with Gas Plasma Color Blind"],
  ["zed-colorblind-light", "Zed with Gas Plasma Color Blind Light"],
  ["iterm2-dark", "iTerm2 with GasPlasma.itermcolors"],
  ["iterm2-light", "iTerm2 with GasPlasma-Light.itermcolors"],
  ["iterm2-colorblind", "iTerm2 with GasPlasma-ColorBlind.itermcolors"],
  ["iterm2-colorblind-light", "iTerm2 with GasPlasma-ColorBlind-Light.itermcolors"]
];

function copyScreenshots() {
  return screenshotSpecs.filter(([file]) => {
    const source = path.join(root, "assets/screenshots", `${file}.png`);
    if (!existsSync(source)) return false;
    copyFileSync(source, path.join(root, "docs/assets/screenshots", `${file}.png`));
    return true;
  });
}

function writeDocsIndex() {
  const screenshots = copyScreenshots();
  const screenshotGallery = screenshots.map(([file, caption]) => `<figure class="shot">
            <a href="assets/screenshots/${file}.png"><img src="assets/screenshots/${file}.png" alt="${xmlEscape(caption)}" loading="lazy"></a>
            <figcaption>${xmlEscape(caption)}</figcaption>
          </figure>`).join("\n          ");
  const screenshotSection = screenshots.length ? `<section id="screenshots" class="band">
      <div class="wrap">
        <h2>Screenshots</h2>
        <p class="section-note">Captured from the real apps with the generated presets and extensions installed.</p>
        <div class="shots">
          ${screenshotGallery}
        </div>
      </div>
    </section>` : "";
  const colorBlind = palette.variants.colorblind;
  const colorBlindLight = palette.variants.colorblindLight;
  const iconGallery = iconManifest.fileTheme.gallery.map((iconName) => {
    const label = iconName.replaceAll("-", " ");
    return `<figure class="icon-sample">
      <img class="only-dark" src="assets/icons/${iconName}.svg" alt="">
      <img class="only-light" src="assets/icons/light/${iconName}.svg" alt="">
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
  <script>
    try {
      const saved = localStorage.getItem("gas-plasma-theme");
      if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
    } catch {}
  </script>
  <style>
    :root {
      ${docsCssVariables(darkVariant)}
    }
    :root[data-theme="light"] {
      ${docsCssVariables(lightVariant)}
    }
    @media (prefers-color-scheme: light) {
      :root:not([data-theme="dark"]) {
        ${docsCssVariables(lightVariant)}
      }
    }
    :root .only-light { display: none !important; }
    :root[data-theme="light"] .only-light { display: block !important; }
    :root[data-theme="light"] .only-dark { display: none !important; }
    @media (prefers-color-scheme: light) {
      :root:not([data-theme="dark"]) .only-light { display: block !important; }
      :root:not([data-theme="dark"]) .only-dark { display: none !important; }
    }
    .theme-switch {
      display: inline-flex;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .theme-switch button {
      border: 0;
      padding: 6px 12px;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 14px;
      cursor: pointer;
    }
    .theme-switch button[aria-pressed="true"] {
      background: var(--surface-3);
      color: var(--text);
      font-weight: 760;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body {
      margin: 0;
      background:
        linear-gradient(135deg, var(--glow), transparent 32rem),
        linear-gradient(180deg, var(--bg) 0, var(--surface) 56rem, var(--bg) 100%);
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
      color: var(--subtle);
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
      color: var(--on-accent);
    }
    .mockup {
      display: block;
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--well);
      box-shadow: 0 32px 80px var(--shadow);
    }
    .diagram {
      display: block;
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--well);
    }
    .band {
      border-top: 1px solid var(--line);
      padding: 56px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }
    .tile {
      border: 1px solid var(--line);
      background: var(--tile-bg);
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
      color: var(--subtle);
      line-height: 1.65;
    }
    .section-note { margin-bottom: 22px; }
    .command {
      display: block;
      margin-top: 16px;
      padding: 14px;
      overflow-x: auto;
      background: var(--command-bg);
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
      background: var(--icon-bg);
    }
    .icon-sample img {
      width: 72px;
      height: 72px;
      display: block;
    }
    .icon-sample figcaption {
      color: var(--caption);
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
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    .palette-label { margin-top: 26px; }
    .shots {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }
    .shot { margin: 0; }
    .shot img {
      width: 100%;
      display: block;
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .shot figcaption {
      color: var(--caption);
      font-size: 14px;
      margin-top: 8px;
    }
    .cvd-list { padding-left: 20px; }
    .cvd-list li { margin: 6px 0; }
    .tile p code { overflow-wrap: anywhere; }
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
      .shots { grid-template-columns: 1fr; }
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
      <a href="#color-blind">Color blind</a>
      <a href="#icons">Icons</a>
      <a href="#architecture">Architecture</a>
      <a href="#palette">Palette</a>
      <a href="https://open-vsx.org/extension/jpfchang/gas-plasma-theme">Open VSX</a>
      <a href="https://github.com/JohnThre/GasPlasma-theme">GitHub</a>
      <div class="theme-switch" role="group" aria-label="Color scheme">
        <button type="button" data-theme-choice="light">Light</button>
        <button type="button" data-theme-choice="dark">Dark</button>
        <button type="button" data-theme-choice="auto">Auto</button>
      </div>
    </div>
  </nav>
  <main>
    <section class="wrap hero">
      <div>
        <img class="hero-logo" src="assets/logo.svg" alt="Gas Plasma logo">
        <h1>Gas Plasma</h1>
        <p class="lead">${xmlEscape(palette.description)} A single warm, high-contrast palette for Apple Terminal, iTerm2, VS Code, Open VSX-compatible editors, and Zed.</p>
        <div class="actions">
          <a class="button primary" href="https://github.com/JohnThre/GasPlasma-theme/releases">Releases</a>
          <a class="button" href="https://open-vsx.org/extension/jpfchang/gas-plasma-theme">Open VSX</a>
        </div>
      </div>
      <img class="mockup only-dark" src="assets/mockup.png" alt="Gas Plasma terminal and editor mockup">
      <img class="mockup only-light" src="assets/mockup-light.png" alt="Gas Plasma Light terminal and editor mockup">
    </section>
    <section id="install" class="band">
      <div class="wrap">
        <h2>Install Targets</h2>
        <div class="grid">
          <article class="tile">
            <h3>Apple Terminal</h3>
            <p>Download <code>GasPlasma.terminal</code> (dark), <code>GasPlasma-Light.terminal</code>, or the <code>GasPlasma-ColorBlind*.terminal</code> profiles from GitHub Releases and open one in Terminal. Terminal profiles cannot follow the system appearance, so switch profiles manually.</p>
            <code class="command">open GasPlasma-Light.terminal</code>
          </article>
          <article class="tile">
            <h3>iTerm2</h3>
            <p>Import the dark, light, auto, or color-blind presets. For the auto presets, enable <em>Use separate colors for light and dark mode</em> first (iTerm2 3.5+).</p>
            <code class="command">GasPlasma-Auto.itermcolors</code>
          </article>
          <article class="tile">
            <h3>VS Code</h3>
            <p>Install from Open VSX, then pick <code>Gas Plasma</code>, <code>Gas Plasma Light</code>, or a <code>Gas Plasma Color Blind</code> variant. File icons switch with the theme; enable <code>window.autoDetectColorScheme</code> to follow the OS.</p>
            <code class="command">jpfchang.gas-plasma-theme</code>
          </article>
          <article class="tile">
            <h3>Zed</h3>
            <p>Install the color theme and file icon theme from the Zed extensions store. Both ship dark and light variants, plus the color-blind themes; set <code>"mode": "system"</code> to follow the OS.</p>
            <code class="command">Gas Plasma Theme + Icons</code>
          </article>
        </div>
      </div>
    </section>
    <section id="color-blind" class="band">
      <div class="wrap">
        <h2>Color Blind Variants</h2>
        <p class="section-note"><code>${xmlEscape(colorBlind.name)}</code> and <code>${xmlEscape(colorBlindLight.name)}</code> keep the orange background, text, and accent, but move every status signal off the red/green axis: additions, success, and strings are blue, deletions and errors are vermillion, warnings and modifications are yellow, and conflicts are pink.</p>
        <ul class="cvd-list">
          <li>Checked on every build by simulating protanopia, deuteranopia, and tritanopia (Machado et al. 2009) and requiring a visible OKLab difference between added/deleted, error/warning/success, ANSI red/green, and strings/keywords.</li>
          <li>Status colors also keep at least 3:1 contrast against the editor background, and code colors keep 4.5:1.</li>
          <li>The original Gas Plasma themes also separate added/deleted and error/success by brightness, so they stay readable with red-green color blindness.</li>
        </ul>
        <img class="mockup" src="assets/mockup-colorblind.png" alt="${xmlEscape(colorBlind.name)} terminal and editor mockup">
      </div>
    </section>
    ${screenshotSection}
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
        <img class="diagram only-dark" src="assets/architecture.png" alt="Gas Plasma build architecture diagram">
        <img class="diagram only-light" src="assets/architecture-light.png" alt="Gas Plasma build architecture diagram">
      </div>
    </section>
    <section id="palette" class="band">
      <div class="wrap">
        <h2>Palette</h2>
        ${themeVariants.map((variant) => `<h3 class="palette-label">${xmlEscape(variant.name)}</h3>
        <div class="palette" aria-label="${xmlEscape(variant.name)} palette">
          ${docsSwatches(variant)}
        </div>`).join("\n        ")}
      </div>
    </section>
  </main>
  <footer class="wrap footer">GPL-3.0-or-later · Generated from one shared palette · GitHub Pages</footer>
  <script>
    (() => {
      const root = document.documentElement;
      const buttons = document.querySelectorAll("[data-theme-choice]");
      const sync = () => {
        const current = root.dataset.theme ?? "auto";
        buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === current)));
      };
      buttons.forEach((button) => button.addEventListener("click", () => {
        const choice = button.dataset.themeChoice;
        if (choice === "auto") delete root.dataset.theme;
        else root.dataset.theme = choice;
        try {
          if (choice === "auto") localStorage.removeItem("gas-plasma-theme");
          else localStorage.setItem("gas-plasma-theme", choice);
        } catch {}
        sync();
      }));
      sync();
    })();
  </script>
</body>
</html>
`;
  writeFileSync(path.join(root, "docs/index.html"), html);
}

for (const variant of themeVariants) {
  writeItermColors(variant);
  writeVsCodeTheme(variant);
}
for (const pair of autoVariantPairs) writeItermAutoColors(pair);
writeZedTheme();
writeFileIcons();
await writeProductIcons();
writeLogoSvg();
writeMockupSvg();
writeArchitectureSvg();
writeLogoPng();
writeMockupPng();
writeArchitecturePng();
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
  "assets/architecture.png",
  "assets/mockup.svg",
  "assets/mockup.png",
  "assets/mockup-light.svg",
  "assets/mockup-light.png",
  "assets/mockup-colorblind.svg",
  "assets/mockup-colorblind.png",
  "screenshot.png",
  "docs/index.html"
];

for (const file of built) {
  const data = readFileSync(path.join(root, file));
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
  console.log(`generated ${file} ${hash}`);
}
