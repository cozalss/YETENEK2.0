import 'server-only';

/**
 * Minimal PNG kodlayıcı ve rasterleştirici — **sıfır bağımlılık**.
 *
 * ## Neden gerekli
 *
 * İskelet çizimi SVG olarak üretiliyordu ve OpenAI Vision SVG kabul etmiyor:
 *
 *   > "The image data you provided does not represent a valid image...
 *   >  supported image formats: ['image/jpeg', 'image/png', 'image/gif',
 *   >  'image/webp']"
 *
 * Gerçek bir çağrıyla yapılan smoke-test'te yakalandı. Çözüm için `sharp` ya
 * da `canvas` gibi bir paket eklenebilirdi; ikisi de yerel derleme gerektiren
 * ağır bağımlılıklar ve Vercel'de ek yük. Çizdiğimiz şey birkaç çizgi ve
 * daireden ibaret olduğu için PNG'yi doğrudan üretmek hem daha hafif hem
 * deterministik (birim testlenebilir).
 *
 * ## Biçim
 *
 * PNG = imza + IHDR + IDAT + IEND. Renk tipi 2 (RGB, alfa yok — şeffaflığa
 * ihtiyacımız yok, dosya küçülür). Her tarama satırı 0 filtre baytıyla
 * başlıyor; sıkıştırmayı Node'un yerleşik `zlib`'i yapıyor.
 *
 * Ref: PNG Specification (ISO/IEC 15948:2004), §5 ve §11.
 */

import { deflateSync } from 'node:zlib';

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Basit RGB piksel tamponu — satır öncelikli, 3 bayt/piksel. */
export class PixelCanvas {
  private readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    background: Rgb
  ) {
    this.data = new Uint8Array(width * height * 3);
    this.fill(background);
  }

  private fill(c: Rgb): void {
    for (let i = 0; i < this.data.length; i += 3) {
      this.data[i] = c.r;
      this.data[i + 1] = c.g;
      this.data[i + 2] = c.b;
    }
  }

  setPixel(x: number, y: number, c: Rgb): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const i = (py * this.width + px) * 3;
    this.data[i] = c.r;
    this.data[i + 1] = c.g;
    this.data[i + 2] = c.b;
  }

  /** Dolu daire — kalın çizgilerin ve eklem noktalarının yapı taşı. */
  fillCircle(cx: number, cy: number, radius: number, c: Rgb): void {
    const r2 = radius * radius;
    const x0 = Math.floor(cx - radius);
    const x1 = Math.ceil(cx + radius);
    const y0 = Math.floor(cy - radius);
    const y1 = Math.ceil(cy + radius);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.setPixel(x, y, c);
      }
    }
  }

  /**
   * Kalın çizgi — yol boyunca dolu daireler.
   *
   * Bresenham + kalınlık yerine bu yaklaşım seçildi: uç noktalar
   * kendiliğinden yuvarlak oluyor ve eklem birleşimlerinde boşluk kalmıyor.
   */
  drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number,
    c: Rgb
  ): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist));
    const radius = Math.max(0.5, thickness / 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.fillCircle(x0 + dx * t, y0 + dy * t, radius, c);
    }
  }

  /** Yatay kesikli çizgi — yer referansı için. */
  drawDashedHLine(
    y: number,
    thickness: number,
    dash: number,
    gap: number,
    c: Rgb
  ): void {
    for (let x = 0; x < this.width; x += dash + gap) {
      this.drawLine(x, y, Math.min(x + dash, this.width - 1), y, thickness, c);
    }
  }

  toPng(): Buffer {
    return encodePng(this.data, this.width, this.height);
  }
}

/* ───────────────── PNG kodlama ───────────────── */

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** CRC-32 tablosu (IEEE 802.3 polinomu) — bir kez hesaplanır. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** PNG chunk: uzunluk + tip + veri + CRC(tip+veri). */
function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * RGB piksel tamponunu PNG'ye kodlar.
 *
 * @param rgb   width × height × 3 bayt, satır öncelikli.
 */
export function encodePng(
  rgb: Uint8Array,
  width: number,
  height: number
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit derinliği
  ihdr.writeUInt8(2, 9); // renk tipi 2 = RGB
  ihdr.writeUInt8(0, 10); // sıkıştırma: deflate
  ihdr.writeUInt8(0, 11); // filtre yöntemi: adaptif
  ihdr.writeUInt8(0, 12); // interlace: yok

  // Her tarama satırı bir filtre baytıyla başlar. 0 = filtre yok; iskelet
  // çizimi çoğunlukla düz zemin olduğu için deflate zaten çok iyi sıkıştırıyor,
  // filtre denemenin kazancı maliyetini karşılamıyor.
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
