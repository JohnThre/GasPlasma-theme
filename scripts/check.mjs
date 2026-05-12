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

if (pkg.publisher !== "johnthre") errors.push("package.json publisher must be johnthre");
if (pkg.name !== "gas-plasma-theme") errors.push("package.json name must be gas-plasma-theme");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version ?? "")) {
  errors.push("package.json version must be SemVer");
}
if (pkg.contributes?.themes?.[0]?.path !== "./themes/gas-plasma-color-theme.json") {
  errors.push("package.json must contribute the generated VS Code theme");
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

[
  "GasPlasma.terminal",
  "GasPlasma.itermcolors",
  "assets/logo.svg",
  "assets/logo.png",
  "assets/mockup.svg",
  "assets/mockup.png",
  "screenshot.png",
  "docs/index.html",
  "README.open-vsx.md",
  "README.md",
  "CHANGELOG.md",
  "LICENSE"
].forEach(requireFile);

const readme = readFileSync(path.join(root, "README.md"), "utf8");
for (const required of ["iTerm2", "Open VSX", "johnthre.gas-plasma-theme", "GasPlasma.itermcolors"]) {
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
