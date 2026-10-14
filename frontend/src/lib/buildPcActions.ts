import { ApiRequestError } from '../services/http.client';
import type { ValidateItem, ValidateRequest, ValidateResponse } from '../types/buildPc.type';

type ValidateBuild = (body: ValidateRequest) => Promise<ValidateResponse>;

export type BuildRevalidationResult =
  | { ok: true; items: ValidateItem[]; networkFail: boolean }
  | { ok: false; message: string };

type RevalidateBuildActionOptions = {
  validate: ValidateBuild;
  body: ValidateRequest;
  fallbackItems: ValidateItem[];
  allowFailOpen: boolean;
};

export async function revalidateBuildAction({
  validate,
  body,
  fallbackItems,
  allowFailOpen,
}: RevalidateBuildActionOptions): Promise<BuildRevalidationResult> {
  try {
    const response = await validate(body);
    if (response.data.issues.some(issue => issue.level === 'error')) {
      return { ok: false, message: 'Vẫn còn lỗi tương thích hoặc hết hàng. Vui lòng kiểm tra lại.' };
    }
    return { ok: true, items: response.data.items, networkFail: false };
  } catch (error: unknown) {
    const isApiError = error instanceof ApiRequestError;
    const canFailOpen = !isApiError || (error.status >= 500 && error.status !== 503);
    if (allowFailOpen && canFailOpen) {
      return { ok: true, items: fallbackItems, networkFail: true };
    }

    const message = isApiError && (error.status < 500 || error.status === 503)
      ? error.message
      : 'Không kiểm tra được lúc này, vui lòng thử lại.';
    return { ok: false, message };
  }
}

export function getReusableShareCode(
  currentFingerprint: string,
  savedBuild: { fingerprint: string; shareCode: string } | null,
): string | null {
  return currentFingerprint === savedBuild?.fingerprint ? savedBuild.shareCode : null;
}
