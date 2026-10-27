'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
type GatewayProvider = 'VNPAY' | 'MOMO';
type GatewayPaymentOutcome = 'success' | 'cancelled' | 'failed' | 'pending';

type ReturnData = {
  valid: boolean;
  orderId: number | null;
  amount: number | null;
  paymentStatus: string | null;
  attemptStatus: string | null;
  providerCode: string | null;
};

const MAX_RETURN_POLLS = 5;

function outcomeFrom(data: ReturnData, provider: GatewayProvider): GatewayPaymentOutcome | 'invalid' {
  if (!data.valid || !data.orderId || data.amount === null) return 'invalid';
  if (data.paymentStatus === 'PAID') return 'success';
  if (data.attemptStatus === 'CANCELLED' || (provider === 'VNPAY' ? data.providerCode === '24' : data.providerCode === '1006')) return 'cancelled';
  if (data.attemptStatus === 'FAILED' || data.attemptStatus === 'EXPIRED') return 'failed';
  return 'pending';
}

export default function GatewayReturnHandler({ provider, check }: {
  provider: GatewayProvider;
  check: (queryString: string) => Promise<ReturnData>;
}) {
  const [message, setMessage] = useState('Đang xác minh giao dịch…');

  useEffect(() => {
    let stopped = false;
    let polls = 0;

    const verify = async () => {
      try {
        const data = await check(window.location.search);
        if (stopped) return;
        const outcome = outcomeFrom(data, provider);
        if (outcome === 'invalid') {
          setMessage('Không xác minh được giao dịch. Đang chuyển về danh sách đơn hàng…');
          window.setTimeout(() => window.location.replace('/customer/profile/orders'), 800);
          return;
        }
        if (outcome === 'pending' && ++polls < MAX_RETURN_POLLS) {
          window.setTimeout(verify, 1500);
          return;
        }
        window.location.replace(`/customer/profile/orders/${data.orderId}`);
      } catch {
        if (!stopped) {
          setMessage('Kết nối gián đoạn. Đang chuyển về đơn hàng để tiếp tục xác minh…');
          window.setTimeout(() => window.location.replace('/customer/profile/orders'), 1000);
        }
      }
    };

    void verify();
    return () => { stopped = true; };
  }, [check, provider]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
        {message}
      </div>
    </main>
  );
}
