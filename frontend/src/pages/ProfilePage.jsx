import { useEffect, useMemo, useState } from 'react';
import { api, apiForm } from '../api/client.js';
import {
  FaCalendarAlt,
  FaEnvelope,
  FaMars,
  FaMapMarkerAlt,
  FaPencilAlt,
  FaPhoneAlt,
  FaUser,
  FaVenus,
  FaVenusMars
} from '../components/icons/FaIcons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { resolveMediaUrl } from '../utils/media.js';

const genderLabels = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác'
};

function toForm(user) {
  return {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    avatar: user?.avatar || ''
  };
}

const emptyInsuranceForm = {
  insuranceEnabled: false,
  insuranceNumber: '',
  insuranceExpiryDate: '',
  insuranceRegisteredHospital: '',
  insuranceNote: ''
};

function toInsuranceForm(insurance) {
  return {
    insuranceEnabled: Boolean(insurance?.insuranceEnabled),
    insuranceNumber: insurance?.insuranceNumber || '',
    insuranceExpiryDate: insurance?.insuranceExpiryDate ? String(insurance.insuranceExpiryDate).slice(0, 10) : '',
    insuranceRegisteredHospital: insurance?.insuranceRegisteredHospital || '',
    insuranceNote: insurance?.insuranceNote || ''
  };
}

function errorMessage(error) {
  return error?.message || 'Đã xảy ra lỗi, vui lòng thử lại';
}

function getFallbackInitial(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const source = parts.at(-1) || name.trim() || 'U';

  return source.charAt(0).toUpperCase();
}

function ProfileAvatar({ form }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = form.avatar ? resolveMediaUrl(form.avatar, '') : '';

  useEffect(() => {
    setFailed(false);
  }, [form.avatar]);

  if (avatarUrl && !failed) {
    return <img alt={form.name || 'Avatar'} className="profile-avatar-large" src={avatarUrl} onError={() => setFailed(true)} />;
  }

  return (
    <span className="profile-avatar-large profile-avatar-fallback">
      {getFallbackInitial(form.name)}
    </span>
  );
}

function AvatarEditor({ disabled, form, onUpload, uploading }) {
  return (
    <div className="profile-avatar-wrap">
      <ProfileAvatar form={form} />
      <label className={`profile-avatar-edit-btn ${disabled ? 'disabled' : ''}`} title="Đổi ảnh đại diện">
        {uploading ? <span className="profile-avatar-spinner" aria-hidden="true" /> : <FaPencilAlt size={15} />}
        <input accept="image/jpeg,image/png,image/webp" type="file" onChange={onUpload} disabled={disabled} />
      </label>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value }) {
  const isEmpty = !value;

  return (
    <div className="profile-detail-item">
      <span className="profile-detail-icon">
        <Icon size={17} />
      </span>
      <div>
        <span className="profile-detail-label">{label}</span>
        <strong className={isEmpty ? 'profile-value-empty' : ''}>{isEmpty ? 'Chưa cập nhật' : value}</strong>
      </div>
    </div>
  );
}

function getGenderIcon(gender) {
  if (gender === 'male') return FaMars;
  if (gender === 'female') return FaVenus;
  return FaVenusMars;
}

