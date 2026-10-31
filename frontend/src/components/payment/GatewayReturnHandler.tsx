'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    let stopped = false;
    let polls = 0;

    const verify = async () => {
      try {
        const data = await check(window.location.search);
        if (stopped) return;
        const outcome = outcomeFrom(data, provider);
        if (outcome === 'invalid') {
          window.setTimeout(() => window.location.replace('/customer/profile/orders'), 400);
          return;
        }
        if (outcome === 'pending' && ++polls < MAX_RETURN_POLLS) {
          window.setTimeout(verify, 1500);
          return;
        }
        window.location.replace(`/customer/profile/orders/${data.orderId}`);
      } catch {
        if (!stopped) {
          window.setTimeout(() => window.location.replace('/customer/profile/orders'), 400);
        }
      }
    };

    void verify();
    return () => { stopped = true; };
  }, [check, provider]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}
