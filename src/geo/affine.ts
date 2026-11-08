/** Transformasi affine piksel -> koordinat CRS: x = a*px + b*py + c ; y = d*px + e*py + f */
export type Affine = [number, number, number, number, number, number];

export function applyAffine(m: Affine, px: number, py: number): { x: number; y: number } {
  return { x: m[0] * px + m[1] * py + m[2], y: m[3] * px + m[4] * py + m[5] };
}

export function invertAffine(m: Affine): Affine {
  const det = m[0] * m[4] - m[1] * m[3];
  if (!isFinite(det) || Math.abs(det) < 1e-18) throw new Error('Transformasi georeferensi tidak valid (determinan 0).');
  const a = m[4] / det;
  const b = -m[1] / det;
  const d = -m[3] / det;
  const e = m[0] / det;
  const c = -(a * m[2] + b * m[5]);
  const f = -(d * m[2] + e * m[5]);
  return [a, b, c, d, e, f];
}

/** Skala piksel: gambar dipakai pada resolusi lebih kecil (sx = lebarAsli / lebarBaru). */
export function scaleAffinePixels(m: Affine, sx: number, sy: number): Affine {
  return [m[0] * sx, m[1] * sy, m[2], m[3] * sx, m[4] * sy, m[5]];
}

function solve3(M: number[][], v: number[]): number[] {
  const a = M.map((r, i) => [...r, v[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    [a[i], a[p]] = [a[p], a[i]];
    if (Math.abs(a[i][i]) < 1e-14) throw new Error('Titik kontrol georeferensi sejajar / tidak cukup.');
    for (let r = i + 1; r < 3; r++) {
      const k = a[r][i] / a[i][i];
      for (let c = i; c < 4; c++) a[r][c] -= k * a[i][c];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = a[i][3];
    for (let c = i + 1; c < 3; c++) s -= a[i][c] * x[c];
    x[i] = s / a[i][i];
  }
  return x;
}

/** Fit affine terbaik (kuadrat terkecil) dari pasangan (u,v) -> (X,Y). Butuh >= 3 titik. */
export function fitAffine(
  src: Array<[number, number]>,
  dst: Array<[number, number]>
): { m: Affine; rmse: number } {
  if (src.length < 3 || src.length !== dst.length) throw new Error('Minimal 3 titik kontrol diperlukan.');
  // pusatkan agar stabil secara numerik
  const cu = src.reduce((s, p) => s + p[0], 0) / src.length;
  const cv = src.reduce((s, p) => s + p[1], 0) / src.length;
  const cx = dst.reduce((s, p) => s + p[0], 0) / dst.length;
  const cy = dst.reduce((s, p) => s + p[1], 0) / dst.length;
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const bx = [0, 0, 0];
  const by = [0, 0, 0];
  for (let i = 0; i < src.length; i++) {
    const r = [src[i][0] - cu, src[i][1] - cv, 1];
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) M[a][b] += r[a] * r[b];
      bx[a] += r[a] * (dst[i][0] - cx);
      by[a] += r[a] * (dst[i][1] - cy);
    }
  }
  const px = solve3(M, bx);
  const py = solve3(M, by);
  const m: Affine = [
    px[0],
    px[1],
    px[2] + cx - px[0] * cu - px[1] * cv,
    py[0],
    py[1],
    py[2] + cy - py[0] * cu - py[1] * cv,
  ];
  let se = 0;
  for (let i = 0; i < src.length; i++) {
    const p = applyAffine(m, src[i][0], src[i][1]);
    se += (p.x - dst[i][0]) ** 2 + (p.y - dst[i][1]) ** 2;
  }
  return { m, rmse: Math.sqrt(se / src.length) };
}
