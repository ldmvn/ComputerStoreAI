'use client';

import { useCallback } from 'react';
import GatewayReturnHandler from '@/components/payment/GatewayReturnHandler';
import { checkMomoReturn } from '@/services/payment.service';

export default function MomoReturnPage() {
  const check = useCallback(async (queryString: string) => {
    const response = await checkMomoReturn(queryString);
    const data = response.data;
    return { ...data, providerCode: data.momoResultCode };
  }, []);
  return <GatewayReturnHandler provider="MOMO" check={check} />;
}
