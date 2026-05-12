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
const fileIconTheme = readJson("icons/file/gas-plasma-icon-theme.json");
const productIconTheme = readJson("icons/product/gas-plasma-product-icon-theme.json");
const iconManifest = readJson("src/icon-manifest.json");

if (pkg.publisher !== "jpfchang") errors.push("package.json publisher must be jpfchang");
if (pkg.name !== "gas-plasma-theme") errors.push("package.json name must be gas-plasma-theme");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version ?? "")) {
  errors.push("package.json version must be SemVer");
}
if (pkg.contributes?.themes?.[0]?.path !== "./themes/gas-plasma-color-theme.json") {
  errors.push("package.json must contribute the generated VS Code theme");
}
if (pkg.contributes?.iconThemes?.[0]?.id !== "gas-plasma-icons") {
  errors.push("package.json must contribute the Gas Plasma file icon theme");
}
if (pkg.contributes?.productIconThemes?.[0]?.id !== "gas-plasma-product-icons") {
  errors.push("package.json must contribute the Gas Plasma product icon theme");
}

for (const hex of [
  palette.core?.background,
  palette.core?.foreground,
  ...Object.values(palette.ansi?.normal ?? {}),
  ...Object.values(palette.ansi?.bright ?? {})
]) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex ?? "")) errors.push(`Invalid palette color: ${hex}`);
}

if (theme.name !== palette.name) errors.push("VS Code theme name must match palette name");
if (theme.type !== "dark") errors.push("VS Code theme must be dark");
if (theme.colors?.["terminal.ansiRed"] !== palette.ansi?.normal?.red) {
  errors.push("VS Code terminal ANSI colors must come from palette");
}
if (fileIconTheme.file !== "_gp_crt") errors.push("File icon theme must use CRT as the default file icon");
if (fileIconTheme.folder !== "_gp_folder") errors.push("File icon theme must define generated folder icons");
if (!fileIconTheme.fileExtensions?.json) errors.push("File icon theme must include extension mappings");
if (Object.keys(fileIconTheme.iconDefinitions ?? {}).length < 95) {
  errors.push("File icon theme must include broad icon coverage");
}
if (!productIconTheme.fonts?.[0]?.src?.[0]?.path?.endsWith(".woff")) {
  errors.push("Product icon theme must reference a WOFF font");
}
if (!productIconTheme.iconDefinitions?.["explorer-view-icon"]) {
  errors.push("Product icon theme must include core VS Code icon definitions");
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
  zip: "_gp_archive"
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
  "CMakeLists.txt": "_gp_cmake"
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
for (const font of productIconTheme.fonts ?? []) {
  for (const source of font.src ?? []) {
    requireFile(path.join("icons/product", source.path));
  }
}
for (const iconName of iconManifest.fileTheme?.gallery ?? []) {
  requireFile(path.join("docs/assets/icons", `${iconName}.svg`));
}

[
  "GasPlasma.terminal",
  "GasPlasma.itermcolors",
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
  "LICENSE"
].forEach(requireFile);

const readme = readFileSync(path.join(root, "README.md"), "utf8");
for (const required of ["iTerm2", "Open VSX", "jpfchang.gas-plasma-theme", "GasPlasma.itermcolors", "Gas Plasma Icons", "Gas Plasma Product Icons"]) {
  if (!readme.includes(required)) errors.push(`README.md must mention ${required}`);
}

const extensionReadme = readFileSync(path.join(root, "README.open-vsx.md"), "utf8");
if (extensionReadme.includes(".svg")) {
  errors.push("README.open-vsx.md must not reference SVG images because vsce rejects SVG README images");
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("project checks passed");
