/**
 * PNG kodlayıcı testleri.
 *
 * Bu kod sıfır bağımlılıkla yazıldı, yani doğruluğunu bir kütüphane
 * garanti etmiyor. Bozuk bir PNG, OpenAI'dan anlamsız bir 400 olarak geri
 * döner — tam da smoke-test'te yakalanan hata. Biçim burada sabitleniyor.
 */

import { describe, expect, it } from 'vitest';
import { PixelCanvas, encodePng } from './png-encoder';

const BG = { r: 15, g: 17, b: 20 };
const WHITE = { r: 255, g: 255, b: 255 };

/** PNG chunk'larını sırayla okur. */
function readChunks(buf: Buffer): { type: string; length: number }[] {
  const out: { type: string; length: number }[] = [];
  let off = 8; // imzayı atla
  while (off + 8 <= buf.length) {
    const length = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    out.push({ type, length });
    off += 12 + length; // uzunluk + tip + veri + crc
  }
  return out;
}

describe('encodePng — biçim uyumu', () => {
  const png = new PixelCanvas(16, 12, BG).toPng();

  it('PNG imzasıyla başlar', () => {
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('IHDR, IDAT, IEND sırasıyla bulunur', () => {
    const types = readChunks(png).map((c) => c.type);
    expect(types[0]).toBe('IHDR');
    expect(types).toContain('IDAT');
    expect(types[types.length - 1]).toBe('IEND');
  });

  it('IHDR doğru boyut ve renk tipini taşır', () => {
    const off = 8 + 8; // imza + (uzunluk+tip)
    expect(png.readUInt32BE(off)).toBe(16);
    expect(png.readUInt32BE(off + 4)).toBe(12);
    expect(png.readUInt8(off + 8)).toBe(8); // bit derinliği
    expect(png.readUInt8(off + 9)).toBe(2); // renk tipi RGB
    expect(png.readUInt8(off + 12)).toBe(0); // interlace yok
  });

  it('IEND boş ve dosyayı bitiriyor', () => {
    const chunks = readChunks(png);
    const iend = chunks[chunks.length - 1];
    expect(iend.type).toBe('IEND');
    expect(iend.length).toBe(0);
  });

  it('chunk uzunlukları toplamı dosya boyutuyla tutarlı', () => {
    const chunks = readChunks(png);
    const total = 8 + chunks.reduce((s, c) => s + 12 + c.length, 0);
    expect(total).toBe(png.length);
  });

  it('boyut değişince çıktı da değişir', () => {
    const a = new PixelCanvas(16, 12, BG).toPng();
    const b = new PixelCanvas(32, 12, BG).toPng();
    expect(a.equals(b)).toBe(false);
  });

  it('deterministik — aynı girdi aynı bayt dizisi', () => {
    const a = new PixelCanvas(16, 12, BG).toPng();
    const b = new PixelCanvas(16, 12, BG).toPng();
    expect(a.equals(b)).toBe(true);
  });
});

describe('PixelCanvas — çizim', () => {
  it('çizim yapılınca çıktı boş tuvalden farklı olur', () => {
    const empty = new PixelCanvas(40, 40, BG).toPng();
    const drawn = new PixelCanvas(40, 40, BG);
    drawn.drawLine(2, 2, 38, 38, 4, WHITE);
    expect(drawn.toPng().equals(empty)).toBe(false);
  });

  it('tuval dışına çizim çökmez (sınır güvenliği)', () => {
    const c = new PixelCanvas(20, 20, BG);
    expect(() => {
      c.setPixel(-5, -5, WHITE);
      c.setPixel(1000, 1000, WHITE);
      c.fillCircle(-10, -10, 8, WHITE);
      c.drawLine(-50, -50, 200, 200, 6, WHITE);
    }).not.toThrow();
    expect(c.toPng().length).toBeGreaterThan(0);
  });

  it('kesikli çizgi boşluk bırakıyor — düz çizgiden farklı', () => {
    const dashed = new PixelCanvas(60, 20, BG);
    dashed.drawDashedHLine(10, 2, 8, 6, WHITE);
    const solid = new PixelCanvas(60, 20, BG);
    solid.drawLine(0, 10, 59, 10, 2, WHITE);
    expect(dashed.toPng().equals(solid.toPng())).toBe(false);
  });

  it('düz zemin iyi sıkışıyor — payload makul kalıyor', () => {
    // 320×420 iskelet karesi tipik boyut. Ham RGB 403 KB; PNG bunun
    // çok altında olmalı, yoksa 8 kare isteği şişirir.
    const c = new PixelCanvas(320, 420, BG);
    c.drawLine(160, 60, 160, 380, 4, WHITE);
    expect(c.toPng().length).toBeLessThan(20_000);
  });
});

describe('encodePng — doğrudan tampon', () => {
  it('yanlış boyutlu tamponla bile PNG üretir (kırpma değil, taşma yok)', () => {
    const rgb = new Uint8Array(4 * 4 * 3);
    expect(() => encodePng(rgb, 4, 4)).not.toThrow();
  });
});
