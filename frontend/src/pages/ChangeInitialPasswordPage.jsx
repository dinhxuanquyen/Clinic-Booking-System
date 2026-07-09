import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import PasswordPolicyMeter from '../components/PasswordPolicyMeter.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';

function redirectForRole(role) {
  if (role === 'doctor') return '/doctor/queue';
  if (role === 'admin') return '/admin';
  return '/';
}

export default function ChangeInitialPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordUserInfo = { name: user?.name, email: user?.email, phone: user?.phone };
  const passwordPolicy = validatePasswordStrength(form.newPassword, passwordUserInfo);

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!passwordPolicy.valid) {
      toast.warning(passwordPolicy.message);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.warning('Mật khẩu nhập lại không khớp');
      return;
    }

    setLoading(true);
    try {
      const payload = await api('/auth/change-initial-password', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const nextUser = payload.data?.user || { ...user, mustChangePassword: false };
      updateUser(nextUser);
      toast.success('Đổi mật khẩu thành công');
      navigate(redirectForRole(nextUser.role), { replace: true });
    } catch (err) {
      const message = err.message || 'Không đổi được mật khẩu';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-5 auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">BẢO MẬT TÀI KHOẢN</span>
        <h1 className="h3 mt-2 mb-2">Đổi mật khẩu lần đầu</h1>
        <p className="text-secondary mb-4">
          Mật khẩu hiện tại là mật khẩu tạm. Vui lòng đặt mật khẩu mới để tiếp tục sử dụng hệ thống.
        </p>
        {error && <div className="alert alert-danger">{error}</div>}

        <label className="form-label">Mật khẩu mới</label>
        <input
          autoComplete="new-password"
          className="form-control mb-3"
          name="initialNewPassword"
          type="password"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
        />
        <PasswordPolicyMeter password={form.newPassword} userInfo={passwordUserInfo} />

        <label className="form-label">Nhập lại mật khẩu mới</label>
        <input
          autoComplete="new-password"
          className="form-control mb-4"
          name="initialConfirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
        />

        <button className="btn btn-primary w-100" disabled={loading || !passwordPolicy.valid} type="submit">
          {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu và tiếp tục'}
        </button>
      </form>
    </main>
  );
}
