// This route is no longer the primary path — getCommunes() in address.service.ts
// now loads from /vn-communes.json directly (local static asset, no external API).
// Kept for any external/legacy consumers that may call it directly.
export const dynamic = 'force-dynamic';

import type { Commune } from '@/types/address.type';

type CommunesFile = Record<string, Commune[]>;

let cache: CommunesFile | null = null;

async function loadCommunes(): Promise<CommunesFile> {
  if (cache) return cache;
  // __dirname not available in Edge/Node ESM route; use process.cwd() + public path
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const filePath = path.join(process.cwd(), 'public', 'vn-communes.json');
  const raw = await readFile(filePath, 'utf-8');
  cache = JSON.parse(raw) as CommunesFile;
  return cache;
}

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const data = await loadCommunes();
    const communes = data[params.code] ?? [];
    return Response.json({ communes });
  } catch {
    return Response.json({ error: 'Không thể tải danh sách phường/xã.' }, { status: 500 });
  }
}
