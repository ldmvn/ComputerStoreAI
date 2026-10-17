'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { completeGoogleLogin, googleLoginErrors, takeGoogleLoginPending } from '@/services/google-auth.service';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const toast = useToast();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);
    const pending = takeGoogleLoginPending();
    const failure = params.get('error');
    if (failure) {
      toast.error(googleLoginErrors[failure] || googleLoginErrors.oauth_failed, 'Vui lòng thử lại.');
      router.replace('/login');
      return;
    }
    const code = params.get('code');
    if (!pending || !code) {
      toast.error(googleLoginErrors.invalid_state, 'Vui lòng đăng nhập lại.');
      router.replace('/login');
      return;
    }
    void completeGoogleLogin(code, pending.verifier, pending.rememberMe).then(result => {
      login(result.user, result.token);
      toast.success('Đăng nhập bằng Google thành công', `Chào mừng ${result.user.fullName}`);
      router.replace(pending.returnTo);
    }).catch((failure: unknown) => {
      toast.error(failure instanceof Error ? failure.message : googleLoginErrors.oauth_failed, 'Vui lòng thử lại.');
      router.replace('/login');
    });
  }, [login, router, toast]);

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
      <h1 className="text-2xl font-bold text-slate-900">Đăng nhập bằng Google</h1>
      <p role="status" className="mt-4 text-sm text-slate-600">Đang xác minh tài khoản Google...</p>
      <Link href="/login" className="ui-link mt-6 inline-block font-semibold text-primary-600">Quay lại đăng nhập</Link>
    </div>
  </main>;
}