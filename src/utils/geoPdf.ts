/**
 * Surveyor Everyday - Render GeoPDF menjadi RasterSource terreferensi.
 * Hanya area peta (BBox / neatline) yang dirender, jadi label/etiket di luar
 * bingkai peta tidak ikut dan tidak ada distorsi (gepeng).
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { RasterSource, fitAffine } from './geoRaster';
import { GeoPdfParsed } from './geoPdfParse';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface RenderedGeoPdf {
  source: RasterSource;
  /** Galat rata-rata titik kontrol terhadap model affine (meter) */
  rmsMeters: number;
  pixelsRendered: { width: number; height: number };
}

/** Batas piksel render agar aman di HP (memori WebView). */
const MAX_PIXELS = 14_000_000;
const MAX_SIDE = 6000;

type Viewport = { convertToViewportPoint: (x: number, y: number) => number[] };

/** Persegi BBox PDF -> piksel viewport [x1,y1,x2,y2] (mendukung halaman terotasi) */
function viewportRect(vp: Viewport, x0: number, y0: number, x1: number, y1: number): number[] {
  const a = vp.convertToViewportPoint(x0, y0);
  const b = vp.convertToViewportPoint(x1, y1);
  return [a[0], a[1], b[0], b[1]];
}

export async function renderGeoPdf(bytes: Uint8Array, parsed: GeoPdfParsed): Promise<RenderedGeoPdf> {
  // pdf.js memindahkan buffer ke worker -> kirim salinan
  const task = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await task.promise;
  try {
    const page = await pdf.getPage(parsed.pageIndex + 1);
    const [bx0, by0, bx1, by1] = parsed.bbox;

    const vp1 = page.getViewport({ scale: 1 });
    const r1 = viewportRect(vp1, bx0, by0, bx1, by1);
    const w1 = Math.abs(r1[2] - r1[0]);
    const h1 = Math.abs(r1[3] - r1[1]);
    if (!(w1 > 1 && h1 > 1)) throw new Error('Ukuran area peta GeoPDF tidak valid.');

    const scale = Math.max(
      0.25,
      Math.min(8, Math.sqrt(MAX_PIXELS / (w1 * h1)), MAX_SIDE / Math.max(w1, h1))
    );

    const vpA = page.getViewport({ scale });
    const rA = viewportRect(vpA, bx0, by0, bx1, by1);
    const minX = Math.min(rA[0], rA[2]);
    const minY = Math.min(rA[1], rA[3]);
    const width = Math.max(2, Math.ceil(Math.abs(rA[2] - rA[0])));
    const height = Math.max(2, Math.ceil(Math.abs(rA[3] - rA[1])));

    // viewport yang titik awal peta tepat di (0,0) kanvas
    const viewport = page.getViewport({ scale, offsetX: -minX, offsetY: -minY });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D tidak tersedia.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    await page.render({ canvasContext: ctx, canvas, viewport } as never).promise;

    // titik kontrol -> piksel kanvas
    const pairs = parsed.controls.map((c) => {
      const [px, py] = viewport.convertToViewportPoint(c.x, c.y);
      return { col: px, row: py, X: c.X, Y: c.Y };
    });
    const fit = fitAffine(pairs);
    if (!fit) throw new Error('Titik kontrol GeoPDF tidak cukup / segaris, georeferensi gagal.');

    let rmsMeters = fit.rmsGround;
    if (parsed.crs.kind === 'geo') rmsMeters *= 111320;

    const img = ctx.getImageData(0, 0, width, height);
    return {
      source: {
        rgba: img.data,
        width,
        height,
        affine: fit.affine,
        crs: parsed.crs,
      },
      rmsMeters,
      pixelsRendered: { width, height },
    };
  } finally {
    void task.destroy();
  }
}
