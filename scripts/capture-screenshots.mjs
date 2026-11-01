#!/usr/bin/env node
// Captures the real-app screenshots in assets/screenshots/ (macOS only, run by hand).
//
//   npm run screenshots              # iTerm2 and Zed
//   npm run screenshots -- iterm2    # only iTerm2
//   npm run screenshots -- zed       # only Zed
//
// Requirements: run `npm run build` first; grant the terminal running this script Screen
// Recording (for screencapture) and Accessibility (Zed keystrokes) permission; for Zed,
// install zed/gas-plasma-theme and zed/gas-plasma-icons as dev extensions. iTerm2 profiles
// and Zed settings are only changed temporarily and are restored when the script exits.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const palette = JSON.parse(readFileSync(path.join(root, "src/palette.json"), "utf8"));
const outDir = path.join(root, "assets/screenshots");
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["iterm2", "zed"];
const work = mkdtempSync(path.join(os.tmpdir(), "gas-plasma-shots-"));
const shotVariants = [
  ["dark", palette.variants.dark],
  ["light", palette.variants.light],
  ["colorblind", palette.variants.colorblind],
  ["colorblind-light", palette.variants.colorblindLight]
];

if (process.platform !== "darwin") throw new Error("Screenshots are captured on macOS only.");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { encoding: "utf8", ...options });
const osascript = (...lines) => run("osascript", lines.flatMap((line) => ["-e", line])).trim();
const git = (...args) => run("git", ["-c", "user.name=demo", "-c", "user.email=demo@example.com", ...args], { cwd: fixture });

