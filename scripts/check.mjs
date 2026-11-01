#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return {};
  }
}

function requireFile(relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    errors.push(`Missing required file: ${relativePath}`);
  }
}

const pkg = readJson("package.json");
const palette = readJson("src/palette.json");
const theme = readJson("themes/gas-plasma-color-theme.json");
const lightTheme = readJson("themes/gas-plasma-light-color-theme.json");
const fileIconTheme = readJson("icons/file/gas-plasma-icon-theme.json");
const productIconTheme = readJson("icons/product/gas-plasma-product-icon-theme.json");
const zedTheme = readJson("zed/gas-plasma-theme/themes/gas-plasma.json");
const zedIconTheme = readJson("zed/gas-plasma-icons/icon_themes/gas-plasma-icons.json");
const iconManifest = readJson("src/icon-manifest.json");

function readText(relativePath) {
  try {
    return readFileSync(path.join(root, relativePath), "utf8");
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return "";
  }
}

if (pkg.publisher !== "jpfchang") errors.push("package.json publisher must be jpfchang");
if (pkg.name !== "gas-plasma-theme") errors.push("package.json name must be gas-plasma-theme");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version ?? "")) {
  errors.push("package.json version must be SemVer");
}
if (pkg.contributes?.themes?.[0]?.path !== "./themes/gas-plasma-color-theme.json") {
  errors.push("package.json must contribute the generated VS Code theme");
}
if (pkg.contributes?.themes?.[1]?.path !== "./themes/gas-plasma-light-color-theme.json"
  || pkg.contributes?.themes?.[1]?.uiTheme !== "vs") {
  errors.push("package.json must contribute the generated light VS Code theme as a vs (light) theme");
}
if (pkg.contributes?.iconThemes?.[0]?.id !== "gas-plasma-icons") {
  errors.push("package.json must contribute the Gas Plasma file icon theme");
}
if (pkg.contributes?.productIconThemes?.[0]?.id !== "gas-plasma-product-icons") {
  errors.push("package.json must contribute the Gas Plasma product icon theme");
}

function relativeLuminance(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift) => {
    const c = ((value >> shift) & 0xff) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * channel(16)) + (0.7152 * channel(8)) + (0.0722 * channel(0));
}

function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const darkPalette = palette.variants?.dark ?? {};
const lightPalette = palette.variants?.light ?? {};
if (darkPalette.name !== palette.name) errors.push("Dark palette variant must keep the family name");
if (darkPalette.appearance !== "dark" || lightPalette.appearance !== "light") {
  errors.push("Palette must define dark and light variants");
}
for (const [variantKey, variant] of Object.entries(palette.variants ?? {})) {
  const colors = [
    ...Object.entries(variant.core ?? {}).filter(([key]) => key !== "selectionAlpha"),
    ...Object.entries(variant.ansi?.normal ?? {}),
    ...Object.entries(variant.ansi?.bright ?? {}),
    ...Object.entries(variant.ui ?? {}),
    ...Object.entries(variant.syntax ?? {})
  ];
  for (const [key, hex] of colors) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex ?? "")) errors.push(`Invalid ${variantKey} palette color ${key}: ${hex}`);
  }
  const background = variant.core?.background ?? "#000000";
  // Editor text must stay readable: WCAG AA (4.5:1) against the editor background.
  const textColors = {
    foreground: variant.core?.foreground,
    bold: variant.core?.bold,
    ...Object.fromEntries(Object.entries(variant.syntax ?? {}).filter(([key]) => key !== "invalid"))
  };
  for (const [key, hex] of Object.entries(textColors)) {
    const ratio = contrastRatio(hex, background);
    if (ratio < 4.5) errors.push(`${variantKey} ${key} ${hex} has ${ratio.toFixed(2)}:1 contrast on ${background}; needs 4.5:1`);
  }
  for (const [key, surface] of Object.entries({ raised: variant.ui?.raised, active: variant.ui?.active })) {
    const ratio = contrastRatio(variant.ui?.strong, surface);
    if (ratio < 4.5) errors.push(`${variantKey} ui.strong has ${ratio.toFixed(2)}:1 contrast on ui.${key}; needs 4.5:1`);
  }
  const accentRatio = contrastRatio(variant.ui?.onAccent, variant.ui?.accent);
  if (accentRatio < 4.5) errors.push(`${variantKey} ui.onAccent has ${accentRatio.toFixed(2)}:1 contrast on ui.accent; needs 4.5:1`);
  const mutedRatio = contrastRatio(variant.ui?.muted, background);
  if (mutedRatio < 3) errors.push(`${variantKey} ui.muted has ${mutedRatio.toFixed(2)}:1 contrast; needs 3:1`);
}