export default function ProfilePage() {
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(() => toForm(user));
  const [form, setForm] = useState(() => toForm(user));
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState(emptyInsuranceForm);
  const [savingInsurance, setSavingInsurance] = useState(false);

  const roleLabel = useMemo(() => {
    if (user?.role === 'admin') return 'Quản trị viên';
    if (user?.role === 'doctor') return 'Bác sĩ';
    return 'Bệnh nhân';
  }, [user?.role]);

  useEffect(() => {
    api('/users/me')
      .then((payload) => {
        const nextProfile = payload.data?.user;
        if (nextProfile) {
          const nextForm = toForm(nextProfile);
          setProfile(nextForm);
          setForm(nextForm);
          updateUser(nextProfile);
        }
      })
      .catch((err) => {
        const message = errorMessage(err);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== 'patient') return;

    api('/profile/insurance')
      .then((payload) => {
        setInsuranceForm(toInsuranceForm(payload.insurance));
      })
      .catch((err) => {
        toast.error(errorMessage(err));
      });
  }, [toast, user?.role]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateInsurance(field, value) {
    setInsuranceForm((current) => ({ ...current, [field]: value }));
  }

  function validateForm() {
    if (!form.name.trim()) return 'Họ tên không được để trống';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email không hợp lệ';

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (form.phone.trim() && phoneDigits.length < 9) {
      return 'Số điện thoại phải có tối thiểu 9 số';
    }

    return '';
  }

  function startEdit() {
    setError('');
    setForm(profile);
    setEditMode(true);
  }

  function cancelEdit() {
    setError('');
    setForm(profile);
    setEditMode(false);
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploadingAvatar(true);
    setError('');

    try {
      const payload = await apiForm('/uploads/user-avatar', formData);
      const avatar = payload.data?.url;
      if (avatar) {
        update('avatar', avatar);
      }
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  }

  async function submit(event) {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      toast.warning(validationMessage);
      return;
    }

    setError('');
    setSaving(true);

    try {
      const payload = await api('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          avatar: form.avatar
        })
      });
      const nextProfile = payload.data?.user;
      if (nextProfile) {
        const nextForm = toForm(nextProfile);
        setProfile(nextForm);
        setForm(nextForm);
        updateUser(nextProfile);
      }
      toast.success('Cập nhật hồ sơ thành công');
      setEditMode(false);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function validateInsuranceForm() {
    if (!insuranceForm.insuranceEnabled) return '';
    const number = insuranceForm.insuranceNumber.trim();
    if (!number || number.length < 10 || number.length > 20) return 'Mã BHYT phải có từ 10 đến 20 ký tự';
    if (insuranceForm.insuranceRegisteredHospital.length > 200) return 'Nơi đăng ký KCB ban đầu tối đa 200 ký tự';
    return '';
  }

  async function submitInsurance(event) {
    event.preventDefault();
    const validationMessage = validateInsuranceForm();
    if (validationMessage) {
      toast.warning(validationMessage);
      return;
    }

    setSavingInsurance(true);
    try {
      const payload = await api('/profile/insurance', {
        method: 'PUT',
        body: JSON.stringify(insuranceForm)
      });
      setInsuranceForm(toInsuranceForm(payload.insurance));
      toast.success('Cập nhật thông tin BHYT thành công');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingInsurance(false);
    }
  }

  const currentView = editMode ? form : profile;

  return (
    <main className="section-band">
      <div className="container profile-page-container">
        <div className="page-heading">
          <span className="eyebrow">Tài khoản</span>
          <h1 className="h2 mt-2 mb-2">Hồ sơ cá nhân</h1>
          <p className="text-secondary mb-0">Quản lý thông tin cá nhân để đặt lịch khám thuận tiện hơn.</p>
        </div>

        {loading && <div className="alert alert-light border">Đang tải hồ sơ...</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="profile-layout">
          <aside className="profile-summary-card">
            {editMode ? (
              <AvatarEditor
                disabled={uploadingAvatar || saving || loading}
                form={currentView}
                onUpload={uploadAvatar}
                uploading={uploadingAvatar}
              />
            ) : (
              <ProfileAvatar form={currentView} />
            )}
            <h2>{currentView.name || 'Người dùng'}</h2>
            <p>{currentView.email || 'Chưa cập nhật email'}</p>
            <p>{currentView.phone || 'Chưa cập nhật số điện thoại'}</p>
            <span className="profile-role-badge">{roleLabel}</span>
            {!editMode && (
              <button className="btn btn-primary mt-4 profile-edit-btn" type="button" onClick={startEdit} disabled={loading}>
                Chỉnh sửa hồ sơ
              </button>
            )}
          </aside>

          <section className="profile-details-card">
            {!editMode ? (
              <>
                <div className="profile-card-heading compact">
                  <div>
                    <h2>Thông tin cá nhân</h2>
                    <p>Thông tin dùng cho tài khoản và hỗ trợ đặt lịch khám.</p>
                  </div>
                </div>

                <div className="profile-detail-grid">
                  <ProfileField icon={FaUser} label="Họ tên" value={profile.name} />
                  <ProfileField icon={FaEnvelope} label="Email" value={profile.email} />
                  <ProfileField icon={FaPhoneAlt} label="Số điện thoại" value={profile.phone} />
                  <ProfileField icon={FaCalendarAlt} label="Ngày sinh" value={profile.dateOfBirth} />
                  <ProfileField icon={getGenderIcon(profile.gender)} label="Giới tính" value={genderLabels[profile.gender]} />
                  <ProfileField icon={FaMapMarkerAlt} label="Địa chỉ" value={profile.address} />
                </div>
              </>
            ) : (
              <form className="profile-edit-form" onSubmit={submit}>
                <div className="profile-card-heading compact">
                  <div>
                    <h2>Cập nhật hồ sơ</h2>
                    <p>Chỉnh sửa thông tin cá nhân và ảnh đại diện của bạn.</p>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Họ tên</label>
                    <input className="form-control" value={form.name} onChange={(event) => update('name', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-control" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Ngày sinh</label>
                    <input className="form-control" type="date" value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Giới tính</label>
                    <select className="form-select" value={form.gender} onChange={(event) => update('gender', event.target.value)}>
                      <option value="">Chưa cập nhật</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Địa chỉ</label>
                    <textarea className="form-control" rows="2" value={form.address} onChange={(event) => update('address', event.target.value)} />
                  </div>
                </div>

                <div className="profile-actions">
                  <button className="btn btn-primary px-4" type="submit" disabled={saving || loading || uploadingAvatar}>
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button className="btn btn-outline-secondary px-4" type="button" onClick={cancelEdit} disabled={saving}>
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {user?.role === 'patient' && (
          <section className="profile-details-card insurance-profile-card">
            <div className="profile-card-heading compact">
              <div>
                <h2>Bảo hiểm y tế</h2>
                <p>Thông tin BHYT được lưu vào lịch hẹn tại thời điểm bạn đặt khám.</p>
              </div>
              <span className={`insurance-status-badge ${insuranceForm.insuranceEnabled ? 'active' : 'inactive'}`}>
                {insuranceForm.insuranceEnabled ? 'Đang sử dụng BHYT' : 'Không sử dụng BHYT'}
              </span>
            </div>

            <form className="insurance-profile-form" onSubmit={submitInsurance}>
              <label className="insurance-toggle">
                <input
                  checked={insuranceForm.insuranceEnabled}
                  type="checkbox"
                  onChange={(event) => updateInsurance('insuranceEnabled', event.target.checked)}
                />
                <span>Tôi có sử dụng bảo hiểm y tế khi đi khám</span>
              </label>

              {insuranceForm.insuranceEnabled && (
                <div className="insurance-form-grid">
                  <div>
                    <label className="form-label">Mã số BHYT</label>
                    <input
                      className="form-control"
                      maxLength="20"
                      placeholder="Ví dụ: DN4010123456789"
                      value={insuranceForm.insuranceNumber}
                      onChange={(event) => updateInsurance('insuranceNumber', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Ngày hết hạn</label>
                    <input
                      className="form-control"
                      type="date"
                      value={insuranceForm.insuranceExpiryDate}
                      onChange={(event) => updateInsurance('insuranceExpiryDate', event.target.value)}
                    />
                  </div>
                  <div className="insurance-form-wide">
                    <label className="form-label">Nơi đăng ký KCB ban đầu</label>
                    <input
                      className="form-control"
                      maxLength="200"
                      placeholder="Nhập tên bệnh viện/phòng khám đăng ký ban đầu"
                      value={insuranceForm.insuranceRegisteredHospital}
                      onChange={(event) => updateInsurance('insuranceRegisteredHospital', event.target.value)}
                    />
                  </div>
                  <div className="insurance-form-wide">
                    <label className="form-label">Ghi chú</label>
                    <textarea
                      className="form-control"
                      placeholder="Ghi chú thêm nếu cần"
                      rows="2"
                      value={insuranceForm.insuranceNote}
                      onChange={(event) => updateInsurance('insuranceNote', event.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="profile-actions">
                <button className="btn btn-primary px-4" disabled={savingInsurance} type="submit">
                  {savingInsurance ? 'Đang lưu...' : 'Lưu thông tin BHYT'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
