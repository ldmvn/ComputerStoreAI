import { apiRequest } from './http.client';
import type { Address, AddressInput, Province, Commune } from '@/types/address.type';
import { VN_PROVINCES } from '@/data/vn-provinces';

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

// ─── Local static address data (Vietnam 34-province restructuring 2025) ───────
// Provinces are bundled inline (34 items, < 2KB) — zero network calls.
// Communes are loaded from /vn-communes.json on first use and cached in memory.
// This eliminates the external CAS API dependency that caused the ward dropdown
// to silently fail when the remote service was unreachable.

export async function getProvinces(): Promise<Province[]> {
  return VN_PROVINCES;
}

type CommunesByProvince = Record<string, Commune[]>;
let communesData: CommunesByProvince | null = null;
let communesLoadPromise: Promise<CommunesByProvince> | null = null;

async function loadCommunesData(): Promise<CommunesByProvince> {
  if (communesData) return communesData;
  if (communesLoadPromise) return communesLoadPromise;

  communesLoadPromise = fetch('/vn-communes.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<CommunesByProvince>;
    })
    .then(data => {
      communesData = data;
      return data;
    })
    .catch(err => {
      // Reset so next call retries instead of getting stuck on the failed promise
      communesLoadPromise = null;
      throw err;
    });

  return communesLoadPromise;
}

export async function getCommunes(provinceCode: string): Promise<Commune[]> {
  const data = await loadCommunesData();
  return data[provinceCode] ?? [];
}
