import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';
import BaseModal from './BaseModal.jsx';
import PasswordPolicyMeter from './PasswordPolicyMeter.jsx';

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export default function ChangePasswordModal({ user, onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordUserInfo = useMemo(() => ({
    name: user?.name,
    email: user?.email,
    phone: user?.phone
  }), [user]);

  const passwordPolicy = validatePasswordStrength(form.newPassword, passwordUserInfo);
  const confirmMatches = form.confirmPassword && form.newPassword === form.confirmPassword;
  const canSubmit = form.currentPassword && passwordPolicy.valid && confirmMatches && !submitting;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.currentPassword) {
      toast.warning('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (!passwordPolicy.valid) {
      toast.warning(passwordPolicy.message);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.warning('Mật khẩu nhập lại không khớp');
      return;
    }

    setSubmitting(true);
    try {
      const payload = await api('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify(form)
      });
      toast.success(payload.message || 'Đổi mật khẩu thành công');
      onSuccess?.(payload.data?.user);
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Không đổi được mật khẩu');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BaseModal
      backdropClassName="change-password-overlay"
      className="change-password-dialog"
      disableClose={submitting}
      onClose={onClose}
      size="md"
    >
      <form className="change-password-shell" onSubmit={submit}>
        <div className="change-password-header">
          <div>
            <span className="eyebrow">Bảo mật tài khoản</span>
            <h2>Đổi mật khẩu</h2>
            <p>Mật khẩu mới cần đủ mạnh để bảo vệ tài khoản Clinic Booking của bạn.</p>
          </div>
          <button className="btn btn-outline-secondary btn-sm" disabled={submitting} type="button" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="change-password-body">
          <div className="change-password-field">
            <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
            <input
              autoComplete="current-password"
              className="form-control"
              id="currentPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={(event) => update('currentPassword', event.target.value)}
            />
          </div>

          <div className="change-password-field-group">
            <label htmlFor="newPassword">Mật khẩu mới</label>
            <div className="password-input-wrapper">
              <input
                autoComplete="new-password"
                className="form-control"
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(event) => update('newPassword', event.target.value)}
              />
            </div>
            <PasswordPolicyMeter
              className="compact"
              password={form.newPassword}
              userInfo={passwordUserInfo}
            />
          </div>

          <div className="change-password-field">
            <label htmlFor="confirmPassword">Nhập lại mật khẩu mới</label>
            <input
              autoComplete="new-password"
              className={`form-control ${form.confirmPassword && !confirmMatches ? 'is-invalid' : ''}`}
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(event) => update('confirmPassword', event.target.value)}
            />
            {form.confirmPassword && !confirmMatches && (
              <div className="invalid-feedback d-block">Mật khẩu nhập lại không khớp</div>
            )}
          </div>

          <label className="change-password-toggle">
            <input checked={showPassword} type="checkbox" onChange={(event) => setShowPassword(event.target.checked)} />
            Hiển thị mật khẩu
          </label>
        </div>

        <div className="change-password-footer">
          <button className="btn btn-outline-secondary" disabled={submitting} type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" disabled={!canSubmit} type="submit">
            {submitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
