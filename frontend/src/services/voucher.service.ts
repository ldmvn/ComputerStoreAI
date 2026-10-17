import { apiRequest } from './http.client';
import type { VoucherType } from './adminVoucher.service';

export type VoucherValidation = {
  id: number;
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  discountAmount: number;
  finalAmount: number;
};

export async function validateVoucher(token: string | null, code: string, subtotal: number): Promise<VoucherValidation> {
  return apiRequest('/vouchers/validate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code, subtotal }),
  });
}
