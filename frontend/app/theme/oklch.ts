/**
 * Minimal OKLCH → sRGB hex converter (Björn Ottosson's OKLab reference
 * matrices). Needed because React Native's native color parser doesn't
 * understand oklch() — browsers do, so this only actually matters for
 * iOS/Android, but converting once here keeps a single source of truth
 * instead of hand-picking hex fallbacks that could drift from the spec.
 */

function srgbCompand(linear: number): number {
  const v = Math.max(0, Math.min(1, linear));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function toHexByte(channel: number): string {
  const v = Math.round(Math.max(0, Math.min(1, channel)) * 255);
  return v.toString(16).padStart(2, "0");
}

/** lPercent: 0-100 (as written in the design spec, e.g. "68%"). c: chroma. hDeg: hue in degrees. */
export function oklch(lPercent: number, c: number, hDeg: number): string {
  const L = lPercent / 100;
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return `#${toHexByte(srgbCompand(rLin))}${toHexByte(srgbCompand(gLin))}${toHexByte(srgbCompand(bLin))}`;
}