if (theme.name !== palette.name) errors.push("VS Code theme name must match palette name");
if (theme.type !== "dark") errors.push("VS Code theme must be dark");
if (theme.colors?.["terminal.ansiRed"] !== darkPalette.ansi?.normal?.red) {
  errors.push("VS Code terminal ANSI colors must come from palette");
}
if (lightTheme.name !== lightPalette.name) errors.push("Light VS Code theme name must match the light palette name");
if (lightTheme.type !== "light") errors.push("Light VS Code theme must be light");
if (lightTheme.colors?.["editor.background"] !== lightPalette.core?.background
  || lightTheme.colors?.["terminal.ansiRed"] !== lightPalette.ansi?.normal?.red) {
  errors.push("Light VS Code theme colors must come from the light palette");
}
if (zedTheme.$schema !== "https://zed.dev/schema/themes/v0.2.0.json") {
  errors.push("Zed theme must use the v0.2.0 theme schema");
}
if (zedTheme.name !== palette.name || zedTheme.themes?.[0]?.name !== palette.name) {
  errors.push("Zed theme family and theme names must match the palette name");
}
if (zedTheme.themes?.[0]?.appearance !== "dark") errors.push("Zed theme must be dark");
if (zedTheme.themes?.[0]?.style?.["terminal.ansi.red"] !== darkPalette.ansi?.normal?.red) {
  errors.push("Zed terminal ANSI colors must come from palette");
}
if (zedTheme.themes?.[0]?.style?.syntax?.keyword?.color !== darkPalette.syntax?.keyword) {
  errors.push("Zed syntax colors must come from palette");
}
const zedLight = zedTheme.themes?.find((entry) => entry.appearance === "light");
if (zedLight?.name !== lightPalette.name) errors.push("Zed theme family must include the light variant");
if (zedLight?.style?.background !== lightPalette.core?.background
  || zedLight?.style?.syntax?.keyword?.color !== lightPalette.syntax?.keyword) {
  errors.push("Zed light theme colors must come from the light palette");
}
if (fileIconTheme.file !== "_gp_crt") errors.push("File icon theme must use CRT as the default file icon");
if (fileIconTheme.folder !== "_gp_folder") errors.push("File icon theme must define generated folder icons");
if (!fileIconTheme.fileExtensions?.json) errors.push("File icon theme must include extension mappings");
if (Object.keys(fileIconTheme.iconDefinitions ?? {}).length < 230) {
  errors.push("File icon theme must include broad icon coverage");
}
if (fileIconTheme.folderNames?.src !== "_gp_folder_code") {
  errors.push("File icon theme must map named folders to folder-shaped icons");
}
if (fileIconTheme.folderNamesExpanded?.src !== "_gp_folder_code_open") {
  errors.push("File icon theme must map expanded named folders to open folder icons");
}
for (const [folderName, definition] of Object.entries(fileIconTheme.folderNames ?? {})) {
  if (!definition.startsWith("_gp_folder_")) {
    errors.push(`Folder ${folderName} must use a folder-shaped icon`);
  }
  if (fileIconTheme.folderNamesExpanded?.[folderName] !== `${definition}_open`) {
    errors.push(`Folder ${folderName} must have a matching open folder icon`);
  }
}
const lightIcons = fileIconTheme.light ?? {};
for (const key of ["file", "folder", "folderExpanded", "rootFolder", "rootFolderExpanded"]) {
  if (lightIcons[key] !== `${fileIconTheme[key]}_light`) {
    errors.push(`File icon theme light.${key} must use the light counterpart of ${fileIconTheme[key]}`);
  }
}
for (const key of ["fileExtensions", "fileNames", "folderNames", "folderNamesExpanded", "languageIds"]) {
  for (const [name, definition] of Object.entries(fileIconTheme[key] ?? {})) {
    if (lightIcons[key]?.[name] !== `${definition}_light`) {
      errors.push(`File icon theme light.${key} must map ${name} to ${definition}_light`);
      break;
    }
  }
}
for (const [definitionName, definition] of Object.entries(fileIconTheme.iconDefinitions ?? {})) {
  const isLight = definitionName.endsWith("_light");
  if (isLight !== (definition.iconPath ?? "").startsWith("./svg-light/")) {
    errors.push(`File icon ${definitionName} must point at the matching svg/ or svg-light/ directory`);
  }
  if (!isLight && !fileIconTheme.iconDefinitions[`${definitionName}_light`]) {
    errors.push(`File icon ${definitionName} must have a light counterpart`);
  }
}
if (zedIconTheme.$schema !== "https://zed.dev/schema/icon_themes/v0.3.0.json") {
  errors.push("Zed icon theme must use the v0.3.0 icon theme schema");
}
if (zedIconTheme.name !== iconManifest.fileTheme?.label) {
  errors.push("Zed icon theme name must match the file icon theme label");
}
if (zedIconTheme.themes?.[0]?.directory_icons?.collapsed !== "./icons/folder.svg") {
  errors.push("Zed icon theme must define generated folder icons");
}
if (zedIconTheme.themes?.[0]?.file_suffixes?.json !== "json") {
  errors.push("Zed icon theme must include suffix mappings");
}
const zedNamedDirectories = zedIconTheme.themes?.[0]?.named_directory_icons ?? {};
if (zedNamedDirectories.src?.collapsed !== "./icons/folder-code.svg"
  || zedNamedDirectories.src?.expanded !== "./icons/folder-code-open.svg") {
  errors.push("Zed icon theme must use distinct collapsed and expanded named folder icons");
}
for (const stem of Object.keys(zedIconTheme.themes?.[0]?.file_stems ?? {})) {
  if (stem.includes(".")) {
    errors.push(`Zed file stem ${stem} must be an extensionless file name; dotted names belong in file_suffixes`);
  }
}
for (const [fileName, expectedIcon] of Object.entries({
  "main.tf": "terraform",
  "package.json": "npm",
  ".gitignore": "git"
})) {
  if (zedIconTheme.themes?.[0]?.file_suffixes?.[fileName] !== expectedIcon) {
    errors.push(`Zed icon theme must map the full file name ${fileName} to ${expectedIcon}`);
  }
}
if (zedIconTheme.themes?.[0]?.file_stems?.Dockerfile !== "docker") {
  errors.push("Zed icon theme must map the Dockerfile stem");
}
const zedLightIcons = zedIconTheme.themes?.find((entry) => entry.appearance === "light");
if (zedLightIcons?.name !== `${iconManifest.fileTheme?.label} Light`) {
  errors.push("Zed icon theme family must include a light icon theme");
}
if (zedLightIcons?.file_icons?.default?.path !== "./icons/light/crt.svg"
  || zedLightIcons?.named_directory_icons?.src?.collapsed !== "./icons/light/folder-code.svg") {
  errors.push("Zed light icon theme must use the generated light icons");
}
for (const definition of Object.values(zedLightIcons?.file_icons ?? {})) {
  if (definition.path) requireFile(path.join("zed/gas-plasma-icons", definition.path));
}
if (zedIconTheme.themes?.[0]?.file_icons?.default?.path !== "./icons/crt.svg") {
  errors.push("Zed icon theme must include the CRT default file icon");
}
if (!zedIconTheme.themes?.[0]?.file_icons?.crt?.path) {
  errors.push("Zed icon theme must include generated file icon definitions");
}
if (!productIconTheme.fonts?.[0]?.src?.[0]?.path?.endsWith(".woff")) {
  errors.push("Product icon theme must reference a WOFF font");
}
if (!productIconTheme.iconDefinitions?.["explorer-view-icon"]) {
  errors.push("Product icon theme must include core VS Code icon definitions");
}
if (Object.keys(iconManifest.productTheme?.glyphs ?? {}).length < 40) {
  errors.push("Product icon theme must include broad glyph coverage");
}
for (const [iconId, glyphName] of Object.entries(iconManifest.productTheme?.iconDefinitions ?? {})) {
  if (!iconManifest.productTheme?.glyphs?.[glyphName]) {
    errors.push(`Product icon ${iconId} references unknown glyph ${glyphName}`);
  }
}
if (productIconTheme.iconDefinitions?.["accounts-view-bar-icon"]?.fontCharacter
  !== `\\${iconManifest.productTheme?.glyphs?.account}`) {
  errors.push("Product icon theme must map the accounts view to the account glyph");
}

