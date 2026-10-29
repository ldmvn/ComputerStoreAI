import { apiRequest } from './http.client';
import type { AiBuildPcRequest, AiBuildPcResult } from '@/types/aiBuildPc.type';

export function postAiBuildPc(
  request: AiBuildPcRequest,
  token: string | null,
  signal?: AbortSignal,
) {
  return apiRequest<{ success: boolean; data: AiBuildPcResult }>(
    '/ai/build-pc',
    { method: 'POST', body: JSON.stringify(request), signal },
    token,
  );
}
