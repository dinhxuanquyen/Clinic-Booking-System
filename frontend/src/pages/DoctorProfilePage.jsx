import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiForm } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';

const emptyProfile = {
  fullName: '',
  avatar: '',
  personalEmail: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  description: ''
};

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  return new Date(value).toLocaleString('vi-VN');
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  return new Date(value).toLocaleDateString('vi-VN');
}

function genderLabel(value) {
  if (value === 'male') return 'Nam';
  if (value === 'female') return 'Nữ';
  if (value === 'other') return 'Khác';
  return 'Chưa cập nhật';
}

function displayValue(value) {
  return value || 'Chưa cập nhật';
}

export default function DoctorProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const profileTitle = useMemo(() => {
    if (!profile) return '';
    return profile.degree ? `${profile.degree} ${profile.fullName}` : profile.fullName;
  }, [profile]);

  async function loadProfile() {
    setLoading(true);
    setLoadError('');
    try {
      const payload = await api('/doctor/profile');
      setProfile(payload.data);
      setForm({
        fullName: payload.data.fullName || '',
        avatar: payload.data.avatar || '',
        personalEmail: payload.data.personalEmail || '',
        phone: payload.data.phone || '',
        dateOfBirth: payload.data.dateOfBirth || '',
        gender: payload.data.gender || '',
        address: payload.data.address || '',
        description: payload.data.description || ''
      });
    } catch (error) {
      const message = error.message || 'Không tải được hồ sơ bác sĩ';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function cancelEdit() {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        avatar: profile.avatar || '',
        personalEmail: profile.personalEmail || '',
        phone: profile.phone || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
        address: profile.address || '',
        description: profile.description || ''
      });
    }
    setEditing(false);
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);
    setUploading(true);
    try {
      const payload = await apiForm('/uploads/user-avatar', data);
      const url = payload?.data?.url || payload?.data?.data?.url || '';
      if (!url) throw new Error('Không nhận được URL ảnh sau khi upload');
      update('avatar', url);
      toast.success('Upload avatar thành công');
    } catch (error) {
      toast.error(error.message || 'Không upload được avatar');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!form.fullName.trim()) {
      toast.warning('Vui lòng nhập họ tên');
      return;
    }
    if (form.personalEmail && !/^\S+@\S+\.\S+$/.test(form.personalEmail)) {
      toast.warning('Email nhận OTP không hợp lệ');
      return;
    }

    setSaving(true);
    try {
      const payload = await api('/doctor/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.fullName.trim(),
          avatar: form.avatar,
          personalEmail: form.personalEmail.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          address: form.address.trim(),
          description: form.description.trim()
        })
      });
      setProfile(payload.data);
      updateUser({
        ...user,
        name: payload.data.fullName,
        phone: payload.data.phone,
        avatar: payload.data.avatar,
        dateOfBirth: payload.data.dateOfBirth,
        gender: payload.data.gender,
        address: payload.data.address
      });
      setEditing(false);
      toast.success('Cập nhật hồ sơ bác sĩ thành công');
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được hồ sơ bác sĩ');
    } finally {
      setSaving(false);
    }
  }

  if (!user?.doctorId) {
    return (
      <section className="management-panel admin-empty-state">
        <span aria-hidden="true">!</span>
        <p>Tài khoản của bạn chưa được admin liên kết với hồ sơ bác sĩ.</p>
      </section>
    );
  }

  if (loading) {
    return <section className="management-panel admin-empty-state"><p>Đang tải hồ sơ bác sĩ...</p></section>;
  }

  if (loadError || !profile) {
    return (
      <section className="management-panel admin-empty-state">
        <span aria-hidden="true">!</span>
        <p>{loadError || 'Không có dữ liệu hồ sơ bác sĩ.'}</p>
        <button className="btn btn-primary btn-sm" type="button" onClick={loadProfile}>
          Tải lại
        </button>
      </section>
    );
  }

  return (
    <div className="doctor-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Hồ sơ bác sĩ</p>
          <h1 className="doctor-page-title">Thông tin tài khoản và chuyên môn</h1>
          <p className="doctor-page-subtitle">Quản lý thông tin cá nhân, email nhận OTP và theo dõi hồ sơ nghề nghiệp của bạn.</p>
        </div>
        <div className="doctor-page-actions">
          <Link className="btn btn-outline-primary btn-sm" to={`/doctors/${user.doctorId}`}>
            Xem trang công khai
          </Link>
        </div>
      </div>
      <section className="doctor-profile-workspace">
      <aside className="doctor-profile-summary-card">
        <div className="doctor-profile-avatar-frame">
          <img
            src={resolveMediaUrl(editing ? form.avatar : profile.avatar, '/placeholder-doctor.svg')}
            alt={profile.fullName}
            onError={(event) => useImageFallback(event, '/placeholder-doctor.svg')}
          />
          {editing && (
            <label className="doctor-profile-avatar-action">
              {uploading ? '...' : '✎'}
              <input accept="image/*" disabled={uploading} hidden type="file" onChange={uploadAvatar} />
            </label>
          )}
        </div>
        <h1>{profileTitle}</h1>
        <p>{displayValue(profile.specialty)}</p>
        <div className="doctor-profile-badges">
          <span>{profile.doctorCode || 'Chưa có mã'}</span>
          <strong>✓ {profile.accountStatus}</strong>
        </div>
        <Link className="btn btn-outline-primary btn-sm w-100" to={`/doctors/${user.doctorId}`}>
          Xem trang công khai
        </Link>
      </aside>

      <div className="doctor-profile-detail-stack">
        <section className="doctor-profile-section">
          <div className="doctor-profile-section-heading">
            <div>
              <span className="eyebrow">Thông tin tài khoản</span>
              <h2>Tài khoản đăng nhập</h2>
            </div>
            <div className="doctor-profile-actions">
              <Link className="btn btn-outline-primary btn-sm" to="/forgot-password">Đổi mật khẩu</Link>
              <button className="btn btn-outline-info btn-sm" type="button" onClick={() => setEditing(true)}>
                Đổi email nhận OTP
              </button>
            </div>
          </div>
          <div className="doctor-profile-info-grid">
            <article><span>Mã bác sĩ</span><strong>{displayValue(profile.doctorCode)}</strong></article>
            <article><span>Email đăng nhập</span><strong><a href={`mailto:${profile.loginEmail}`}>{displayValue(profile.loginEmail)}</a></strong></article>
            <article><span>Email nhận OTP</span><strong><a href={`mailto:${profile.personalEmail}`}>{displayValue(profile.personalEmail)}</a></strong></article>
            <article><span>Trạng thái tài khoản</span><strong>{profile.accountStatus}</strong></article>
            <article><span>Lần đăng nhập gần nhất</span><strong>{formatDateTime(profile.lastLoginAt)}</strong></article>
            <article><span>Lần đổi mật khẩu gần nhất</span><strong>{formatDate(profile.passwordChangedAt)}</strong></article>
          </div>
        </section>

        <form onSubmit={save}>
          <section className="doctor-profile-section">
            <div className="doctor-profile-section-heading">
              <div>
                <span className="eyebrow">Thông tin cá nhân</span>
                <h2>Hồ sơ cá nhân</h2>
              </div>
              {!editing && (
                <button className="btn btn-primary btn-sm" type="button" onClick={() => setEditing(true)}>
                  Chỉnh sửa hồ sơ
                </button>
              )}
            </div>

            {editing ? (
              <div className="doctor-profile-form-grid">
                <label><span>Họ tên</span><input className="form-control" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></label>
                <label><span>Email nhận OTP</span><input className="form-control" type="email" value={form.personalEmail} onChange={(event) => update('personalEmail', event.target.value)} /></label>
                <label><span>Số điện thoại</span><input className="form-control" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
                <label><span>Ngày sinh</span><input className="form-control" type="date" value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} /></label>
                <label><span>Giới tính</span>
                  <select className="form-select" value={form.gender} onChange={(event) => update('gender', event.target.value)}>
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </label>
                <label className="full"><span>Địa chỉ</span><textarea className="form-control" rows="2" value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
              </div>
            ) : (
              <div className="doctor-profile-info-grid">
                <article><span>Họ tên</span><strong>{displayValue(profile.fullName)}</strong></article>
                <article><span>Số điện thoại</span><strong>{displayValue(profile.phone)}</strong></article>
                <article><span>Ngày sinh</span><strong>{profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Chưa cập nhật'}</strong></article>
                <article><span>Giới tính</span><strong>{genderLabel(profile.gender)}</strong></article>
                <article className="wide"><span>Địa chỉ</span><strong>{displayValue(profile.address)}</strong></article>
              </div>
            )}
          </section>

          <section className="doctor-profile-section">
            <span className="eyebrow">Thông tin chuyên môn</span>
            <h2>Hồ sơ nghề nghiệp</h2>
            <div className="doctor-profile-info-grid">
              <article><span>Mã bác sĩ</span><strong>{displayValue(profile.doctorCode)}</strong></article>
              <article><span>Học vị</span><strong>{displayValue(profile.degree)}</strong></article>
              <article><span>Chuyên khoa</span><strong>{displayValue(profile.specialty)}</strong></article>
              <article><span>Cơ sở công tác</span><strong>{displayValue(profile.clinic)} {profile.clinicCode ? `(${profile.clinicCode})` : ''}</strong></article>
              <article><span>Số năm kinh nghiệm</span><strong>{profile.experienceYears || 0} năm</strong></article>
              <article><span>Mã cơ sở</span><strong>{displayValue(profile.clinicCode)}</strong></article>
            </div>
            {editing ? (
              <label className="doctor-profile-description-edit">
                <span>Giới thiệu chuyên môn</span>
                <textarea className="form-control" rows="4" value={form.description} onChange={(event) => update('description', event.target.value)} />
              </label>
            ) : (
              <p className="doctor-profile-description">
                {profile.description || 'Thông tin giới thiệu chuyên môn đang được cập nhật.'}
              </p>
            )}
            <p className="small text-secondary mb-0">Mã bác sĩ, cơ sở và chuyên khoa chỉ được quản trị viên cập nhật.</p>
          </section>

          <section className="doctor-profile-section">
            <span className="eyebrow">Thống kê công việc</span>
            <h2>Hoạt động khám bệnh</h2>
            <div className="doctor-profile-stats-grid">
              <article><strong>{profile.stats?.totalAppointments || 0}</strong><span>Tổng lượt khám</span></article>
              <article><strong>{profile.stats?.todayAppointments || 0}</strong><span>Lịch hẹn hôm nay</span></article>
              <article><strong>{profile.stats?.weekAppointments || 0}</strong><span>Lịch hẹn tuần này</span></article>
              <article><strong>{profile.stats?.servedPatients || 0}</strong><span>Bệnh nhân đã phục vụ</span></article>
              <article><strong>⭐ {profile.stats?.averageRating || 4.9}</strong><span>Đánh giá trung bình</span></article>
            </div>
          </section>

          {editing && (
            <div className="doctor-profile-savebar">
              <button className="btn btn-outline-secondary" disabled={saving || uploading} type="button" onClick={cancelEdit}>Hủy</button>
              <button className="btn btn-primary" disabled={saving || uploading} type="submit">
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </form>
      </div>
      </section>
    </div>
  );
}
