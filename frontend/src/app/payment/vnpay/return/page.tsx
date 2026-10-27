'use client';

import { useCallback } from 'react';
import GatewayReturnHandler from '@/components/payment/GatewayReturnHandler';
import { checkVnpayReturn } from '@/services/payment.service';

export default function VnpayReturnPage() {
  const check = useCallback(async (queryString: string) => {
    const response = await checkVnpayReturn(queryString);
    const data = response.data;
    return { ...data, providerCode: data.vnpayResponseCode };
  }, []);
  return <GatewayReturnHandler provider="VNPAY" check={check} />;
}