// --- fixture: a git repo with staged, modified, deleted, untracked, and ignored files ----
const fixture = path.join(work, "gas-plasma-demo");
function write(relative, content) {
  mkdirSync(path.dirname(path.join(fixture, relative)), { recursive: true });
  writeFileSync(path.join(fixture, relative), content);
}
const themeBefore = `import palette from "./palette.json";

export interface Variant {
  name: string;
  appearance: "dark" | "light";
}

// Legacy label helper, kept for the 0.1 API.
export function describe(variant: Variant): string {
  return \`\${variant.name} (\${variant.appearance})\`;
}

export default describe;
`;
const themeAfter = `import palette from "./palette.json";

export interface Variant {
  name: string;
  appearance: "dark" | "light" | "auto";
}

export function describe(variant: Variant): string {
  return \`\${variant.name} (\${variant.appearance})\`;
}

// Ember accent for each variant
export function accent(v: Variant): string {
  const glow = 0.42;
  return palette.variants[v.nam].accent;
}

export default describe;
`;
function createFixture() {
  mkdirSync(fixture, { recursive: true });
  run("git", ["init", "-q", "-b", "main"], { cwd: fixture });
  write("src/theme.ts", themeBefore);
  write("src/palette.json", '{\n  "name": "Gas Plasma",\n  "accent": "#FF4500"\n}\n');
  write("src/glow.rs", "/// Ionized gas glow intensity.\npub fn glow(level: u8) -> f32 {\n    let base = 0.42_f32;\n    base * f32::from(level) / 255.0\n}\n");
  write("src/plasma.py", 'def ember(level: int) -> str:\n    return f"#{level:02X}4500"\n');
  write("tests/theme.test.ts", "export const ok = true;\n");
  write("README.md", "# Gas Plasma Demo\n");
  write("package.json", '{\n  "name": "gas-plasma-demo",\n  "type": "module"\n}\n');
  write("Dockerfile", "FROM node:22-alpine\n");
  write(".gitignore", "dist/\n");
  write(".github/workflows/ci.yml", "name: CI\non: [push]\n");
  write("assets/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
  write("legacy/old-theme.ts", "export const old = 1;\n");
  write("tsconfig.json", '{ "compilerOptions": { "strict": true, "resolveJsonModule": true, "module": "esnext", "moduleResolution": "bundler" } }\n');
  write("Cargo.toml", '[package]\nname = "glow"\nversion = "0.1.0"\n');
  git("add", "-A");
  git("commit", "-qm", "init");
  write("src/theme.ts", themeAfter);
  git("rm", "-q", "legacy/old-theme.ts");
  write("docs/notes.md", "## Notes\n");
  write("src/staged.ts", "export const staged = true;\n");
  git("add", "src/staged.ts");
  write("dist/bundle.js", "built\n");
  write("src/glow.rs", readFileSync(path.join(fixture, "src/glow.rs"), "utf8").replace("0.42_f32", "0.5_f32"));
}

// Terminal demo (git colors, test badges, ANSI ramp); `short` fits an editor terminal panel.
const demo = path.join(root, "scripts/screenshot-demo.zsh");

// --- window ids for screencapture -l ---------------------------------------------------
const windowsTool = path.join(work, "windows");
function buildWindowsTool() {
  const source = path.join(work, "windows.swift");
  writeFileSync(source, `import CoreGraphics
let owner = CommandLine.arguments[1]
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String: Any]]
for w in list where (w[kCGWindowOwnerName as String] as? String) == owner && (w[kCGWindowLayer as String] as? Int) == 0 {
  print(w[kCGWindowNumber as String]!)
}
`);
  run("swiftc", ["-O", "-o", windowsTool, source]);
}
const windowIds = (owner) => run(windowsTool, [owner]).split("\n").filter(Boolean);

function capture(windowId, name) {
  const file = path.join(outDir, `${name}.png`);
  run("screencapture", ["-x", "-o", "-l", windowId, file]);
  run("sips", ["--resampleWidth", "1600", file]);
  console.log(`captured assets/screenshots/${name}.png`);
}

// --- iTerm2: temporary Dynamic Profiles built from the generated presets ------------------
async function captureIterm() {
  const profilePath = path.join(os.homedir(), "Library/Application Support/iTerm2/DynamicProfiles/gas-plasma-screenshots.json");
  const profiles = shotVariants.map(([name, variant]) => {
    const preset = `GasPlasma${variant.fileSuffix}.itermcolors`;
    const colors = JSON.parse(run("plutil", ["-convert", "json", "-o", "-", path.join(root, preset)]));
    return { Name: `GP Screenshot ${name}`, Guid: `gp-screenshot-${name}`, Columns: 96, Rows: 27, "Normal Font": "SFMono-Regular 15", "Custom Directory": "No",
      // New iTerm2 profiles default to separate light/dark colors; these presets are single-mode.
      "Use Separate Colors for Light and Dark Mode": false, ...colors };
  });
  writeFileSync(profilePath, JSON.stringify({ Profiles: profiles }, null, 1));
  try {
    await sleep(2000);
    for (const [name] of shotVariants) {
      const before = new Set(windowIds("iTerm2"));
      const id = osascript(
        `tell application "iTerm2" to set w to (create window with profile "GP Screenshot ${name}" command "${demo} ${fixture}")`,
        'tell application "iTerm2" to return id of w'
      );
      await sleep(3000);
      const windowId = windowIds("iTerm2").find((candidate) => !before.has(candidate));
      if (windowId) capture(windowId, `iterm2-${name}`);
      osascript(`tell application "iTerm2" to close (first window whose id is ${id})`);
    }
  } finally {
    rmSync(profilePath, { force: true });
  }
}

// --- Zed: switch the user theme setting, which Zed hot-reloads -----------------------------
async function captureZed() {
  const settingsPath = path.join(os.homedir(), ".config/zed/settings.json");
  const original = existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : "{}\n";
  const withTheme = (theme, icons) => original
    .replace(/"icon_theme":\s*("[^"]*"|\{[^}]*\})\s*,?/, "")
    .replace(/"theme":\s*("[^"]*"|\{[^}]*\})\s*,?/, "")
    .replace(/\{/, `{\n  "theme": "${theme}",\n  "icon_theme": "${icons}",`);
  try {
    writeFileSync(settingsPath, withTheme(palette.variants.dark.name, "Gas Plasma Icons"));
    run("zed", [fixture, path.join(fixture, "src/theme.ts")]);
    const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
    await prompt.question("In Zed, choose \"Trust and Continue\" for the demo project, wait for the TypeScript squiggles, then press Enter here.");
    prompt.close();
    osascript(
      'tell application "Zed" to activate',
      "delay 0.5",
      'tell application "System Events" to key code 50 using control down',
      "delay 1.5",
      `tell application "System Events" to keystroke "${demo} ${fixture} short"`,
      'tell application "System Events" to key code 36'
    );
    await sleep(3000);
    for (const [name, variant] of shotVariants) {
      const icons = variant.appearance === "light" ? "Gas Plasma Icons Light" : "Gas Plasma Icons";
      writeFileSync(settingsPath, withTheme(variant.name, icons));
      await sleep(3000);
      const [windowId] = windowIds("Zed");
      if (windowId) capture(windowId, `zed-${name}`);
    }
  } finally {
    writeFileSync(settingsPath, original);
  }
}

mkdirSync(outDir, { recursive: true });
try {
  createFixture();
  buildWindowsTool();
  if (targets.includes("iterm2")) await captureIterm();
  if (targets.includes("zed")) await captureZed();
  console.log("Run `npm run build` to copy the screenshots into docs/.");
} finally {
  if (!targets.includes("zed")) rmSync(work, { recursive: true, force: true });
  else console.log(`Demo project left at ${work} (close it in Zed, then delete it).`);
}
