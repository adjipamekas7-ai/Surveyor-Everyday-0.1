import type { Affine } from './affine';

/** World file (.tfw/.jgw/.pgw/.wld): 6 baris A D B E C F, (C,F) = pusat piksel kiri-atas. */
export function parseWorldFile(text: string): Affine {
  const v = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 6)
    .map(Number);
  if (v.length < 6 || v.some((n) => !isFinite(n))) throw new Error('Isi world file tidak valid (harus 6 angka).');
  const [A, D, B, E, C, F] = v;
  return [A, B, C - 0.5 * A - 0.5 * B, D, E, F - 0.5 * D - 0.5 * E];
}

export const WORLD_FILE_EXT = ['tfw', 'tifw', 'jgw', 'jpgw', 'jpegw', 'pgw', 'pngw', 'wld', 'gfw', 'bpw'];
