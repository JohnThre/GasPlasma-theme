# Changelog

## 0.3.0

- Added the color-blind-friendly `Gas Plasma Color Blind` and `Gas Plasma Color Blind Light` variants for Apple Terminal, iTerm2 (including `GasPlasma-ColorBlind-Auto.itermcolors`), VS Code, and Zed. Status colors use an orange/blue contrast instead of red/green.
- Added `semantic` status colors to every palette variant. VS Code themes now define git decorations, gutter and diff, merge, diagnostics, problems, and test result colors instead of falling back to VS Code's default red/green. Zed themes set `version_control.*` colors too.
- `Gas Plasma Light`: deletions and errors are a darker red (`#9E2000`) and additions/success a lighter olive (`#7A8C00`), so they no longer look the same with deuteranopia.
- `npm run check` simulates protanopia, deuteranopia, and tritanopia and fails when key status pairs become indistinguishable. It also requires 3:1 contrast for status colors.
- Redrew the preview mockups from the palette: real Gas Plasma file icons, git gutter, diagnostics, test results, and the full ANSI ramp, with a new color-blind mockup.
- Added real iTerm2 and Zed screenshots, captured with `npm run screenshots`.
- Updated `@vscode/vsce` to 3.9.2, `ovsx` to 1.0.2, `simple-icons` to 16.36, and the `actions/checkout` and `actions/setup-node` workflow actions to v7.

## 0.2.0

- Added the `Gas Plasma Light` variant for Apple Terminal, iTerm2, VS Code, and Zed, generated from a new `variants.light` palette (the dark theme keeps the `Gas Plasma` name).
- Added auto (follow the OS) support: `GasPlasma-Auto.itermcolors` with separate light and dark colors for iTerm2 3.5+, a light/dark Zed theme and icon theme family for `"mode": "system"`, and documented VS Code `window.autoDetectColorScheme` settings.
- Added light file icons: the VS Code icon theme switches to them automatically under light color themes, and Zed gets a `Gas Plasma Icons Light` icon theme.
- The documentation site now has a Light / Dark / Auto switch, light icon gallery, and light mockup.
- `npm run check` now enforces WCAG contrast for editor text colors in every palette variant.
- Dark theme accessibility: button and badge text is now dark on the orange-red accent (5.5:1, was 3.07:1), and line numbers moved from `#8F4A00` to `#9A5000` (3.2:1, was 2.89:1).
- Named folders now use folder-shaped icons with an emblem, and show a distinct open icon when expanded in VS Code and Zed.
- Fixed Zed file name mappings: dotted names such as `main.tf` and `package.json` match by full name instead of claiming every file with the same stem.
- Expanded file icon coverage to about 350 extensions, 190 file names, and 100 folder names, with new ecosystem logos (ESLint, Prettier, Vite, React, Tailwind CSS, Bun, Deno, pnpm, Yarn, Gradle, Kubernetes, and more) and new generic icons for tests, notebooks, binaries, spreadsheets, slides, diffs, certificates, shaders, 3D models, logs, and environment files.
- Replaced text badges with upstream logos for D, EJS, Common Lisp, and Racket, and redesigned the remaining language badges with larger labels and a solid accent band.
- Brand colors that are too dark for the near-black icon tiles are now lifted toward the theme's peach for contrast.
- Expanded the product icon theme to 41 Codicon glyphs covering accounts, notifications, debugging, diff, history, filtering, and common editor actions.

## 0.1.1

- Added Zed color theme and file icon theme extension outputs.
- Added Zed marketplace PR automation for signed release tags.

## 0.1.0

- Added Gas Plasma for VS Code and Open VSX-compatible editors.
- Added iTerm2 color preset support.
- Added VS Code file icon and product icon themes.
- Reworked the file icon artwork around upstream language and ecosystem logo geometry, with broader Markdown, config, package, media, archive, database, font, PDF, Docker, Git, Linux, and npm coverage.
- Generated the product icon theme from VS Code Codicons for a closer match to the original editor UI icon language.
- Expanded VS Code file icon language coverage for C, Pascal, Python, C++, Vala, C#, Java, PHP, Go, Swift, and other common languages.
- Added more distinctive per-language icon marks and broader coverage for Objective-C, PowerShell, Terraform/HCL, Nix, Julia, Fortran, Ada, COBOL, assembly, Groovy, Crystal, Nim, OCaml, Reason, Elm, MATLAB, VB, Verilog/VHDL, LaTeX, GraphQL, WASM, Astro, Pug, Handlebars, and EJS.
- Added shared palette generation for terminal and editor targets.
- Added logo, mockup screenshot, architecture diagram, GitHub Pages showcase, and release automation.
- Reorganized repository documentation around install targets, generated assets, build architecture, development workflow, release process, security reporting, and icon source attribution.
