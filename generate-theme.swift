#!/usr/bin/env swift
//
// generate-theme.swift
// Generates the Apple Terminal profiles for every palette variant.
//
// Usage: swift generate-theme.swift
// Output: GasPlasma.terminal and GasPlasma-Light.terminal in the current directory
//
// SPDX-License-Identifier: GPL-3.0-or-later

import AppKit
import Foundation

struct ThemeSpec: Decodable {
    struct Core: Decodable {
        let background: String
        let foreground: String
        let bold: String
        let cursor: String
        let cursorText: String
        let selection: String
        let selectionAlpha: Double
    }

    struct ColorSet: Decodable {
        let black: String
        let red: String
        let green: String
        let yellow: String
        let blue: String
        let magenta: String
        let cyan: String
        let white: String
    }

    struct Ansi: Decodable {
        let normal: ColorSet
        let bright: ColorSet
    }

    struct Terminal: Decodable {
        let fontName: String
        let fontSize: Double
        let columns: Int
        let rows: Int
        let backgroundBlur: Double
    }

    struct Variant: Decodable {
        let name: String
        let fileSuffix: String
        let core: Core
        let ansi: Ansi
    }

    let terminal: Terminal
    let variants: [String: Variant]
}

struct ColorDef {
    let r: CGFloat
    let g: CGFloat
    let b: CGFloat
    let a: CGFloat

    init(hex: String, alpha: Double = 1.0) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        precondition(cleaned.count == 6, "Invalid color: \(hex)")

        let scanner = Scanner(string: cleaned)
        var value: UInt64 = 0
        precondition(scanner.scanHexInt64(&value), "Invalid color: \(hex)")

        self.r = CGFloat((value >> 16) & 0xff) / 255.0
        self.g = CGFloat((value >> 8) & 0xff) / 255.0
        self.b = CGFloat(value & 0xff) / 255.0
        self.a = CGFloat(alpha)
    }
}

func archiveColor(_ def: ColorDef) -> Data {
    let color = NSColor(
        srgbRed: def.r, green: def.g, blue: def.b, alpha: def.a
    )
    return try! NSKeyedArchiver.archivedData(
        withRootObject: color, requiringSecureCoding: true
    )
}

func archiveFont(name: String, size: CGFloat) -> Data {
    let font = NSFont(name: name, size: size) ?? NSFont.monospacedSystemFont(ofSize: size, weight: .regular)
    return try! NSKeyedArchiver.archivedData(
        withRootObject: font, requiringSecureCoding: true
    )
}

let paletteURL = URL(fileURLWithPath: "src/palette.json")
let paletteData = try Data(contentsOf: paletteURL)
let spec = try JSONDecoder().decode(ThemeSpec.self, from: paletteData)

for key in spec.variants.keys.sorted() {
    let variant = spec.variants[key]!
    let colors: [String: ColorDef] = [
        "TextColor": ColorDef(hex: variant.core.foreground),
        "BackgroundColor": ColorDef(hex: variant.core.background),
        "TextBoldColor": ColorDef(hex: variant.core.bold),
        "CursorColor": ColorDef(hex: variant.core.cursor),
        "CursorTextColor": ColorDef(hex: variant.core.cursorText),
        "SelectionColor": ColorDef(hex: variant.core.selection, alpha: variant.core.selectionAlpha),

        "ANSIBlackColor": ColorDef(hex: variant.ansi.normal.black),
        "ANSIRedColor": ColorDef(hex: variant.ansi.normal.red),
        "ANSIGreenColor": ColorDef(hex: variant.ansi.normal.green),
        "ANSIYellowColor": ColorDef(hex: variant.ansi.normal.yellow),
        "ANSIBlueColor": ColorDef(hex: variant.ansi.normal.blue),
        "ANSIMagentaColor": ColorDef(hex: variant.ansi.normal.magenta),
        "ANSICyanColor": ColorDef(hex: variant.ansi.normal.cyan),
        "ANSIWhiteColor": ColorDef(hex: variant.ansi.normal.white),

        "ANSIBrightBlackColor": ColorDef(hex: variant.ansi.bright.black),
        "ANSIBrightRedColor": ColorDef(hex: variant.ansi.bright.red),
        "ANSIBrightGreenColor": ColorDef(hex: variant.ansi.bright.green),
        "ANSIBrightYellowColor": ColorDef(hex: variant.ansi.bright.yellow),
        "ANSIBrightBlueColor": ColorDef(hex: variant.ansi.bright.blue),
        "ANSIBrightMagentaColor": ColorDef(hex: variant.ansi.bright.magenta),
        "ANSIBrightCyanColor": ColorDef(hex: variant.ansi.bright.cyan),
        "ANSIBrightWhiteColor": ColorDef(hex: variant.ansi.bright.white)
    ]

    var profile: [String: Any] = [:]

    profile["name"] = variant.name
    profile["type"] = "Window Settings"
    profile["ProfileCurrentVersion"] = "2.09"

    profile["columnCount"] = spec.terminal.columns
    profile["rowCount"] = spec.terminal.rows

    profile["Font"] = archiveFont(name: spec.terminal.fontName, size: CGFloat(spec.terminal.fontSize))
    profile["FontAntialias"] = true
    profile["FontWidthSpacing"] = 1.0
    profile["FontHeightSpacing"] = 1.0

    profile["DisableANSIColor"] = false
    profile["UseBoldFonts"] = true
    profile["UseBrightBold"] = true

    profile["BackgroundBlur"] = spec.terminal.backgroundBlur
    profile["BackgroundBlurInactive"] = 0
    profile["BackgroundSettingsForInactiveWindows"] = true

    profile["ShowActiveProcessInTitle"] = true
    profile["ShowRepresentedURLInTitle"] = true
    profile["ShowRepresentedURLPathInTitle"] = true
    profile["ShowWindowSettingsNameInTitle"] = true

    profile["ShouldLimitScrollback"] = 0

    for (key, def) in colors {
        profile[key] = archiveColor(def)
    }

    let outputPath = "GasPlasma\(variant.fileSuffix).terminal"
    let data = try PropertyListSerialization.data(
        fromPropertyList: profile, format: .xml, options: 0
    )
    try data.write(to: URL(fileURLWithPath: outputPath))

    print("Generated \(outputPath) (\(data.count) bytes)")
    print("Install: open \(outputPath)")
}
