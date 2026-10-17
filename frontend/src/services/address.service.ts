import type { Address, AddressInput, Province, Commune } from '@/types/address.type';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function authHeaders(token: string | null) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── Address CRUD ─────────────────────────────────────────────────────────────

export async function getAddresses(token: string | null): Promise<Address[]> {
  const res = await fetch(`${API}/addresses`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Không thể tải danh sách địa chỉ.');
  const data = await res.json();
  return data.addresses;
}

export async function createAddress(token: string | null, input: AddressInput): Promise<Address> {
  const res = await fetch(`${API}/addresses`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể thêm địa chỉ.');
  return data.address;
}

export async function updateAddress(token: string | null, id: number, input: AddressInput): Promise<Address> {
  const res = await fetch(`${API}/addresses/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể cập nhật địa chỉ.');
  return data.address;
}

export async function deleteAddress(token: string | null, id: number): Promise<void> {
  const res = await fetch(`${API}/addresses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Không thể xóa địa chỉ.');
  }
}

export async function setDefaultAddress(token: string | null, id: number): Promise<Address> {
  const res = await fetch(`${API}/addresses/${id}/default`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể đặt địa chỉ mặc định.');
  return data.address;
}

// ─── CAS AddressKit (proxied via Next.js API routes) ─────────────────────────

const provincesCache: Province[] | null = null;
let provincesPromise: Promise<Province[]> | null = null;

export async function getProvinces(): Promise<Province[]> {
  if (provincesCache) return provincesCache;
  if (provincesPromise) return provincesPromise;
  provincesPromise = fetch('/api/address-kit/provinces')
    .then(r => r.json())
    .then(d => (d.provinces as Array<{ code: string; name: string }>).map(p => ({ code: p.code, name: p.name })));
  return provincesPromise;
}

const communesCache = new Map<string, Commune[]>();

export async function getCommunes(provinceCode: string): Promise<Commune[]> {
  if (communesCache.has(provinceCode)) return communesCache.get(provinceCode)!;
  const res = await fetch(`/api/address-kit/provinces/${encodeURIComponent(provinceCode)}/communes`);
  const data = await res.json();
  const communes = (data.communes as Array<{ code: string; name: string; provinceCode: string }>)
    .map(c => ({ code: c.code, name: c.name, provinceCode: c.provinceCode }));
  communesCache.set(provinceCode, communes);
  return communes;
}
