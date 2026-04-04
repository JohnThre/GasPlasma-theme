#!/usr/bin/env swift
//
// generate-theme.swift
// Generates the GasPlasma.terminal profile for Apple Terminal (macOS 26.4+)
//
// Usage: swift generate-theme.swift
// Output: GasPlasma.terminal in the current directory
//
// SPDX-License-Identifier: GPL-3.0-or-later

import AppKit
import Foundation

// MARK: - Color Palette (Gas Plasma — Orange-shifted rainbow)

struct ColorDef {
    let r: CGFloat
    let g: CGFloat
    let b: CGFloat
    let a: CGFloat

    init(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1.0) {
        self.r = r; self.g = g; self.b = b; self.a = a
    }
}

let palette: [String: ColorDef] = [
    // Core colors
    "TextColor":        ColorDef(1.00, 0.55, 0.00),       // #FF8C00 bright orange
    "BackgroundColor":  ColorDef(0.10, 0.04, 0.00),       // #1A0A00 deep burnt black
    "TextBoldColor":    ColorDef(1.00, 0.82, 0.65),       // #FFD2A6 light orange
    "CursorColor":      ColorDef(1.00, 0.55, 0.00),       // #FF8C00
    "CursorTextColor":  ColorDef(0.10, 0.04, 0.00),       // #1A0A00
    "SelectionColor":   ColorDef(1.00, 0.55, 0.00, 0.30), // #FF8C00 @ 30%

    // ANSI Normal (0-7)
    "ANSIBlackColor":   ColorDef(0.10, 0.04, 0.00),       // #1A0A00
    "ANSIRedColor":     ColorDef(1.00, 0.27, 0.00),       // #FF4500
    "ANSIGreenColor":   ColorDef(0.55, 0.60, 0.00),       // #8B9A00
    "ANSIYellowColor":  ColorDef(1.00, 0.70, 0.28),       // #FFB347
    "ANSIBlueColor":    ColorDef(0.80, 0.48, 0.00),       // #CC7A00
    "ANSIMagentaColor": ColorDef(1.00, 0.42, 0.42),       // #FF6B6B
    "ANSICyanColor":    ColorDef(0.83, 0.63, 0.09),       // #D4A017
    "ANSIWhiteColor":   ColorDef(1.00, 0.82, 0.65),       // #FFD2A6

    // ANSI Bright (8-15)
    "ANSIBrightBlackColor":   ColorDef(0.30, 0.15, 0.00), // #4D2600
    "ANSIBrightRedColor":     ColorDef(1.00, 0.42, 0.24), // #FF6B3D
    "ANSIBrightGreenColor":   ColorDef(0.71, 0.80, 0.09), // #B5CC18
    "ANSIBrightYellowColor":  ColorDef(1.00, 0.84, 0.00), // #FFD700
    "ANSIBrightBlueColor":    ColorDef(0.88, 0.58, 0.19), // #E09530
    "ANSIBrightMagentaColor": ColorDef(1.00, 0.61, 0.48), // #FF9B7A
    "ANSIBrightCyanColor":    ColorDef(0.91, 0.77, 0.28), // #E8C547
    "ANSIBrightWhiteColor":   ColorDef(1.00, 0.94, 0.86), // #FFF0DB
]

// MARK: - Archive NSColor to Data

func archiveColor(_ def: ColorDef) -> Data {
    let color = NSColor(
        srgbRed: def.r, green: def.g, blue: def.b, alpha: def.a
    )
    return try! NSKeyedArchiver.archivedData(
        withRootObject: color, requiringSecureCoding: true
    )
}

// MARK: - Archive NSFont to Data

func archiveFont(name: String, size: CGFloat) -> Data {
    let font = NSFont(name: name, size: size) ?? NSFont.monospacedSystemFont(ofSize: size, weight: .regular)
    return try! NSKeyedArchiver.archivedData(
        withRootObject: font, requiringSecureCoding: true
    )
}

// MARK: - Build Profile Dictionary

var profile: [String: Any] = [:]

// Name & metadata
profile["name"] = "Gas Plasma"
profile["type"] = "Window Settings"
profile["ProfileCurrentVersion"] = "2.09"

// Window size
profile["columnCount"] = 120
profile["rowCount"] = 30

// Font: SF Mono 13pt
profile["Font"] = archiveFont(name: "SFMono-Regular", size: 13.0)
profile["FontAntialias"] = true
profile["FontWidthSpacing"] = 1.0
profile["FontHeightSpacing"] = 1.0

// Color behavior
profile["DisableANSIColor"] = false
profile["UseBoldFonts"] = true
profile["UseBrightBold"] = true

// macOS 26+ glass background blur
profile["BackgroundBlur"] = 0.4
profile["BackgroundBlurInactive"] = 0
profile["BackgroundSettingsForInactiveWindows"] = true

// Title bar
profile["ShowActiveProcessInTitle"] = true
profile["ShowRepresentedURLInTitle"] = true
profile["ShowRepresentedURLPathInTitle"] = true
profile["ShowWindowSettingsNameInTitle"] = true

// Scrollback
profile["ShouldLimitScrollback"] = 0

// Colors
for (key, def) in palette {
    profile[key] = archiveColor(def)
}

// MARK: - Write .terminal File

let outputPath = "GasPlasma.terminal"
let data = try PropertyListSerialization.data(
    fromPropertyList: profile, format: .xml, options: 0
)
try data.write(to: URL(fileURLWithPath: outputPath))

print("Generated \(outputPath) (\(data.count) bytes)")
print("Install: open \(outputPath)")