for (const [extension, expectedIcon] of Object.entries({
  c: "_gp_c",
  cpp: "_gp_cpp",
  pas: "_gp_pascal",
  py: "_gp_python",
  vala: "_gp_vala",
  cs: "_gp_csharp",
  java: "_gp_java",
  php: "_gp_php",
  go: "_gp_go",
  swift: "_gp_swift"
})) {
  if (fileIconTheme.fileExtensions?.[extension] !== expectedIcon) {
    errors.push(`File icon theme must map .${extension} to ${expectedIcon}`);
  }
}
for (const [extension, expectedIcon] of Object.entries({
  m: "_gp_objectivec",
  mm: "_gp_objectivecpp",
  ps1: "_gp_powershell",
  tf: "_gp_terraform",
  nix: "_gp_nix",
  jl: "_gp_julia",
  f90: "_gp_fortran",
  asm: "_gp_assembly",
  cob: "_gp_cobol",
  vb: "_gp_vb",
  wasm: "_gp_wasm",
  astro: "_gp_astro"
})) {
  if (fileIconTheme.fileExtensions?.[extension] !== expectedIcon) {
    errors.push(`File icon theme must map .${extension} to ${expectedIcon}`);
  }
}
for (const [languageId, expectedIcon] of Object.entries({
  c: "_gp_c",
  cpp: "_gp_cpp",
  pascal: "_gp_pascal",
  python: "_gp_python",
  vala: "_gp_vala",
  csharp: "_gp_csharp",
  java: "_gp_java",
  php: "_gp_php",
  go: "_gp_go",
  swift: "_gp_swift"
})) {
  if (fileIconTheme.languageIds?.[languageId] !== expectedIcon) {
    errors.push(`File icon theme must map ${languageId} language id to ${expectedIcon}`);
  }
}
for (const [languageId, expectedIcon] of Object.entries({
  "objective-c": "_gp_objectivec",
  "objective-cpp": "_gp_objectivecpp",
  powershell: "_gp_powershell",
  terraform: "_gp_terraform",
  nix: "_gp_nix",
  julia: "_gp_julia",
  fortran: "_gp_fortran",
  asm: "_gp_assembly",
  cobol: "_gp_cobol",
  vb: "_gp_vb",
  wasm: "_gp_wasm",
  astro: "_gp_astro"
})) {
  if (fileIconTheme.languageIds?.[languageId] !== expectedIcon) {
    errors.push(`File icon theme must map ${languageId} language id to ${expectedIcon}`);
  }
}
for (const [extension, expectedIcon] of Object.entries({
  md: "_gp_markdown",
  markdown: "_gp_markdown",
  json: "_gp_json",
  yaml: "_gp_yaml",
  yml: "_gp_yaml",
  toml: "_gp_config",
  svg: "_gp_image",
  png: "_gp_image",
  zip: "_gp_archive",
  ipynb: "_gp_notebook",
  "test.ts": "_gp_test",
  "d.ts": "_gp_typescript",
  tsx: "_gp_react",
  exe: "_gp_binary",
  xlsx: "_gp_spreadsheet",
  patch: "_gp_diff",
  glsl: "_gp_shader"
})) {
  if (fileIconTheme.fileExtensions?.[extension] !== expectedIcon) {
    errors.push(`File icon theme must map .${extension} to ${expectedIcon}`);
  }
}
for (const [fileName, expectedIcon] of Object.entries({
  "README.md": "_gp_markdown",
  "package.json": "_gp_npm",
  "Dockerfile": "_gp_docker",
  ".gitignore": "_gp_git",
  "CMakeLists.txt": "_gp_cmake",
  ".eslintrc.json": "_gp_eslint",
  ".prettierrc": "_gp_prettier",
  "vite.config.ts": "_gp_vite",
  ".env": "_gp_env"
})) {
  if (fileIconTheme.fileNames?.[fileName] !== expectedIcon) {
    errors.push(`File icon theme must map ${fileName} to ${expectedIcon}`);
  }
}

