import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  CheckSquare,
  Square as SquareIcon,
  AlertTriangle,
  Info,
  FileImage,
  Layers,
  MapPin,
} from 'lucide-react';
import { parseKmlString } from '../utils/kml';
import { parseDxfWithLayers } from '../utils/dxf';
import { utmToLatLng, latLngToUtm } from '../utils/utm';
import { parseGeoPdf, GeoPdfError } from '../utils/geoPdfParse';
import { renderGeoPdf } from '../utils/geoPdf';
import { loadGeoTiff } from '../utils/geoTiff';
import {
  extOf,
  pickSidecars,
  georefFromSidecars,
  loadGeorefImage,
  imageSize,
} from '../utils/imageRaster';
import {
  RasterSource,
  WarpResult,
  crsFromWktText,
  crsLabel,
  warpToMercator,
} from '../utils/geoRaster';
import { saveOverlayBlob, overlayRef } from '../utils/overlayStore';
import {
  SurveyPoint,
  SurveyLine,
  SurveyPolygon,
  GeoOverlay,
  UTMCoordinate,
  DxfLayerInfo,
  BasemapType,
} from '../types/survey';

interface ImportOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCrosshairUtm: UTMCoordinate;
  onImportFeatures: (data: {
    points: SurveyPoint[];
    lines: SurveyLine[];
    polygons: SurveyPolygon[];
    overlay?: GeoOverlay;
  }) => void;
  onSelectBasemap?: (type: BasemapType) => void;
}

type RasterKind = 'pdf' | 'tiff' | 'image';

interface RasterResult {
  kind: RasterKind;
  name: string;
  standard: string;
  warp: WarpResult;
  previewUrl: string;
  crsText: string;
  notes: string[];
  sourceSize: string;
}

const MAX_OUTPUT_DIM = 4096;

