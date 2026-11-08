/**
 * Pembaca struktur PDF ringan (tanpa dependensi) khusus untuk mengambil metadata
 * georeferensi (VP/Measure/GPTS/LPTS/LGIDict). Tidak merender halaman.
 * - Memindai semua "N G obj" (tahan terhadap xref rusak / update inkremental)
 * - Mendukung Object Stream (PDF 1.5+) lewat DecompressionStream('deflate')
 */

export type PdfValue =
  | number
  | boolean
  | null
  | { n: string } // nama
  | { s: string } // string
  | { ref: number } // referensi tidak langsung
  | PdfValue[]
  | { [k: string]: PdfValue };

export type PdfDict = { [k: string]: PdfValue };

const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

function isWs(c: number) {
  return WS.has(c);
}
function isRegular(c: number) {
  return !WS.has(c) && !DELIM.has(c);
}

class Lexer {
  pos: number;
  constructor(public buf: Uint8Array, pos = 0, public end = buf.length) {
    this.pos = pos;
  }
  skipWs() {
    const b = this.buf;
    while (this.pos < this.end) {
      const c = b[this.pos];
      if (isWs(c)) this.pos++;
      else if (c === 0x25) {
        while (this.pos < this.end && b[this.pos] !== 10 && b[this.pos] !== 13) this.pos++;
      } else break;
    }
  }
  private readWord(): string {
    const b = this.buf;
    const s = this.pos;
    while (this.pos < this.end && isRegular(b[this.pos])) this.pos++;
    let out = '';
    for (let i = s; i < this.pos; i++) out += String.fromCharCode(b[i]);
    return out;
  }
  parseValue(depth = 0): PdfValue {
    if (depth > 40) throw new Error('PDF: nesting terlalu dalam');
    this.skipWs();
    if (this.pos >= this.end) throw new Error('PDF: akhir data');
    const b = this.buf;
    const c = b[this.pos];
    if (c === 0x2f) {
      this.pos++;
      const w = this.readWord();
      return { n: w.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) };
    }
    if (c === 0x5b) {
      this.pos++;
      const arr: PdfValue[] = [];
      for (;;) {
        this.skipWs();
        if (this.pos >= this.end) throw new Error('PDF: array tidak tertutup');
        if (b[this.pos] === 0x5d) {
          this.pos++;
          break;
        }
        arr.push(this.parseValue(depth + 1));
      }
      return arr;
    }
    if (c === 0x3c && b[this.pos + 1] === 0x3c) {
      this.pos += 2;
      const d: PdfDict = {};
      for (;;) {
        this.skipWs();
        if (this.pos >= this.end) throw new Error('PDF: dict tidak tertutup');
        if (b[this.pos] === 0x3e && b[this.pos + 1] === 0x3e) {
          this.pos += 2;
          break;
        }
        const k = this.parseValue(depth + 1);
        if (!k || typeof k !== 'object' || !('n' in k)) throw new Error('PDF: kunci dict tidak valid');
        d[(k as { n: string }).n] = this.parseValue(depth + 1);
      }
      return d;
    }
    if (c === 0x3c) {
      this.pos++;
      let hex = '';
      while (this.pos < this.end && b[this.pos] !== 0x3e) {
        const ch = String.fromCharCode(b[this.pos++]);
        if (/[0-9a-fA-F]/.test(ch)) hex += ch;
      }
      this.pos++;
      if (hex.length % 2) hex += '0';
      let s = '';
      for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      return { s };
    }
    if (c === 0x28) {
      this.pos++;
      let depthP = 1;
      let s = '';
      while (this.pos < this.end && depthP > 0) {
        let ch = b[this.pos++];
        if (ch === 0x5c) {
          const nx = b[this.pos++];
          if (nx === 0x6e) s += '\n';
          else if (nx === 0x72) s += '\r';
          else if (nx === 0x74) s += '\t';
          else if (nx === 0x62) s += '\b';
          else if (nx === 0x66) s += '\f';
          else if (nx >= 0x30 && nx <= 0x37) {
            let o = nx - 0x30;
            for (let k = 0; k < 2; k++) {
              const d = b[this.pos];
              if (d >= 0x30 && d <= 0x37) {
                o = o * 8 + d - 0x30;
                this.pos++;
              } else break;
            }
            s += String.fromCharCode(o & 255);
          } else if (nx === 10 || nx === 13) {
            if (nx === 13 && b[this.pos] === 10) this.pos++;
          } else s += String.fromCharCode(nx);
          continue;
        }
        if (ch === 0x28) depthP++;
        else if (ch === 0x29) {
          depthP--;
          if (depthP === 0) break;
        }
        s += String.fromCharCode(ch);
      }
      return { s };
    }
    const w = this.readWord();
    if (w === '') throw new Error('PDF: token tidak dikenal');
    if (w === 'true') return true;
    if (w === 'false') return false;
    if (w === 'null') return null;
    const num = Number(w);
    if (!isNaN(num) && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) {
      // kemungkinan referensi "N G R"
      if (/^\d+$/.test(w)) {
        const save = this.pos;
        this.skipWs();
        const g = this.readWord();
        if (/^\d+$/.test(g)) {
          this.skipWs();
          if (b[this.pos] === 0x52 && (this.pos + 1 >= this.end || !isRegular(b[this.pos + 1]))) {
            this.pos++;
            return { ref: num };
          }
        }
        this.pos = save;
      }
      return num;
    }
    throw new Error('PDF: token tidak dikenal: ' + w);
  }
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate');
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface ObjRecord {
  offset: number; // posisi setelah kata "obj"
  value?: PdfValue;
  parsed?: boolean;
  streamStart?: number;
  dictEnd?: number;
  inStm?: { buf: Uint8Array };
}