for (const definition of Object.values(fileIconTheme.iconDefinitions ?? {})) {
  if (definition.iconPath) {
    requireFile(path.join("icons/file", definition.iconPath));
  }
}
for (const definition of Object.values(zedIconTheme.themes?.[0]?.file_icons ?? {})) {
  if (definition.path) {
    requireFile(path.join("zed/gas-plasma-icons", definition.path));
  }
}
for (const font of productIconTheme.fonts ?? []) {
  for (const source of font.src ?? []) {
    requireFile(path.join("icons/product", source.path));
  }
}
for (const iconName of iconManifest.fileTheme?.gallery ?? []) {
  requireFile(path.join("docs/assets/icons", `${iconName}.svg`));
  requireFile(path.join("docs/assets/icons/light", `${iconName}.svg`));
}

const autoPreset = readText("GasPlasma-Auto.itermcolors");
for (const key of ["Background Color (Dark)", "Background Color (Light)", "Ansi 15 Color (Light)", "Background Color"]) {
  if (!autoPreset.includes(`<key>${key}</key>`)) errors.push(`GasPlasma-Auto.itermcolors must define ${key}`);
}

[
  "GasPlasma.terminal",
  "GasPlasma-Light.terminal",
  "GasPlasma.itermcolors",
  "GasPlasma-Light.itermcolors",
  "GasPlasma-Auto.itermcolors",
  "themes/gas-plasma-light-color-theme.json",
  "assets/mockup-light.svg",
  "assets/mockup-light.png",
  "docs/assets/mockup-light.png",
  "docs/assets/architecture-light.png",
  "icons/file/gas-plasma-icon-theme.json",
  "icons/product/gas-plasma-product-icon-theme.json",
  "icons/product/gas-plasma-product-icons.woff",
  "assets/logo.svg",
  "assets/logo.png",
  "assets/architecture.svg",
  "assets/architecture.png",
  "assets/mockup.svg",
  "assets/mockup.png",
  "screenshot.png",
  "docs/assets/architecture.svg",
  "docs/assets/architecture.png",
  "docs/index.html",
  "README.open-vsx.md",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "zed/gas-plasma-theme/extension.toml",
  "zed/gas-plasma-theme/LICENSE",
  "zed/gas-plasma-theme/themes/gas-plasma.json",
  "zed/gas-plasma-icons/extension.toml",
  "zed/gas-plasma-icons/LICENSE",
  "zed/gas-plasma-icons/icon_themes/gas-plasma-icons.json",
  ".github/workflows/release.yml"
].forEach(requireFile);

