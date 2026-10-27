import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function crc32(buf: Buffer) {
  let table = (crc32 as any).table;
  if (!table) {
    table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    (crc32 as any).table = table;
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function makeChunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function parsePNG(buf: Buffer) {
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatParts: Buffer[] = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatParts.push(data);
    }
  }

  return { width, height, bitDepth, colorType, rawData: zlib.inflateSync(Buffer.concat(idatParts)) };
}

function unfilterScanlines(raw: Buffer, width: number, height: number, bpp: number) {
  const rowStride = width * bpp;
  const uncompressed = Buffer.alloc(height * rowStride);
  let srcOffset = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[srcOffset++];
    const destOffset = y * rowStride;
    const prevOffset = (y - 1) * rowStride;

    for (let x = 0; x < rowStride; x++) {
      const val = raw[srcOffset++];
      const a = x >= bpp ? uncompressed[destOffset + x - bpp] : 0;
      const b = y > 0 ? uncompressed[prevOffset + x] : 0;
      const c = (x >= bpp && y > 0) ? uncompressed[prevOffset + x - bpp] : 0;

      let res = val;
      if (filter === 1) res = (val + a) & 0xff;
      else if (filter === 2) res = (val + b) & 0xff;
      else if (filter === 3) res = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        res = (val + pr) & 0xff;
      }
      uncompressed[destOffset + x] = res;
    }
  }

  return uncompressed;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'flash-sale-ref.png');
    const buf = fs.readFileSync(filePath);
    const png = parsePNG(buf);
    const bpp = png.colorType === 6 ? 4 : 3;
    const uncompressed = unfilterScanlines(png.rawData, png.width, png.height, bpp);

    // Let's inspect column 500 (middle of the image) from y=0 to y=150
    const col500: any[] = [];
    for (let y = 0; y < 140; y += 5) {
      const idx = (y * png.width + 500) * bpp;
      col500.push({ y, r: uncompressed[idx], g: uncompressed[idx+1], b: uncompressed[idx+2] });
    }

    // In the image, top border of the flash sale container is at y around 25.
    // The top of the lightning bolt is at y ~ 38.
    // The top of the 3D banner is at y ~ 45.
    // The bottom of the ribbon is at y ~ 118.
    // The top of the white cards is at y ~ 130!
    // Let's crop from y = 30 to y = 124, x = 275 to 765!
    const cropX = 270;
    const cropY = 24;
    const cropW = 495;
    const cropH = 84;

    const croppedRaw = Buffer.alloc(cropH * (1 + cropW * 4));
    let rawIdx = 0;

    for (let y = 0; y < cropH; y++) {
      croppedRaw[rawIdx++] = 0;
      const srcRow = (cropY + y) * (png.width * bpp);

      for (let x = 0; x < cropW; x++) {
        const srcPx = srcRow + (cropX + x) * bpp;
        const r = uncompressed[srcPx];
        const g = uncompressed[srcPx + 1];
        const b = uncompressed[srcPx + 2];
        const a = bpp === 4 ? uncompressed[srcPx + 3] : 255;

        croppedRaw[rawIdx++] = r;
        croppedRaw[rawIdx++] = g;
        croppedRaw[rawIdx++] = b;
        croppedRaw[rawIdx++] = a;
      }
    }

    const deflated = zlib.deflateSync(croppedRaw);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(cropW, 0);
    ihdrData.writeUInt32BE(cropH, 4);
    ihdrData[8] = 8;
    ihdrData[9] = 6;
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;

    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdrChunk = makeChunk('IHDR', ihdrData);
    const idatChunk = makeChunk('IDAT', deflated);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    const finalPng = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);

    const outPath = path.join(process.cwd(), 'public', 'flash-sale-header.png');
    fs.writeFileSync(outPath, finalPng);

    return NextResponse.json({
      success: true,
      col500,
      crop: { x: cropX, y: cropY, width: cropW, height: cropH },
      outSize: finalPng.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
