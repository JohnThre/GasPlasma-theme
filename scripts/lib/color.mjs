// Shared color math for scripts/build.mjs and scripts/check.mjs.

export function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!match) throw new Error(`Invalid hex color: ${hex}`);
  const value = match[1];
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function srgbToLinear(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  const c = Math.min(1, Math.max(0, value));
  const encoded = c <= 0.0031308 ? c * 12.92 : (1.055 * (c ** (1 / 2.4))) - 0.055;
  return Math.round(encoded * 255);
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * srgbToLinear(r)) + (0.7152 * srgbToLinear(g)) + (0.0722 * srgbToLinear(b));
}

export function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function mixHex(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const mix = (x, y) => Math.round(x + ((y - x) * amount)).toString(16).padStart(2, "0");
  return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`.toUpperCase();
}

// Machado, Oliveira & Fernandes (2009) dichromacy matrices at severity 1.0,
// applied to linear RGB.
export const cvdMatrices = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881]
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900]
  ]
};

function linearRgb(hex) {
  const { r, g, b } = hexToRgb(hex);
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

function applyMatrix(matrix, [r, g, b]) {
  return matrix.map(([x, y, z]) => (x * r) + (y * g) + (z * b));
}

export function simulateCvd(hex, type) {
  const matrix = cvdMatrices[type];
  if (!matrix) throw new Error(`Unknown color vision deficiency: ${type}`);
  const [r, g, b] = applyMatrix(matrix, linearRgb(hex));
  const channel = (value) => linearToSrgb(value).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

export function oklab(hex) {
  const [r, g, b] = linearRgb(hex);
  const l = Math.cbrt((0.4122214708 * r) + (0.5363325363 * g) + (0.0514459929 * b));
  const m = Math.cbrt((0.2119034982 * r) + (0.6806995451 * g) + (0.1073969566 * b));
  const s = Math.cbrt((0.0883024619 * r) + (0.2817188376 * g) + (0.6299787005 * b));
  return {
    L: (0.2104542553 * l) + (0.7936177850 * m) - (0.0040720468 * s),
    a: (1.9779984951 * l) - (2.4285922050 * m) + (0.4505937099 * s),
    b: (0.0259040371 * l) + (0.7827717662 * m) - (0.8086757660 * s)
  };
}

export function deltaE(a, b) {
  const x = oklab(a);
  const y = oklab(b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}

// Perceptual distance between two colors as seen with the given deficiency
// (or with typical vision when `type` is "normal").
export function cvdDeltaE(a, b, type) {
  if (type === "normal") return deltaE(a, b);
  return deltaE(simulateCvd(a, type), simulateCvd(b, type));
}
