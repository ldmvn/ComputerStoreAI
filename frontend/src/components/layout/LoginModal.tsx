'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Mail, LockKeyhole, Phone, UserRound, X } from 'lucide-react';
import { AuthRequestError, loginAccount, registerAccount } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { startGoogleLogin } from '@/services/google-auth.service';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import type { RecoveryMode } from '@/components/auth/ForgotPasswordForm';
import { useToast } from '@/components/ui/Toast';
import { useAuthModal } from '@/store/authModal.store';

type AuthMode = 'login' | 'register' | RecoveryMode;

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'forgot';
};

export default function LoginModal({ isOpen, onClose, initialMode = 'login' }: LoginModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [cardHeight, setCardHeight] = useState<number>();
  const contentRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const login = useAuthStore((state) => state.login);
  const firePendingCallback = useAuthModal((state) => state.firePendingCallback);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      setAuthMode(initialMode);
      setCardHeight(undefined);
      setMessage('');
      setRegisterErrors({});
      return;
    }
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, initialMode]);

  useEffect(() => {
    if (isOpen) headingRef.current?.focus({ preventScroll: true });
  }, [authMode, isOpen]);

  const recoveryMode = authMode !== 'login' && authMode !== 'register' ? authMode : null;
  const backToLogin = () => {
    setAuthMode('login'); setMessage(''); setPassword(''); setShowPassword(false);
  };
  const startRecovery = () => {
    setCardHeight(contentRef.current?.offsetHeight);
    setMessage(''); setPassword(''); setAuthMode('forgot');
  };
  const title = { login: 'Đăng nhập', register: 'Đăng ký', forgot: 'Quên mật khẩu', 'verify-otp': 'Xác nhận mã', 'reset-password': 'Đặt mật khẩu mới' }[authMode];
  const description = { login: 'Nhập thông tin để truy cập tài khoản', register: 'Tạo tài khoản DUCMANH PC để bắt đầu mua sắm', forgot: 'Nhập email để nhận mã xác nhận.', 'verify-otp': 'Nhập mã OTP đã được gửi đến email của bạn.', 'reset-password': 'Tạo mật khẩu mới để truy cập tài khoản.' }[authMode];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    if (!email.trim()) {
      setMessage('Vui lòng nhập email hoặc số điện thoại.');
      toast.warning('Thiếu thông tin', 'Vui lòng nhập email hoặc số điện thoại.');
      return;
    }
    if (!password) {
      setMessage('Vui lòng nhập mật khẩu.');
      toast.warning('Thiếu thông tin', 'Vui lòng nhập mật khẩu.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const response = await loginAccount(email.trim(), password, rememberMe);
      login(response.user, response.token);
      setEmail('');
      setPassword('');
      toast.success('Đăng nhập thành công', `Chào mừng ${response.user.fullName}`);
      onClose();
      // Kích hoạt pending action (ví dụ: tiếp tục checkout) đã được đăng ký trước khi mở modal.
      // firePendingCallback tự xóa callback sau khi gọi — không bao giờ gọi lại lần hai.
      firePendingCallback();
    } catch (error: unknown) {
      const message = error instanceof AuthRequestError ? error.message : 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
      setMessage(message);
      toast.error('Đăng nhập thất bại', message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
    if (!email.trim()) errors.email = 'Vui lòng nhập email.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Vui lòng nhập email hợp lệ.';
    if (!phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại.';
    else if (!/^(?:\+84|0)(?:\d){8,10}$/.test(phone.replace(/[\s.-]/g, ''))) errors.phone = 'Vui lòng nhập số điện thoại hợp lệ.';
    if (!password) errors.password = 'Vui lòng nhập mật khẩu.';
    else if (password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (!confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    else if (password !== confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    if (!acceptedTerms) errors.terms = 'Vui lòng đồng ý với điều khoản.';
    setRegisterErrors(errors);
    setMessage('');
    if (Object.keys(errors).length > 0) {
      toast.warning('Vui lòng kiểm tra lại thông tin', Object.values(errors)[0]);
      return;
    }
    setIsRegistering(true);
    try {
      await registerAccount({ fullName: fullName.trim(), email: email.trim(), phone, password });
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setAcceptedTerms(false);
      setRegisterErrors({});
      setAuthMode('login');
      setMessage('Đăng ký tài khoản thành công. Vui lòng đăng nhập.');
      toast.success('Đăng ký tài khoản thành công', 'Vui lòng đăng nhập.');
    } catch (error: unknown) {
      if (error instanceof AuthRequestError) {
        setRegisterErrors(error.errors || (error.field ? { [error.field]: error.message } : {}));
        const inlineMessage = error.errors ? '' : error.field ? '' : error.message;
        setMessage(inlineMessage);
        if (error.errors) {
          toast.error('Đăng ký thất bại', Object.values(error.errors)[0] || error.message);
        } else {
          toast.error('Đăng ký thất bại', error.message);
        }
      } else {
        setMessage('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại sau.');
        toast.error('Có lỗi xảy ra', 'Không thể đăng ký. Vui lòng thử lại sau.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleRedirecting) return;
    setMessage('');
    setIsGoogleRedirecting(true);
    try {
      await startGoogleLogin(rememberMe);
    } catch {
      setMessage('Không thể mở đăng nhập Google. Vui lòng thử lại.');
      toast.error('Đăng nhập Google thất bại', 'Vui lòng thử lại.');
      setIsGoogleRedirecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 py-4 backdrop-blur-[2px] transition-opacity duration-200 sm:py-6 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className={`relative grid max-h-[calc(100vh-2rem)] w-full max-w-[980px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition duration-200 md:grid-cols-[0.9fr_1.1fr] ${isVisible ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'}`}
      >
        <button type="button" onClick={onClose} className="ui-button absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng cửa sổ đăng nhập">
          <X className="h-5 w-5" />
        </button>
        <aside className="relative hidden min-h-[580px] flex-col items-center justify-center overflow-hidden border-r border-slate-200 bg-white p-10 md:flex">
          <img src="/logo.png" alt="DUCMANH PC" className="h-auto w-44 object-contain" />
          <p className="mt-5 text-center text-sm font-medium leading-relaxed text-slate-400 tracking-wide">
            Khám Phá công nghệ mỗi ngày
          </p>
          <p className="absolute bottom-8 text-center text-xs text-slate-300">
            Mua sắm tại DUCMANH PC
          </p>
        </aside>
        <div ref={contentRef} className="p-6 sm:p-10" style={recoveryMode ? { minHeight: cardHeight } : undefined}>
          <div key={authMode} className="auth-form-enter mx-auto max-w-md text-center">
            <h1 ref={headingRef} tabIndex={-1} id="auth-modal-title" className="text-3xl font-bold tracking-tight text-slate-900 outline-none">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          {recoveryMode ? <ForgotPasswordForm mode={recoveryMode} initialEmail={email} onModeChange={setAuthMode} onBack={backToLogin} onSuccess={() => { backToLogin(); }} /> : authMode === 'login' ? (
            <form onSubmit={handleSubmit} noValidate className="auth-form-enter mx-auto mt-6 max-w-md space-y-5">
              <div>
                <label htmlFor="modal-login-email" className="mb-2 block text-sm font-semibold text-slate-700">Email hoặc số điện thoại *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="modal-login-email" type="text" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email hoặc số điện thoại" autoComplete="username" className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
                </div>
              </div>
              <div>
                <label htmlFor="modal-login-password" className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu *</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="modal-login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="ui-button absolute right-2 top-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />Ghi nhớ đăng nhập</label>
                <button type="button" onClick={startRecovery} disabled={isLoggingIn} className="ui-link shrink-0 font-medium text-primary-600 hover:text-primary-700 disabled:opacity-60">Quên mật khẩu?</button>
              </div>
              {message && <p role="alert" className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-600">{message}</p>}
              <button type="submit" disabled={isLoggingIn} className="ui-button h-12 w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-sm font-semibold text-white transition hover:from-primary-700 hover:to-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60">{isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
              <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />Hoặc đăng nhập với<span className="h-px flex-1 bg-slate-200" /></div>
              <button type="button" onClick={handleGoogleLogin} disabled={isGoogleRedirecting || isLoggingIn} className="ui-button ui-button--neutral flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><span className="text-lg font-bold text-[#4285F4]">G</span>Google</button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} noValidate className="auth-form-enter mx-auto mt-6 max-h-[calc(100vh-12rem)] max-w-md space-y-4 overflow-y-auto pr-1">
              <div><label htmlFor="modal-register-name" className="mb-2 block text-sm font-semibold text-slate-700">Họ và tên *</label><div className="relative"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="modal-register-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nhập họ và tên" autoComplete="name" className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" /></div>{registerErrors.fullName && <p className="mt-1 text-sm text-red-600" role="alert">{registerErrors.fullName}</p>}</div>
              <div><label htmlFor="modal-register-email" className="mb-2 block text-sm font-semibold text-slate-700">Email *</label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="modal-register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@gmail.com" autoComplete="email" className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" /></div>{registerErrors.email && <p className="mt-1 text-sm text-red-600" role="alert">{registerErrors.email}</p>}</div>
              <div><label htmlFor="modal-register-phone" className="mb-2 block text-sm font-semibold text-slate-700">Số điện thoại *</label><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="modal-register-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập số điện thoại" autoComplete="tel" className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" /></div>{registerErrors.phone && <p className="mt-1 text-sm text-red-600" role="alert">{registerErrors.phone}</p>}</div>
              <div><label htmlFor="modal-register-password" className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu *</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="modal-register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" autoComplete="new-password" className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="ui-button absolute right-2 top-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{registerErrors.password && <p className="mt-1 text-sm text-red-600" role="alert">{registerErrors.password}</p>}</div>
              <div><label htmlFor="modal-register-confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">Xác nhận mật khẩu *</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="modal-register-confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="ui-button absolute right-2 top-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{registerErrors.confirmPassword && <p className="mt-1 text-sm text-red-600" role="alert">{registerErrors.confirmPassword}</p>}</div>
              <div><label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" /><span>Tôi đồng ý với <span className="font-medium text-primary-600">Điều khoản sử dụng</span> và <span className="font-medium text-primary-600">Chính sách bảo mật</span></span></label>{registerErrors.terms && <p className="mt-1 text-sm text-red-600" role="alert">{registerErrors.terms}</p>}</div>
              {message && <p role="alert" className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-600">{message}</p>}
              <button type="submit" disabled={isRegistering} className="ui-button h-12 w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-sm font-semibold text-white transition hover:from-primary-700 hover:to-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60">{isRegistering ? 'Đang đăng ký...' : 'Đăng ký'}</button>
              <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />Hoặc đăng ký với<span className="h-px flex-1 bg-slate-200" /></div>
              <button type="button" onClick={handleGoogleLogin} disabled={isGoogleRedirecting || isRegistering} className="ui-button ui-button--neutral flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><span className="text-lg font-bold text-[#4285F4]">G</span>Google</button>
            </form>
          )}
          {!recoveryMode && <p className="mx-auto mt-7 max-w-md text-center text-sm text-slate-500">{authMode === 'login' ? <>Chưa có tài khoản?{' '}<button type="button" onClick={() => { setAuthMode('register'); setMessage(''); }} className="ui-link font-semibold text-primary-600 hover:text-primary-700">Đăng ký ngay</button></> : <>Đã có tài khoản?{' '}<button type="button" onClick={() => { setAuthMode('login'); setRegisterErrors({}); setMessage(''); }} className="ui-link font-semibold text-primary-600 hover:text-primary-700">Đăng nhập</button></>}</p>}
        </div>
      </section>
    </div>
  );
}
