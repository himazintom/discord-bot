export function generateRandomBrightColor() {
  return {
    r: Math.floor(Math.random() * 128) + 128,
    g: Math.floor(Math.random() * 128) + 128,
    b: Math.floor(Math.random() * 128) + 128,
    a: 1
  };
}

export function rgbaToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return parseInt(`${toHex(r)}${toHex(g)}${toHex(b)}`, 16);
}

export function parseRgba(value: string) {
  const rgba = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!rgba) return null;

  return {
    r: parseInt(rgba[1]),
    g: parseInt(rgba[2]),
    b: parseInt(rgba[3]),
    a: rgba[4] ? parseFloat(rgba[4]) : 1
  };
} 