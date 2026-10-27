import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'flash-sale-ref.png');
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  
  let hasSharp = false;
  try {
    require('sharp');
    hasSharp = true;
  } catch (e) {}

  return NextResponse.json({
    width,
    height,
    hasSharp,
    size: buf.length,
  });
}
