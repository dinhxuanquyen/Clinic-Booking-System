import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PasswordPolicyMeter from '../components/PasswordPolicyMeter.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';

function defaultRedirectFor(user, returnUrl) {
  if (user?.mustChangePassword) return '/change-password-first-login';
  if (user?.role === 'admin') return returnUrl?.startsWith('/admin') ? returnUrl : '/admin';
  if (user?.role === 'doctor') return returnUrl?.startsWith('/doctor') ? returnUrl : '/doctor/queue';
  if (user?.role === 'patient') return returnUrl || '/';
  return '/';
}

function errorMessage(error) {
  return error?.message || 'Đã xảy ra lỗi, vui lòng thử lại';
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function normalizePhone(phone) {
  return phone.replace(/\s+/g, '');
}

function isValidVietnamPhone(phone) {
  return /^(0|\+84)\d{9,10}$/.test(normalizePhone(phone));
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(Number(totalSeconds) || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);

  const returnUrl = searchParams.get('returnUrl') || location.state?.returnUrl || location.state?.returnTo || '';
  const isVerifyingRegister = !isLogin && Boolean(verificationEmail);
  const passwordUserInfo = { name: form.name, email: form.email, phone: form.phone };
  const registerPasswordPolicy = validatePasswordStrength(form.password, passwordUserInfo);

  useEffect(() => {
    setForm({ name: '', email: '', phone: '', password: '' });
    setError('');
    setVerificationEmail('');
    setOtp('');
    setUnverifiedEmail('');
    setOtpExpiresIn(0);
    setResendCooldown(0);
    setSubmitting(false);
  }, [mode]);

  useEffect(() => {
    if (resendCooldown <= 0 && otpExpiresIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setOtpExpiresIn((current) => Math.max(current - 1, 0));
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown, otpExpiresIn]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'email') setUnverifiedEmail('');
  }

  function validateRegisterForm() {
    if (!form.name.trim()) return 'Vui lòng nhập họ tên';
    if (!form.phone.trim()) return 'Vui lòng nhập số điện thoại';
    if (!isValidVietnamPhone(form.phone)) return 'Số điện thoại không hợp lệ';
    if (!isValidEmail(form.email)) return 'Email không hợp lệ';
    const passwordPolicy = validatePasswordStrength(form.password, passwordUserInfo);
    if (!passwordPolicy.valid) return passwordPolicy.message;
    return '';
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setUnverifiedEmail('');

    if (!isLogin) {
      const validationMessage = validateRegisterForm();
      if (validationMessage) {
        setError(validationMessage);
        toast.warning(validationMessage);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const loggedInUser = await login(form.email, form.password);
        toast.success('Đăng nhập thành công');
        navigate(defaultRedirectFor(loggedInUser, returnUrl), { replace: true });
        return;
      }

      const result = await register({
        ...form,
        phone: normalizePhone(form.phone),
        role: 'patient'
      });
      const email = result?.data?.email || form.email;
      setVerificationEmail(email);
      setOtp('');
      setOtpExpiresIn(result?.expiresInSeconds || 600);
      setResendCooldown(result?.cooldownSeconds || 60);
      toast.success('Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);

      if (err.status === 403 && message.toLowerCase().includes('xác nhận email')) {
        setUnverifiedEmail(form.email);
        toast.warning(message);
      } else {
        toast.error(message);
      }

      if (message.includes('Email')) {
        emailRef.current?.focus();
      }
      if (message.includes('Số điện thoại')) {
        phoneRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      const message = 'Vui lòng nhập mã OTP 6 số';
      setError(message);
      toast.warning(message);
      return;
    }

    if (otpExpiresIn <= 0) {
      const message = 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.';
      setError(message);
      toast.warning(message);
      return;
    }

    setSubmitting(true);
    try {
      await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: verificationEmail, otp })
      });
      toast.success('Xác nhận email thành công. Bạn có thể đăng nhập.');
      navigate('/login', { replace: true, state: { returnUrl } });
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerificationOtp(email = verificationEmail) {
    if (!email) {
      toast.warning('Vui lòng nhập email để gửi lại mã xác nhận');
      return;
    }

    if (resendCooldown > 0) {
      toast.warning(`Vui lòng chờ ${resendCooldown}s trước khi gửi lại mã OTP`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = await api('/auth/resend-verification-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setOtpExpiresIn(payload?.expiresInSeconds || 600);
      setResendCooldown(payload?.cooldownSeconds || 60);
      toast.success(payload?.message || 'Nếu email tồn tại, mã xác nhận đã được gửi');
    } catch (err) {
      if (err.status === 429) {
        const retryAfter = err.payload?.retryAfter || 60;
        setResendCooldown(retryAfter);
        toast.warning(errorMessage(err));
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isVerifyingRegister) {
    return (
      <main className="container py-5 auth-page">
        <form className="auth-card" onSubmit={verifyEmail}>
          <span className="eyebrow">XÁC NHẬN EMAIL</span>
          <h1 className="h3 mt-2 mb-3">Nhập mã OTP</h1>
          <p className="text-muted mb-4">Chúng tôi đã gửi mã OTP tới email {verificationEmail}.</p>
          {error && <div className="alert alert-danger">{error}</div>}
          <label className="form-label">Mã OTP</label>
          <input
            autoComplete="one-time-code"
            className="form-control mb-2"
            inputMode="numeric"
            maxLength={6}
            name="emailVerificationOtp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Nhập mã 6 số"
          />
          <div className={`small mb-4 ${otpExpiresIn > 0 ? 'text-secondary' : 'text-danger fw-semibold'}`}>
            {otpExpiresIn > 0
              ? `Mã OTP có hiệu lực trong ${formatDuration(otpExpiresIn)}`
              : 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.'}
          </div>
          <button className="btn btn-primary w-100" disabled={submitting} type="submit">
            {submitting ? 'Đang xác nhận...' : 'Xác nhận email'}
          </button>
          <button
            className="btn btn-outline-primary w-100 mt-3"
            disabled={submitting || resendCooldown > 0}
            type="button"
            onClick={() => resendVerificationOtp()}
          >
            {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : 'Gửi lại mã'}
          </button>
          <p className="small mt-3 mb-0">
            <Link to="/login" state={{ returnUrl }}>
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="container py-5 auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">{isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản bệnh nhân'}</span>
        <h1 className="h3 mt-2 mb-4">{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h1>
        {error && <div className="alert alert-danger">{error}</div>}
        {unverifiedEmail && (
          <div className="alert alert-warning">
            <div className="fw-semibold">Tài khoản chưa xác nhận email</div>
            <button
              className="btn btn-link p-0 mt-1 fw-semibold"
              disabled={submitting || resendCooldown > 0}
              type="button"
              onClick={() => resendVerificationOtp(unverifiedEmail)}
            >
              {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : 'Gửi lại mã xác nhận'}
            </button>
          </div>
        )}
        {!isLogin && (
          <>
            <label className="form-label">Họ tên</label>
            <input
              autoComplete="name"
              className="form-control mb-3"
              id="registerName"
              name="registerName"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            <label className="form-label">Số điện thoại</label>
            <input
              autoComplete="tel"
              className="form-control mb-3"
              id="registerPhone"
              name="registerPhone"
              ref={phoneRef}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </>
        )}
        <label className="form-label">Email</label>
        <input
          autoComplete={isLogin ? 'username' : 'email'}
          className="form-control mb-3"
          id={isLogin ? 'loginEmail' : 'registerEmail'}
          name={isLogin ? 'username' : 'registerEmail'}
          ref={emailRef}
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
        <label className="form-label">Mật khẩu</label>
        <input
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          className={`form-control ${isLogin ? 'mb-2' : 'mb-4'}`}
          id={isLogin ? 'loginPassword' : 'registerPassword'}
          name={isLogin ? 'currentPassword' : 'registerPassword'}
          type="password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
        />
        {!isLogin && <PasswordPolicyMeter password={form.password} userInfo={passwordUserInfo} />}
        {isLogin && (
          <div className="text-end mb-4">
            <Link className="small fw-semibold" to="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>
        )}
        <button className="btn btn-primary w-100" disabled={submitting || (!isLogin && !registerPasswordPolicy.valid)} type="submit">
          {submitting ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
        <p className="small mt-3 mb-0">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
          <Link to={isLogin ? '/register' : '/login'} state={{ returnUrl }}>
            {isLogin ? 'Đăng ký' : 'Đăng nhập'}
          </Link>
        </p>
      </form>
    </main>
  );
}
