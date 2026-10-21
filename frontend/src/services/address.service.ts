import { apiRequest } from './http.client';
import type { Address, AddressInput, Province, Commune } from '@/types/address.type';

export async function getAddresses(token: string | null): Promise<Address[]> {
  const data = await apiRequest<{ addresses: Address[] }>('/addresses', {}, token);
  return data.addresses;
}

export async function createAddress(token: string | null, input: AddressInput): Promise<Address> {
  const data = await apiRequest<{ address: Address }>('/addresses', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
  return data.address;
}

export async function updateAddress(token: string | null, id: number, input: AddressInput): Promise<Address> {
  const data = await apiRequest<{ address: Address }>(`/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }, token);
  return data.address;
}

export async function deleteAddress(token: string | null, id: number): Promise<void> {
  await apiRequest<unknown>(`/addresses/${id}`, { method: 'DELETE' }, token);
}

export async function setDefaultAddress(token: string | null, id: number): Promise<Address> {
  const data = await apiRequest<{ address: Address }>(`/addresses/${id}/default`, { method: 'PATCH' }, token);
  return data.address;
}

// ─── CAS AddressKit (proxied via Next.js API routes) ─────────────────────────

let provincesCache: Province[] | null = null;
let provincesPromise: Promise<Province[]> | null = null;

export async function getProvinces(): Promise<Province[]> {
  if (provincesCache) return provincesCache;
  if (provincesPromise) return provincesPromise;
  provincesPromise = fetch('/api/address-kit/provinces')
    .then(r => r.json())
    .then(d => {
      const list = (d.provinces as Array<{ code: string; name: string }>).map(p => ({ code: p.code, name: p.name }));
      provincesCache = list;
      return list;
    });
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
