// Mirrors backend/src/payments/validators/paymentStatus.validator.js and the
// Payment/PaymentAttempt Prisma models (backend/prisma/schema.prisma).

export type PaymentMethod = 'COD' | 'BANK_TRANSFER' | 'MOMO' | 'VNPAY';

export type PaymentStatus =
  | 'PENDING'
  | 'AWAITING_VERIFICATION'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  AWAITING_VERIFICATION: 'Đang chờ đối soát',
  PROCESSING: 'Đang xử lý',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
  REFUNDED: 'Đã hoàn tiền',
};

export type PaymentAttempt = {
  id: number;
  status: PaymentStatus;
  merchantReference: string;
  providerTransactionId: string | null;
  transferContent: string | null;
  bankBin: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  reportedAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type Payment = {
  id: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt: string | null;
  attempts: PaymentAttempt[];
};
