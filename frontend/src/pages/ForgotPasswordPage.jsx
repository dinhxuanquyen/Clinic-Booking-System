import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import PasswordPolicyMeter from '../components/PasswordPolicyMeter.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';

const initialForm = {
  email: '',
  otp: '',
  newPassword: '',
  confirmPassword: ''
};

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(Number(totalSeconds) || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function ForgotPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const passwordPolicy = validatePasswordStrength(form.newPassword, { email: form.email });

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
  }

  function validateEmail() {
    if (!form.email.trim()) return 'Vui lòng nhập email';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Email không hợp lệ';
    return '';
  }

  function validateReset() {
    const emailError = validateEmail();
    if (emailError) return emailError;
    if (!/^\d{6}$/.test(form.otp)) return 'OTP phải gồm 6 số';
    const passwordStrength = validatePasswordStrength(form.newPassword, { email: form.email });
    if (!passwordStrength.valid) return passwordStrength.message;
    if (form.newPassword !== form.confirmPassword) return 'Mật khẩu nhập lại không khớp';
    return '';
  }

  async function sendOtp(event) {
    event?.preventDefault();
    setError('');
    const message = validateEmail();
    if (message) {
      toast.warning(message);
      return;
    }

    if (resendCooldown > 0) {
      toast.warning(`Vui lòng chờ ${resendCooldown}s trước khi gửi lại mã OTP`);
      return;
    }

    setLoading(true);
    try {
      const payload = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.trim() })
      });
      setOtpExpiresIn(payload?.expiresInSeconds || 600);
      setResendCooldown(payload?.cooldownSeconds || 60);
      toast.success('Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi');
      setStep(2);
    } catch (err) {
      const errorMessage = err.message || 'Không gửi được mã OTP';
      setError(errorMessage);
      if (err.status === 429) {
        setResendCooldown(err.payload?.retryAfter || 60);
        toast.warning(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setError('');
    const message = validateReset();
    if (message) {
      toast.warning(message);
      return;
    }

    if (otpExpiresIn <= 0) {
      const expiredMessage = 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.';
      setError(expiredMessage);
      toast.warning(expiredMessage);
      return;
    }

    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          otp: form.otp.trim(),
          newPassword: form.newPassword
        })
      });
      toast.success('Đặt lại mật khẩu thành công');
      navigate('/login', { replace: true });
    } catch (err) {
      const errorMessage = err.message || 'Không đặt lại được mật khẩu';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-5 auth-page">
      <form className="auth-card forgot-password-card" onSubmit={step === 1 ? sendOtp : resetPassword}>
        <span className="eyebrow">Bảo mật tài khoản</span>
        <h1 className="h3 mt-2 mb-2">Quên mật khẩu</h1>
        <p className="text-secondary mb-4">
          {step === 1
            ? 'Nhập email đăng nhập hoặc email cá nhân để nhận mã OTP đặt lại mật khẩu.'
            : 'Nhập mã OTP đã nhận và đặt mật khẩu mới cho tài khoản.'}
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        <label className="form-label">Email đăng nhập hoặc email cá nhân</label>
        <input
          autoComplete="email"
          className="form-control mb-2"
          disabled={loading || step === 2}
          id="forgotPasswordEmail"
          name="forgotPasswordEmail"
          type="email"
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
        />
        <p className="small text-secondary mb-3">
          Nếu là bác sĩ, bạn có thể nhập email đăng nhập nội bộ hoặc email cá nhân đã đăng ký.
        </p>

        {step === 2 && (
          <>
            <label className="form-label">Mã OTP</label>
            <input
              autoComplete="one-time-code"
              className="form-control mb-2"
              id="resetPasswordOtp"
              inputMode="numeric"
              maxLength="6"
              name="resetPasswordOtp"
              placeholder="Nhập mã 6 số"
              value={form.otp}
              onChange={(event) => update('otp', event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <div className={`small mb-3 ${otpExpiresIn > 0 ? 'text-secondary' : 'text-danger fw-semibold'}`}>
              {otpExpiresIn > 0
                ? `Mã OTP có hiệu lực trong ${formatDuration(otpExpiresIn)}`
                : 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.'}
            </div>

            <label className="form-label">Mật khẩu mới</label>
            <input
              autoComplete="new-password"
              className="form-control mb-3"
              id="resetNewPassword"
              name="resetNewPassword"
              type="password"
              value={form.newPassword}
              onChange={(event) => update('newPassword', event.target.value)}
            />
            <PasswordPolicyMeter password={form.newPassword} userInfo={{ email: form.email }} />

            <label className="form-label">Nhập lại mật khẩu mới</label>
            <input
              autoComplete="new-password"
              className="form-control mb-4"
              id="resetConfirmPassword"
              name="resetConfirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => update('confirmPassword', event.target.value)}
            />
          </>
        )}

        <button className="btn btn-primary w-100" disabled={loading || (step === 2 && !passwordPolicy.valid)} type="submit">
          {loading ? 'Đang xử lý...' : step === 1 ? 'Gửi mã OTP' : 'Đặt lại mật khẩu'}
        </button>

        {step === 2 && (
          <div className="d-grid gap-2 mt-2">
            <button className="btn btn-outline-primary" disabled={loading || resendCooldown > 0} type="button" onClick={sendOtp}>
              {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
            </button>
            <button className="btn btn-link" disabled={loading} type="button" onClick={() => setStep(1)}>
              Đổi email nhận OTP
            </button>
          </div>
        )}

        <p className="small mt-3 mb-0 text-center">
          <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      </form>
    </main>
  );
}