export class PdfDoc {
  private objs = new Map<number, ObjRecord>();
  constructor(public buf: Uint8Array) {}

  static async open(buffer: ArrayBuffer | Uint8Array): Promise<PdfDoc> {
    const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const doc = new PdfDoc(buf);
    const head = String.fromCharCode(...buf.subarray(0, 8));
    if (!head.startsWith('%PDF')) throw new Error('Bukan file PDF yang valid.');
    doc.scan();
    await doc.expandObjectStreams();
    return doc;
  }

  private scan() {
    const b = this.buf;
    const len = b.length;
    for (let i = 3; i < len - 3; i++) {
      if (b[i] !== 0x6f || b[i + 1] !== 0x62 || b[i + 2] !== 0x6a) continue; // "obj"
      if (!isWs(b[i - 1])) continue; // bukan "endobj"
      const nx = b[i + 3];
      if (!(isWs(nx) || DELIM.has(nx))) continue;
      // mundur: gen, num
      let j = i - 1;
      while (j >= 0 && isWs(b[j])) j--;
      let e = j;
      while (j >= 0 && b[j] >= 0x30 && b[j] <= 0x39) j--;
      if (j === e) continue;
      const gen = e - j; // hanya cek ada digit
      void gen;
      while (j >= 0 && isWs(b[j])) j--;
      e = j;
      while (j >= 0 && b[j] >= 0x30 && b[j] <= 0x39) j--;
      if (j === e) continue;
      let numStr = '';
      for (let k = j + 1; k <= e; k++) numStr += String.fromCharCode(b[k]);
      const num = parseInt(numStr, 10);
      if (!isFinite(num)) continue;
      this.objs.set(num, { offset: i + 3 });
    }
  }

  private parseRecord(num: number): ObjRecord | undefined {
    const rec = this.objs.get(num);
    if (!rec) return undefined;
    if (rec.parsed) return rec;
    rec.parsed = true;
    try {
      const lx = new Lexer(rec.inStm ? rec.inStm.buf : this.buf, rec.offset);
      rec.value = lx.parseValue();
      if (!rec.inStm) {
        lx.skipWs();
        const b = this.buf;
        if (
          b[lx.pos] === 0x73 &&
          b[lx.pos + 1] === 0x74 &&
          b[lx.pos + 2] === 0x72 &&
          b[lx.pos + 3] === 0x65 &&
          b[lx.pos + 4] === 0x61 &&
          b[lx.pos + 5] === 0x6d
        ) {
          let p = lx.pos + 6;
          if (b[p] === 13) p++;
          if (b[p] === 10) p++;
          rec.streamStart = p;
        }
      }
    } catch {
      rec.value = undefined;
    }
    return rec;
  }

  get(ref: PdfValue): PdfValue | undefined {
    if (ref && typeof ref === 'object' && 'ref' in ref) {
      return this.parseRecord((ref as { ref: number }).ref)?.value;
    }
    return ref;
  }

  /** Dereferensi bertingkat. */
  resolve(v: PdfValue | undefined): PdfValue | undefined {
    let cur: PdfValue | undefined = v;
    for (let i = 0; i < 10 && cur && typeof cur === 'object' && 'ref' in cur; i++) cur = this.get(cur);
    return cur;
  }