export const ImportOverlayModal: React.FC<ImportOverlayModalProps> = ({
  isOpen,
  onClose,
  currentCrosshairUtm,
  onImportFeatures,
  onSelectBasemap,
}) => {
  const [activeTab, setActiveTab] = useState<'raster' | 'dxf' | 'kml'>('raster');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // DXF State
  const [dxfLayers, setDxfLayers] = useState<DxfLayerInfo[]>([]);
  const [dxfRawResult, setDxfRawResult] = useState<ReturnType<typeof parseDxfWithLayers> | null>(null);
  const [dxfFilename, setDxfFilename] = useState<string>('');

  // Raster State (GeoPDF / GeoTIFF / gambar + world file / ECW + gambar pendamping)
  const [rasterResult, setRasterResult] = useState<RasterResult | null>(null);
  const [pickedNames, setPickedNames] = useState<string[]>([]);
  const [opacity, setOpacity] = useState(1);
  const [fbZone, setFbZone] = useState<number>(currentCrosshairUtm.zone);
  const [fbHemi, setFbHemi] = useState<'N' | 'S'>(currentCrosshairUtm.hemisphere);
  const lastFilesRef = useRef<File[]>([]);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const clearRaster = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setRasterResult(null);
  };

  const fmt = (n: number, d = 3) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  const processRasterFiles = async (files: File[]) => {
    lastFilesRef.current = files;
    setPickedNames(files.map((f) => f.name));
    clearRaster();
    setErrorMessage(null);
    setImportSummary(null);
    setIsProcessing(true);

    const fallback = { zone: fbZone, hemi: fbHemi };
    const notes: string[] = [];

    try {
      const pdf = files.find((f) => extOf(f.name) === 'pdf');
      const tif = files.find((f) => ['tif', 'tiff'].includes(extOf(f.name)));
      const img = files.find((f) => ['jpg', 'jpeg', 'png', 'webp'].includes(extOf(f.name)));
      const ecw = files.find((f) => extOf(f.name) === 'ecw');

      let kind: RasterKind;
      let name: string;
      let standard: string;
      let source: RasterSource;
      let sourceSize = '';
      let rmsMeters: number | undefined;

      if (pdf) {
        kind = 'pdf';
        name = pdf.name;
        setProgressText('Membaca metadata GeoPDF...');
        const bytes = new Uint8Array(await pdf.arrayBuffer());
        const parsed = await parseGeoPdf(bytes, fallback);
        standard = parsed.standard;
        if (parsed.pageCount > 1) notes.push(`PDF punya ${parsed.pageCount} halaman; dipakai halaman ${parsed.pageIndex + 1} (yang berkoordinat).`);
        if (parsed.crsAssumed && parsed.crsNote) notes.push(parsed.crsNote);
        setProgressText('Merender area peta GeoPDF...');
        const rendered = await renderGeoPdf(bytes, parsed);
        source = rendered.source;
        rmsMeters = rendered.rmsMeters;
        sourceSize = `${rendered.pixelsRendered.width} × ${rendered.pixelsRendered.height} px (area peta)`;
      } else if (tif) {
        kind = 'tiff';
        name = tif.name;
        standard = 'GeoTIFF';
        setProgressText('Membaca GeoTIFF (bagian per bagian)...');
        const side = pickSidecars(tif, files);
        const worldFileText = side.world ? await side.world.text() : undefined;
        const prjCrs = side.prj ? crsFromWktText(await side.prj.text()) : null;
        const loaded = await loadGeoTiff(tif, { maxDim: MAX_OUTPUT_DIM, fallback, worldFileText, prjCrs });
        source = loaded.source;
        if (loaded.crsAssumed && loaded.crsNote) notes.push(loaded.crsNote);
        sourceSize = `${loaded.fullWidth} × ${loaded.fullHeight} px, ${loaded.bands} band ${loaded.bitsPerSample}-bit`;
      } else if (img) {
        kind = 'image';
        name = img.name;
        standard = ecw ? 'Gambar ekspor ECW + georeferensi' : 'Gambar + world file';
        setProgressText('Membaca gambar dan file georeferensi...');
        const side = pickSidecars(img, files);
        const size = await imageSize(img);
        const georef = await georefFromSidecars(side, size.width, size.height, fallback);
        if (!georef) {
          throw new Error(
            'Gambar JPG/PNG tidak punya koordinat. Pilih juga file world file-nya (.jgw / .pgw / .wld / .eww) dan file .prj bila ada, bersamaan dengan gambar.'
          );
        }
        if (georef.crsAssumed && georef.crsNote) notes.push(georef.crsNote);
        source = await loadGeorefImage(img, georef, MAX_OUTPUT_DIM);
        sourceSize = `${size.width} × ${size.height} px`;
      } else if (ecw) {
        throw new Error(
          'File ECW tidak bisa dibuka langsung di aplikasi. ECW adalah format terkompresi milik Hexagon dan tidak ada pembaca ECW gratis yang boleh disertakan ke dalam aplikasi HP. ' +
            'Solusi: minta/ekspor ulang peta yang sama sebagai GeoTIFF (disarankan), atau sebagai JPG/PNG beserta world file (.jgw/.pgw) atau .ers. ' +
            'Dari Pix4D, Metashape, Global Mapper, QGIS, atau ArcGIS pilihan ekspor GeoTIFF tersedia. Bila sudah punya gambar ekspornya, pilih bersama file .ecw/.ers/.eww sekaligus.'
        );
      } else {
        throw new Error('Pilih file GeoPDF (.pdf), GeoTIFF (.tif/.tiff), atau gambar (.jpg/.png) beserta world file-nya.');
      }

      setProgressText('Menempatkan peta ke koordinat bumi (reproyeksi)...');
      await new Promise((r) => setTimeout(r, 30)); // beri kesempatan UI menampilkan teks
      const warp = await warpToMercator(source, { maxDim: MAX_OUTPUT_DIM });

      if (rmsMeters !== undefined && rmsMeters > Math.max(1.5, warp.metersPerPixel * 3)) {
        notes.push(
          `Titik kontrol GeoPDF tidak lurus sempurna (galat rata-rata ${rmsMeters.toFixed(2)} m). Periksa posisi peta dengan titik yang diketahui.`
        );
      }
      if (warp.metersPerPixel > 5) {
        notes.push(`Resolusi rendah: ${warp.metersPerPixel.toFixed(2)} m per piksel. Untuk plot presisi gunakan file beresolusi lebih tinggi.`);
      }

      const url = URL.createObjectURL(warp.blob);
      previewRef.current = url;
      setRasterResult({
        kind,
        name,
        standard,
        warp,
        previewUrl: url,
        crsText: crsLabel(source.crs),
        notes,
        sourceSize,
      });
      setOpacity(kind === 'pdf' ? 0.9 : 1);
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof GeoPdfError || err instanceof Error
          ? err.message
          : 'Gagal memproses file.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const handleRasterPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    void processRasterFiles(files);
  };

  const handleZoneChange = (zone: number, hemi: 'N' | 'S') => {
    setFbZone(zone);
    setFbHemi(hemi);
  };

  const handleReprocess = () => {
    if (lastFilesRef.current.length > 0) void processRasterFiles(lastFilesRef.current);
  };

  const handleApplyRaster = async () => {
    if (!rasterResult) return;
    try {
      const id = `ov-${rasterResult.kind}-${Date.now()}`;
      await saveOverlayBlob(id, rasterResult.warp.blob);
      const typeMap: Record<RasterKind, GeoOverlay['type']> = { pdf: 'pdf', tiff: 'tiff', image: 'image' };
      const overlay: GeoOverlay = {
        id,
        name: rasterResult.name,
        type: typeMap[rasterResult.kind],
        url: overlayRef(id),
        bounds: rasterResult.warp.bounds,
        opacity,
        visible: true,
        filename: rasterResult.name,
        originalUtmBounds: rasterResult.warp.utmBounds,
      };
      onImportFeatures({ points: [], lines: [], polygons: [], overlay });
      if (rasterResult.kind === 'pdf') onSelectBasemap?.('geopdf');
      setImportSummary(`Peta "${rasterResult.name}" berhasil dipasang pada koordinat ${rasterResult.crsText}.`);
      setTimeout(() => onClose(), 700);
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal menyimpan peta ke penyimpanan HP (memori penuh?). Coba file yang lebih kecil.');
    }
  };

  // ---- DXF & KML ----
  const handleDxfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setImportSummary(null);

    try {
      const text = await file.text();
      const parsed = parseDxfWithLayers(text);
      setDxfRawResult(parsed);
      setDxfLayers(parsed.layers);
      setDxfFilename(file.name);
    } catch {
      setErrorMessage('Gagal membaca file DXF. Pastikan file berupa ASCII DXF AutoCAD valid.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleDxfLayer = (layerName: string) => {
    setDxfLayers((prev) =>
      prev.map((l) => (l.name === layerName ? { ...l, selected: !l.selected } : l))
    );
  };

  const handleToggleAllDxfLayers = (selectAll: boolean) => {
    setDxfLayers((prev) => prev.map((l) => ({ ...l, selected: selectAll })));
  };

  const handleApplyDxfImport = () => {
    if (!dxfRawResult) return;

    const selectedLayersSet = new Set(
      dxfLayers.filter((l) => l.selected).map((l) => l.name.toUpperCase())
    );

    const zoneNum = currentCrosshairUtm.zone;
    const hemi = currentCrosshairUtm.hemisphere;

    const filteredPoints = dxfRawResult.points.filter((p) =>
      selectedLayersSet.has(p.layer.toUpperCase())
    );

    const newPoints: SurveyPoint[] = filteredPoints.map((p, idx) => {
      const latLng = utmToLatLng(p.easting, p.northing, zoneNum, hemi);
      return {
        id: `dxf-pt-${Date.now()}-${idx}`,
        name: p.name,
        code: p.layer || 'DXF_PNT',
        color: p.colorHex,
        lat: latLng.lat,
        lng: latLng.lng,
        utm: latLngToUtm(latLng.lat, latLng.lng, p.elevation, zoneNum, hemi),
        timestamp: Date.now(),
        description: `Imported from ${dxfFilename} (Layer: ${p.layer})`,
      };
    });

    const filteredLines = dxfRawResult.lines.filter((l) =>
      selectedLayersSet.has(l.layer.toUpperCase())
    );

    const newLines: SurveyLine[] = filteredLines.map((l, idx) => {
      const vertices = l.vertices.map((v) => {
        const ll = utmToLatLng(v.easting, v.northing, zoneNum, hemi);
        return { lat: ll.lat, lng: ll.lng, elevation: v.elevation };
      });
      return {
        id: `dxf-ln-${Date.now()}-${idx}`,
        name: l.name,
        code: l.layer || 'DXF_LINE',
        color: l.colorHex,
        strokeWidth: 3,
        vertices,
        utmVertices: vertices.map((v) => latLngToUtm(v.lat, v.lng, v.elevation, zoneNum, hemi)),
        totalLengthMeters: 0,
        segments: [],
        timestamp: Date.now(),
        description: `Imported from ${dxfFilename} (Layer: ${l.layer})`,
      };
    });

    onImportFeatures({
      points: newPoints,
      lines: newLines,
      polygons: [],
    });

    setImportSummary(
      `Sukses import DXF: ${newPoints.length} Titik dan ${newLines.length} Garis pada ${selectedLayersSet.size} layer terpilih dengan warna asli.`
    );
    setDxfRawResult(null);
  };

  // Handle KML
  const handleKmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setImportSummary(null);

    try {
      const text = await file.text();
      const parsed = parseKmlString(text);

      const zoneNum = currentCrosshairUtm.zone;
      const hemi = currentCrosshairUtm.hemisphere;

      const newPoints: SurveyPoint[] = parsed.points.map((p, idx) => ({
        id: `kml-pt-${Date.now()}-${idx}`,
        name: p.name,
        code: 'KML_PNT',
        color: '#2563eb',
        lat: p.lat,
        lng: p.lng,
        utm: latLngToUtm(p.lat, p.lng, p.elevation, zoneNum, hemi),
        timestamp: Date.now(),
        description: p.description || `Imported from ${file.name}`,
      }));

      const newLines: SurveyLine[] = parsed.lines.map((l, idx) => {
        const vertices = l.coordinates.map(([lat, lng]) => ({ lat, lng, elevation: 0 }));
        return {
          id: `kml-ln-${Date.now()}-${idx}`,
          name: l.name,
          code: 'KML_LINE',
          color: '#0284c7',
          strokeWidth: 3,
          vertices,
          utmVertices: vertices.map((v) => latLngToUtm(v.lat, v.lng, 0, zoneNum, hemi)),
          totalLengthMeters: 0,
          segments: [],
          timestamp: Date.now(),
          description: l.description || `Imported from ${file.name}`,
        };
      });

      const newPolygons: SurveyPolygon[] = parsed.polygons.map((pg, idx) => {
        const vertices = pg.coordinates.map(([lat, lng]) => ({ lat, lng, elevation: 0 }));
        return {
          id: `kml-pg-${Date.now()}-${idx}`,
          name: pg.name,
          code: 'KML_POLY',
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.25,
          vertices,
          utmVertices: vertices.map((v) => latLngToUtm(v.lat, v.lng, 0, zoneNum, hemi)),
          areaSquareMeters: 0,
          areaHectares: 0,
          perimeterMeters: 0,
          centroid: [0, 0],
          segments: [],
          timestamp: Date.now(),
          description: pg.description || `Imported from ${file.name}`,
        };
      });

      onImportFeatures({
        points: newPoints,
        lines: newLines,
        polygons: newPolygons,
      });

      setImportSummary(
        `Sukses import KML: ${newPoints.length} Titik, ${newLines.length} Garis, ${newPolygons.length} Poligon.`
      );
    } catch {
      setErrorMessage('Gagal membaca file KML. Pastikan format XML KML valid.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">
              IMPORT PETA & CAD
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              GeoPDF, GeoTIFF, gambar + world file, DXF & KML
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-[#0b0f17] border-b border-slate-200 dark:border-white/10 text-xs font-bold overflow-x-auto no-scrollbar">
          {([
            { id: 'raster', label: 'Peta Raster', Icon: Layers },
            { id: 'dxf', label: 'AutoCAD DXF', Icon: Upload },
            { id: 'kml', label: 'KML Google', Icon: FileText },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3 py-2 rounded-xl whitespace-nowrap flex items-center gap-1.5 transition shrink-0 ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-red-700 dark:text-red-300">Import gagal</div>
                <div className="text-[11px] text-red-600 dark:text-red-300 leading-relaxed">{errorMessage}</div>
              </div>
            </div>
          )}

          {importSummary && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{importSummary}</span>
            </div>
          )}

          {/* TAB: PETA RASTER */}
          {activeTab === 'raster' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                  <div>
                    <b>GeoPDF</b> (.pdf) dan <b>GeoTIFF</b> (.tif) dibaca langsung. Untuk <b>JPG/PNG</b> atau hasil ekspor <b>ECW</b>,
                    pilih gambarnya <b>bersamaan</b> dengan file pendamping (.jgw/.pgw/.wld/.eww/.ers/.prj).
                  </div>
                  <div>
                    File <b>.ecw</b> asli tidak bisa dibuka langsung di HP (format tertutup). Ekspor ulang ke GeoTIFF.
                  </div>
                </div>
              </div>

              <label className="block cursor-pointer">
                <input type="file" multiple className="hidden" onChange={handleRasterPick} />
                <div className="p-5 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-2xl text-center hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition">
                  <FileImage className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Pilih file peta dari HP</div>
                  <div className="text-xs text-slate-500 mt-1">Boleh pilih beberapa file sekaligus</div>
                </div>
              </label>

              {pickedNames.length > 0 && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 break-all">
                  File dipilih: {pickedNames.join(', ')}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Zona UTM cadangan <span className="font-normal text-slate-500">(dipakai hanya bila file tidak menyebut zona)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={fbZone}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(60, parseInt(e.target.value || '1', 10)));
                      handleZoneChange(v, fbHemi);
                    }}
                    className="w-20 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-white"
                  />
                  <select
                    value={fbHemi}
                    onChange={(e) => handleZoneChange(fbZone, e.target.value as 'N' | 'S')}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-white"
                  >
                    <option value="S">Selatan (S)</option>
                    <option value="N">Utara (N)</option>
                  </select>
                  {rasterResult && (
                    <button
                      onClick={handleReprocess}
                      className="ml-auto px-3 py-2 text-xs font-bold rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white"
                    >
                      Proses ulang
                    </button>
                  )}
                </div>
              </div>

              {rasterResult && (
                <div className="space-y-3">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[repeating-conic-gradient(#cbd5e1_0%_25%,#f8fafc_0%_50%)] bg-[length:16px_16px]">
                    <img
                      src={rasterResult.previewUrl}
                      alt="Pratinjau peta"
                      className="w-full max-h-64 object-contain"
                      style={{ opacity }}
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{rasterResult.standard} - georeferensi terbaca</span>
                    </div>
                    <div className="break-all"><b>File:</b> {rasterResult.name}</div>
                    <div><b>Sistem koordinat:</b> {rasterResult.crsText}</div>
                    <div><b>Ukuran sumber:</b> {rasterResult.sourceSize}</div>
                    <div><b>Resolusi tanah:</b> {fmt(rasterResult.warp.metersPerPixel, 3)} m/piksel</div>
                    <div className="font-mono text-[10.5px] leading-relaxed pt-1">
                      <div>Zona {rasterResult.warp.utmBounds.zone}</div>
                      <div>E {fmt(rasterResult.warp.utmBounds.minE)} - {fmt(rasterResult.warp.utmBounds.maxE)}</div>
                      <div>N {fmt(rasterResult.warp.utmBounds.minN)} - {fmt(rasterResult.warp.utmBounds.maxN)}</div>
                    </div>
                  </div>

                  {rasterResult.notes.map((n, i) => (
                    <div key={i} className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{n}</span>
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span>Transparansi peta</span>
                      <span className="font-mono">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <button
                    onClick={handleApplyRaster}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold rounded-2xl shadow flex items-center justify-center gap-2 transition"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Pasang ke Peta</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DXF AutoCAD */}
          {activeTab === 'dxf' && (
            <div className="space-y-4">
              {!dxfRawResult ? (
                <div className="p-4 bg-slate-50 dark:bg-white/5 border border-dashed border-blue-400 dark:border-white/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 hover:border-blue-600 transition cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".dxf"
                    onChange={handleDxfFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Pilih File .DXF dari AutoCAD / Surpac / Minex
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Mendeteksi layer CAD dan warna asli garis, titik, dan area
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50 dark:bg-[#0c101b] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Pilih Layer yang Ingin Di-Import ({dxfLayers.length} Layer Terdeteksi)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{dxfFilename}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAllDxfLayers(true)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Pilih Semua
                      </button>
                      <button
                        onClick={() => handleToggleAllDxfLayers(false)}
                        className="text-[10px] font-bold text-slate-400 hover:underline"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {dxfLayers.map((layer) => (
                      <div
                        key={layer.name}
                        onClick={() => handleToggleDxfLayer(layer.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          layer.selected
                            ? 'bg-white dark:bg-white/10 border-blue-400/60 shadow-sm'
                            : 'bg-slate-100/60 dark:bg-white/5 border-transparent opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {layer.selected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : (
                            <SquareIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-black/20"
                            style={{ backgroundColor: layer.colorHex }}
                          />
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {layer.name}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">
                          {layer.pointCount > 0 && `${layer.pointCount} pt `}
                          {layer.lineCount > 0 && `${layer.lineCount} ln`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setDxfRawResult(null)}
                      className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-600 dark:text-slate-400"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleApplyDxfImport}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md active:scale-98 transition"
                    >
                      IMPORT LAYER TERPILIH KE PETA
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KML */}
          {activeTab === 'kml' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-white/5 border border-dashed border-blue-400 dark:border-white/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 hover:border-blue-600 transition cursor-pointer relative group">
                <input
                  type="file"
                  accept=".kml,.xml"
                  onChange={handleKmlUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Pilih File .KML dari HP / Penyimpanan
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Mendukung Point, LineString, dan Polygon
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-4 text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{progressText || 'Memproses file...'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
