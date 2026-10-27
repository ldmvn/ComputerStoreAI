import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const src = 'C:\\Users\\ldm\\.gemini\\antigravity-ide\\brain\\82db63d6-5528-446f-9663-aa02883ba5dd\\.user_uploaded\\media_1792948571172.png';
    const destDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, 'flash-sale-ref.png');
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    return NextResponse.json({ success: true, size: stat.size, path: dest });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
