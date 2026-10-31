'use client';

import { Loader2 } from 'lucide-react';
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
      router.replace(pending.returnTo);
    }).catch((failure: unknown) => {
      toast.error(failure instanceof Error ? failure.message : googleLoginErrors.oauth_failed, 'Vui lòng thử lại.');
      router.replace('/login');
    });
  }, [login, router, toast]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}