# Gas Plasma

An orange-dominant terminal theme for **Apple Terminal** on macOS 26.4+.

Inspired by the glow of ionized gas — warm, vibrant, and easy on the eyes for long coding sessions. Colors are orange-shifted but still distinguishable for syntax highlighting, git diffs, and error output.

![Gas Plasma Screenshot](screenshot.png)

## Installation

1. Download [`GasPlasma.terminal`](GasPlasma.terminal)
2. Double-click the file — it opens in Terminal and adds the profile automatically
3. Go to **Terminal > Settings > Profiles** and set "Gas Plasma" as default (optional)

Or import manually: **Terminal > Settings > Profiles > ··· > Import…** and select `GasPlasma.terminal`.

## Color Palette

| Role | Color |
|------|-------|
| Background | `#1A0A00` |
| Foreground | `#FF8C00` |
| Bold | `#FFD2A6` |
| Cursor | `#FF8C00` |
| Selection | `#FF8C00` @ 30% |

### ANSI Colors

| | Normal | Bright |
|---|--------|--------|
| Black | `#1A0A00` | `#4D2600` |
| Red | `#FF4500` | `#FF6B3D` |
| Green | `#8B9A00` | `#B5CC18` |
| Yellow | `#FFB347` | `#FFD700` |
| Blue | `#CC7A00` | `#E09530` |
| Magenta | `#FF6B6B` | `#FF9B7A` |
| Cyan | `#D4A017` | `#E8C547` |
| White | `#FFD2A6` | `#FFF0DB` |

## Features

- **Background blur** (0.4) — uses the macOS 26 glass effect
- **SF Mono 13pt** default font
- **120x30** window size
- Bright-bold enabled for ANSI bright colors

## Regenerating

To modify colors and rebuild the `.terminal` file:

```bash
swift generate-theme.swift
```

Requires macOS 26.4+ with Xcode command-line tools.

## Requirements

- macOS 26.4 or later
- Apple Terminal

## License

[GNU General Public License v3.0](LICENSE)
