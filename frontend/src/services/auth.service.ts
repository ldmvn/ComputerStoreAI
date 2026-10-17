import type { AuthUser } from '@/types/user.type';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function passwordResetRequest<T>(path: string, payload: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), cache: 'no-store', signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new AuthRequestError('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthRequestError(data.message || 'Không thể xử lý yêu cầu.', data.field, data.errors);
  return data as T;
}

export const requestPasswordReset = (email: string) => passwordResetRequest<{ message: string; challengeId: string; expiresIn: number; expiresAt?: string; serverTime?: string; resendAfter: number }>('forgot-password', { email });
export const verifyResetOtp = (email: string, challengeId: string, otp: string) => passwordResetRequest<{ resetToken: string; expiresIn: number }>('verify-reset-otp', { email, challengeId, otp });
export const completePasswordReset = (email: string, resetToken: string, password: string, confirmPassword: string) => passwordResetRequest<{ message: string }>('reset-password', { email, resetToken, password, confirmPassword });

type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

type RegisterResponse = {
  success: boolean;
  message: string;
  user: AuthUser;
};


type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
};

export class AuthRequestError extends Error {
  field?: string;
  errors?: Record<string, string>;

  constructor(message: string, field?: string, errors?: Record<string, string>) {
    super(message);
    this.name = 'AuthRequestError';
    this.field = field;
    this.errors = errors;
  }
}

export async function registerAccount(payload: RegisterPayload): Promise<RegisterResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthRequestError('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthRequestError(data.message || 'Đăng ký không thành công.', data.field, data.errors);
  }

  return data as RegisterResponse;
}

export async function loginAccount(identifier: string, password: string, rememberMe = false): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
  } catch {
    throw new AuthRequestError('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthRequestError(data.message || 'Không thể đăng nhập lúc này.', data.field, data.errors);
  return data as LoginResponse;
}

export async function logoutAccount(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function updateProfile(data: { fullName?: string; phone?: string }): Promise<AuthUser> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  } catch {
    throw new AuthRequestError('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthRequestError(json.message || 'Không thể cập nhật thông tin.', json.field);
  return json.user as AuthUser;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthRequestError(data.message || 'Phiên đăng nhập không hợp lệ.');
  return data.user as AuthUser;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    throw new AuthRequestError('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthRequestError((data as Record<string, string>).message || 'Không thể đổi mật khẩu.', (data as Record<string, string>).field);
}
