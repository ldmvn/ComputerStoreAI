// This route is no longer the primary path — getProvinces() in address.service.ts
// now reads directly from the bundled VN_PROVINCES array (zero network calls).
// Kept for any external/legacy consumers that may call it directly.
export const dynamic = 'force-dynamic';

import { VN_PROVINCES } from '@/data/vn-provinces';

export function GET() {
  return Response.json({ provinces: VN_PROVINCES });
}