const readme = readFileSync(path.join(root, "README.md"), "utf8");
for (const required of ["iTerm2", "Open VSX", "Zed", "jpfchang.gas-plasma-theme", "GasPlasma.itermcolors", "Gas Plasma Icons", "Gas Plasma Product Icons", "Gas Plasma Light", "GasPlasma-Auto.itermcolors", "autoDetectColorScheme"]) {
  if (!readme.includes(required)) errors.push(`README.md must mention ${required}`);
}

const extensionReadme = readFileSync(path.join(root, "README.open-vsx.md"), "utf8");
if (extensionReadme.includes(".svg")) {
  errors.push("README.open-vsx.md must not reference SVG images because vsce rejects SVG README images");
}

for (const [manifestPath, expectedId] of Object.entries({
  "zed/gas-plasma-theme/extension.toml": "gas-plasma-theme",
  "zed/gas-plasma-icons/extension.toml": "gas-plasma-icons"
})) {
  const manifest = readText(manifestPath);
  if (!manifest.includes(`id = "${expectedId}"`)) {
    errors.push(`${manifestPath} must define ${expectedId}`);
  }
  if (!manifest.includes(`version = "${pkg.version}"`)) {
    errors.push(`${manifestPath} version must match package.json`);
  }
  if (!manifest.includes('schema_version = 1')) {
    errors.push(`${manifestPath} must declare schema_version = 1`);
  }
}

const releaseWorkflow = readText(".github/workflows/release.yml");
for (const required of ["gas-plasma-theme", "gas-plasma-icons", "zed-industries/extensions", "ZED_EXTENSIONS_FORK", "COMMITTER_TOKEN"]) {
  if (!releaseWorkflow.includes(required)) {
    errors.push(`release.yml must include Zed marketplace automation detail: ${required}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("project checks passed");