  dict(v: PdfValue | undefined): PdfDict | undefined {
    const r = this.resolve(v);
    if (r && typeof r === 'object' && !Array.isArray(r) && !('n' in r) && !('s' in r) && !('ref' in r)) {
      return r as PdfDict;
    }
    return undefined;
  }

  array(v: PdfValue | undefined): PdfValue[] | undefined {
    const r = this.resolve(v);
    return Array.isArray(r) ? r : undefined;
  }

  num(v: PdfValue | undefined): number | undefined {
    const r = this.resolve(v);
    return typeof r === 'number' ? r : undefined;
  }

  name(v: PdfValue | undefined): string | undefined {
    const r = this.resolve(v);
    return r && typeof r === 'object' && 'n' in r ? (r as { n: string }).n : undefined;
  }

  str(v: PdfValue | undefined): string | undefined {
    const r = this.resolve(v);
    return r && typeof r === 'object' && 's' in r ? (r as { s: string }).s : undefined;
  }

  numArray(v: PdfValue | undefined): number[] | undefined {
    const a = this.array(v);
    if (!a) return undefined;
    const out: number[] = [];
    for (const x of a) {
      const n = this.num(x);
      if (n === undefined) return undefined;
      out.push(n);
    }
    return out;
  }

  /** Ambil data stream mentah dari objek bernomor num (tanpa dekode). */
  private rawStream(num: number): Uint8Array | undefined {
    const rec = this.parseRecord(num);
    if (!rec || rec.streamStart === undefined || !rec.value || typeof rec.value !== 'object') return undefined;
    const d = rec.value as PdfDict;
    const b = this.buf;
    const start = rec.streamStart;
    let end = -1;
    const L = this.num(d['Length']);
    if (L !== undefined && L >= 0 && start + L <= b.length) {
      let p = start + L;
      while (p < b.length && isWs(b[p])) p++;
      if (String.fromCharCode(...b.subarray(p, p + 9)) === 'endstream') end = start + L;
    }
    if (end < 0) {
      // cari "endstream"
      const pat = [0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d];
      outer: for (let i = start; i < b.length - 9; i++) {
        if (b[i] !== 0x65) continue;
        for (let k = 1; k < 9; k++) if (b[i + k] !== pat[k]) continue outer;
        end = i;
        while (end > start && (b[end - 1] === 10 || b[end - 1] === 13)) end--;
        break;
      }
    }
    if (end < 0) return undefined;
    return b.subarray(start, end);
  }

  async streamData(num: number): Promise<Uint8Array | undefined> {
    const rec = this.parseRecord(num);
    if (!rec || !rec.value || typeof rec.value !== 'object') return undefined;
    const d = rec.value as PdfDict;
    const raw = this.rawStream(num);
    if (!raw) return undefined;
    let filter = this.resolve(d['Filter']);
    const filters: string[] = [];
    if (Array.isArray(filter)) for (const f of filter) filters.push(this.name(f) ?? '');
    else if (filter) filters.push(this.name(filter) ?? '');
    let data: Uint8Array = raw;
    for (const f of filters) {
      if (f === 'FlateDecode' || f === 'Fl') data = await inflate(data);
      else throw new Error('Filter stream tidak didukung: ' + f);
    }
    return data;
  }

  private async expandObjectStreams() {
    const b = this.buf;
    const cands: number[] = [];
    for (const [num, rec] of this.objs) {
      const peek = Math.min(rec.offset + 400, b.length);
      let t = '';
      for (let i = rec.offset; i < peek; i++) t += String.fromCharCode(b[i]);
      if (t.includes('/ObjStm')) cands.push(num);
    }
    for (const num of cands) {
      try {
        const rec = this.parseRecord(num);
        const d = rec?.value as PdfDict | undefined;
        if (!d || this.name(d['Type']) !== 'ObjStm') continue;
        const N = this.num(d['N']) ?? 0;
        const first = this.num(d['First']) ?? 0;
        const data = await this.streamData(num);
        if (!data) continue;
        const hl = new Lexer(data, 0, first);
        const pairs: Array<[number, number]> = [];
        for (let i = 0; i < N; i++) {
          const a = hl.parseValue();
          const o = hl.parseValue();
          if (typeof a === 'number' && typeof o === 'number') pairs.push([a, o]);
        }
        for (const [onum, off] of pairs) {
          if (!this.objs.has(onum)) {
            this.objs.set(onum, { offset: first + off, inStm: { buf: data } });
          }
        }
      } catch {
        // abaikan object stream rusak
      }
    }
  }

  /** Semua nomor objek (untuk pencarian Catalog dsb). */
  objectNumbers(): number[] {
    return [...this.objs.keys()];
  }
}
