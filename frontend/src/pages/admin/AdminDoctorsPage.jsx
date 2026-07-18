import { useEffect, useMemo, useState } from 'react';
import { api, apiForm } from '../../api/client.js';
import BaseModal from '../../components/BaseModal.jsx';
import PasswordPolicyMeter from '../../components/PasswordPolicyMeter.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { resolveMediaUrl, useImageFallback } from '../../utils/media.js';
import { validatePasswordStrength } from '../../utils/passwordPolicy.js';
import { AdminAlert, AdminEmptyState, AdminPagination, ConfirmDialog, emptyWorkingHours, getId, getName, normalizeText, paginate } from './adminUtils.jsx';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const dayLabels = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật'
};

const defaultForm = {
  name: '',
  personalEmail: '',
  doctorCode: '',
  phone: '',
  avatar: '/placeholder-doctor.svg',
  degree: '',
  position: '',
  workplace: '',
  bio: '',
  experienceYears: 0,
  description: '',
  clinicId: '',
  specialtyId: '',
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  workingHoursStart: '08:00',
  workingHoursEnd: '17:00'
};

const defaultAccountForm = {
  userId: ''
};

const defaultResetForm = {
  mode: 'email',
  newPassword: '',
  confirmPassword: ''
};

function normalizeWorkingDays(value) {
  if (Array.isArray(value)) return value.filter((item) => daysOfWeek.includes(item));
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter((item) => daysOfWeek.includes(item));
  return [];
}

function getUploadUrl(response) {
  return response?.data?.url || response?.data?.data?.url || response?.url || '';
}

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  return new Date(value).toLocaleString('vi-VN');
}

function getDoctorAccountState(account) {
  if (!account) return { label: 'Chưa cấp', badgeClass: 'bg-secondary-subtle text-secondary' };
  if (account.isActive === false) return { label: 'Đã khóa', badgeClass: 'bg-danger-subtle text-danger' };
  if (account.mustChangePassword) return { label: 'Chưa đổi mật khẩu', badgeClass: 'bg-warning-subtle text-warning-emphasis' };
  return { label: 'Đang hoạt động', badgeClass: 'bg-success-subtle text-success' };
}

export default function AdminDoctorsPage() {
  const toast = useToast();
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorUsers, setDoctorUsers] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [accountForm, setAccountForm] = useState(defaultAccountForm);
  const [editing, setEditing] = useState(null);
  const [detailDoctor, setDetailDoctor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState(defaultResetForm);
  const [deleting, setDeleting] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', clinicId: '', specialtyId: '' });
  const [currentPage, setCurrentPage] = useState(1);

  const clinicSpecialties = specialties.filter((item) => getId(item.clinicId) === form.clinicId);

  const filterSpecialties = specialties.filter((item) => !filters.clinicId || getId(item.clinicId) === filters.clinicId);
  const linkedDoctorUser = editing ? doctorUsers.find((item) => getId(item.doctorId) === editing._id) : null;
  const linkableDoctorUsers = doctorUsers.filter((item) => !item.doctorId || getId(item.doctorId) === editing?._id);
  const editingClinic = editing ? clinics.find((item) => item._id === getId(editing.clinicId)) : null;
  const editingClinicCode = editing?.clinicId?.clinicCode || editingClinic?.clinicCode || '';
  const editingPersonalEmail = editing?.personalEmail || editing?.email || '';
  const generatedLoginEmail = editingClinicCode && editing?.doctorCode
    ? `${editingClinicCode}-${editing.doctorCode}@clinicbooking.vn`
    : '';
  const resetPasswordUserInfo = {
    name: resetTarget?.account?.name || resetTarget?.doctor?.name,
    email: resetTarget?.account?.email || resetTarget?.doctor?.loginEmail || resetTarget?.doctor?.personalEmail,
    phone: resetTarget?.account?.phone || resetTarget?.doctor?.phone
  };
  const resetPasswordPolicy = validatePasswordStrength(resetForm.newPassword, resetPasswordUserInfo);
  const doctorAccountMap = useMemo(
    () => new Map(doctorUsers.filter((item) => item.doctorId).map((item) => [getId(item.doctorId), item])),
    [doctorUsers]
  );

  const filteredDoctors = useMemo(() => {
    const keyword = normalizeText(filters.search);
    return doctors.filter((item) => {
      const account = doctorAccountMap.get(item._id);
      const matchesSearch = !keyword || [item.name, item.personalEmail, item.email, item.doctorCode, item.clinicId?.clinicCode, account?.email, item.loginEmail]
        .some((value) => normalizeText(value).includes(keyword));
      const matchesClinic = !filters.clinicId || getId(item.clinicId) === filters.clinicId;
      const matchesSpecialty = !filters.specialtyId || getId(item.specialtyId) === filters.specialtyId;
      return matchesSearch && matchesClinic && matchesSpecialty;
    });
  }, [doctorAccountMap, doctors, filters]);

  const { currentPage: safePage, pageItems, totalPages } = useMemo(() => paginate(filteredDoctors, currentPage), [currentPage, filteredDoctors]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.clinicId, filters.specialtyId]);

  function load() {
    Promise.all([api('/clinics'), api('/specialties'), api('/doctors'), api('/admin/doctor-users')])
      .then(([clinicPayload, specialtyPayload, doctorPayload, doctorUserPayload]) => {
        setClinics(clinicPayload.data || []);
        setSpecialties(specialtyPayload.data || []);
        setDoctors(doctorPayload.data || []);
        setDoctorUsers(doctorUserPayload.data || []);
      })
      .catch((err) => {
        setError(err.message);
        toast.error(err.message);
      });
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setError('');
    setAccountForm(defaultAccountForm);
    setForm({ ...defaultForm, workingDays: normalizeWorkingDays(defaultForm.workingDays), clinicId: '', specialtyId: '' });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setError('');
    setAccountForm(defaultAccountForm);
    setForm({
      name: item.name || '',
      personalEmail: item.personalEmail || item.email || '',
      doctorCode: item.doctorCode || '',
      phone: item.phone || '',
      avatar: item.avatar || '/placeholder-doctor.svg',
      degree: item.degree || '',
      position: item.position || '',
      workplace: item.workplace || '',
      bio: item.bio || '',
      experienceYears: item.experienceYears || 0,
      description: item.description || '',
      clinicId: getId(item.clinicId),
      specialtyId: getId(item.specialtyId),
      workingDays: normalizeWorkingDays(item.workingDays),
      workingHoursStart: item.workingHours?.start || emptyWorkingHours.start,
      workingHoursEnd: item.workingHours?.end || emptyWorkingHours.end
    });
    setModalOpen(true);
  }

  function updateClinic(clinicId) {
    setForm({ ...form, clinicId, specialtyId: '' });
  }

  function updateFilterClinic(clinicId) {
    setFilters({ ...filters, clinicId, specialtyId: '' });
  }

  function toggleWorkingDay(dayOfWeek) {
    setForm((current) => {
      const selected = normalizeWorkingDays(current.workingDays);
      const workingDays = selected.includes(dayOfWeek) ? selected.filter((item) => item !== dayOfWeek) : [...selected, dayOfWeek];
      return { ...current, workingDays };
    });
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    setError('');

    try {
      const response = await apiForm('/uploads/doctor-avatar', formData);
      const url = getUploadUrl(response);
      if (!url) throw new Error('Không nhận được URL ảnh sau khi upload');
      setForm((current) => ({ ...current, avatar: url }));
      toast.success('Upload ảnh thành công');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      toast.warning('Vui lòng nhập tên bác sĩ');
      return;
    }
    if (!form.personalEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.personalEmail)) {
      toast.warning('Vui lòng nhập email cá nhân hợp lệ');
      return;
    }
    if (!form.clinicId) {
      toast.warning('Vui lòng chọn cơ sở');
      return;
    }
    if (!form.specialtyId) {
      toast.warning('Vui lòng chọn chuyên khoa');
      return;
    }
    if (Number(form.experienceYears) < 0) {
      toast.warning('Số năm kinh nghiệm phải lớn hơn hoặc bằng 0');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        email: form.personalEmail.trim(),
        personalEmail: form.personalEmail.trim(),
        experienceYears: Number(form.experienceYears),
        workingDays: normalizeWorkingDays(form.workingDays),
        workingHours: { start: form.workingHoursStart, end: form.workingHoursEnd }
      };
      delete body.workingHoursStart;
      delete body.workingHoursEnd;
      delete body.doctorCode;
      await api(editing ? `/doctors/${editing._id}` : '/doctors', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      toast.success(editing ? 'Cập nhật thành công' : 'Thêm thành công');
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/doctors/${deleting._id}`, { method: 'DELETE' });
      toast.success('Xóa thành công');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function createDoctorLoginAccount() {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = await api(`/admin/doctors/${editing._id}/account`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (payload.data?.emailSent) {
        toast.success('Tài khoản bác sĩ đã được tạo và gửi qua email');
      } else {
        toast.warning(payload.warning || 'Tạo tài khoản thành công nhưng gửi email thất bại');
      }
      setAccountForm(defaultAccountForm);
      load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function linkDoctorLoginAccount() {
    if (!editing) return;
    if (!accountForm.userId) {
      toast.warning('Vui lòng chọn tài khoản bác sĩ cần liên kết');
      return;
    }

    setSaving(true);
    try {
      await api(`/admin/doctors/${editing._id}/account`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: accountForm.userId })
      });
      toast.success('Liên kết tài khoản bác sĩ thành công');
      setAccountForm((current) => ({ ...current, userId: '' }));
      load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(item) {
    setDetailLoading(true);
    try {
      const payload = await api(`/admin/doctors/${item._id}/detail`);
      setDetailDoctor(payload.data || null);
    } catch (err) {
      toast.error(err.message || 'Không tải được chi tiết bác sĩ');
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateAccountStatus(doctor, account, isActive) {
    if (!doctor?._id || !account) return;
    setSaving(true);
    try {
      const payload = await api(`/admin/doctors/${doctor._id}/account/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      });
      toast.success(payload.message || (isActive ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công'));
      load();
      if (detailDoctor?.doctor?._id === doctor._id) {
        const detailPayload = await api(`/admin/doctors/${doctor._id}/detail`);
        setDetailDoctor(detailPayload.data || null);
      }
    } catch (err) {
      toast.error(err.message || 'Không cập nhật được trạng thái tài khoản');
    } finally {
      setSaving(false);
    }
  }

  function openResetPassword(doctor, account = null) {
    setResetTarget({ doctor, account });
    setResetForm(defaultResetForm);
  }

  async function submitResetPassword(event) {
    event.preventDefault();
    const sendEmail = resetForm.mode === 'email';
    if (!sendEmail && !resetForm.newPassword) {
      toast.warning('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (!sendEmail && !resetPasswordPolicy.valid) {
      toast.warning(resetPasswordPolicy.message);
      return;
    }
    if (!sendEmail && resetForm.newPassword !== resetForm.confirmPassword) {
      toast.warning('Mật khẩu nhập lại không khớp');
      return;
    }

    setSaving(true);
    try {
      const payload = await api(`/admin/doctors/${resetTarget.doctor._id}/account/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify(sendEmail
          ? { sendEmail: true }
          : { sendEmail: false, newPassword: resetForm.newPassword })
      });
      if (sendEmail && !payload.data?.emailSent) {
        toast.warning(payload.warning || 'Cấp lại mật khẩu thành công nhưng gửi email thất bại');
      } else {
        toast.success(sendEmail ? 'Mật khẩu tạm mới đã được gửi qua email' : 'Đã cấp lại mật khẩu cho bác sĩ');
      }
      setResetTarget(null);
      setResetForm(defaultResetForm);
    } catch (err) {
      toast.error(err.message || 'Không cấp lại được mật khẩu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center page-heading admin-page-heading">
        <div><span className="eyebrow">Quản lý</span><h1 className="h3 mt-2 mb-0">Bác sĩ</h1></div>
        <button className="btn btn-primary" onClick={openCreate}>Thêm bác sĩ</button>
      </div>

      <div className="management-panel admin-table-card">
        <div className="admin-table-toolbar">
          <input className="form-control" placeholder="Tìm theo tên hoặc email..." value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <select className="form-select" value={filters.clinicId} onChange={(event) => updateFilterClinic(event.target.value)}>
            <option value="">Tất cả cơ sở</option>
            {clinics.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
          <select className="form-select" value={filters.specialtyId} onChange={(event) => setFilters({ ...filters, specialtyId: event.target.value })}>
            <option value="">Tất cả chuyên khoa</option>
            {filterSpecialties.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </div>

        {filteredDoctors.length ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table">
                <thead><tr><th>Mã bác sĩ</th><th>Mã cơ sở</th><th>Tên</th><th>Email cá nhân</th><th>Email đăng nhập</th><th>Trạng thái tài khoản</th><th>Chuyên khoa</th><th></th></tr></thead>
                <tbody>
                  {pageItems.map((item) => {
                    const account = doctorAccountMap.get(item._id);
                    const accountState = getDoctorAccountState(account);
                    return (
                      <tr key={item._id}>
                        <td>
                          {item.doctorCode
                            ? <span className="badge bg-info-subtle text-primary">{item.doctorCode}</span>
                            : <span className="small text-warning">Bác sĩ chưa có mã. Vui lòng lưu lại hồ sơ hoặc chạy đồng bộ mã.</span>}
                        </td>
                        <td>
                          {item.clinicId?.clinicCode
                            ? <span className="badge bg-primary-subtle text-primary">{item.clinicId.clinicCode}</span>
                            : <span className="small text-warning">Cơ sở chưa có mã cơ sở. Vui lòng cập nhật cơ sở.</span>}
                        </td>
                        <td className="fw-semibold">{item.name}</td>
                        <td>{item.personalEmail || item.email}</td>
                        <td>{account?.email || item.loginEmail || 'Chưa cấp'}</td>
                        <td><span className={`badge ${accountState.badgeClass}`}>{accountState.label}</span></td>
                        <td>{getName(item.specialtyId)}</td>
                        <td className="text-end text-nowrap">
                          <button className="btn btn-sm btn-outline-info me-2" onClick={() => openDetail(item)}>Chi tiết</button>
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(item)}>Sửa</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(item)}>Xóa</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        ) : (
          <AdminEmptyState message="Không có bác sĩ phù hợp" />
        )}
      </div>

      {modalOpen && (
        <BaseModal ariaLabel={editing ? 'Cập nhật thông tin bác sĩ' : 'Thêm bác sĩ'} className="admin-modal admin-doctor-modal" disableClose={saving || uploading} onClose={() => setModalOpen(false)} size="lg">
          <div className="admin-doctor-modal-header">
            <div>
              <span className="eyebrow">Quản lý bác sĩ</span>
              <h2>{editing ? 'Cập nhật thông tin bác sĩ' : 'Thêm bác sĩ'}</h2>
            </div>
            <button className="btn btn-sm btn-outline-secondary" disabled={saving || uploading} type="button" onClick={() => setModalOpen(false)}>
              Đóng
            </button>
          </div>

          <form className="admin-doctor-form" onSubmit={submit}>
            <div className="admin-doctor-modal-body">
              <AdminAlert message={error} type="danger" />

              <section className="admin-doctor-form-section admin-doctor-avatar-section">
                <div>
                  <h3>Ảnh đại diện</h3>
                  <p>Ảnh rõ mặt giúp hồ sơ bác sĩ chuyên nghiệp hơn.</p>
                </div>
                <div className="admin-doctor-avatar-card">
                  <img src={resolveMediaUrl(form.avatar, '/placeholder-doctor.svg')} alt="Preview bác sĩ" onError={(event) => useImageFallback(event, '/placeholder-doctor.svg')} />
                  <label className={`admin-doctor-upload-btn ${uploading ? 'disabled' : ''}`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadAvatar} />
                    {uploading ? 'Đang tải ảnh...' : 'Tải ảnh bác sĩ'}
                  </label>
                </div>
              </section>

            <section className="admin-doctor-form-section">
              <h3>Thông tin cơ bản</h3>
              <div className="admin-doctor-form-grid">
                <label><span>Họ tên</span><input className="form-control" placeholder="Nhập họ tên bác sĩ" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                <label><span>Email cá nhân</span><input className="form-control" type="email" placeholder="doctor@example.com" value={form.personalEmail} onChange={(event) => setForm({ ...form, personalEmail: event.target.value })} /></label>
                <label>
                  <span>Mã bác sĩ</span>
                  <input className="form-control" disabled value={form.doctorCode || 'Sẽ tự sinh khi lưu'} />
                </label>
                <label><span>Số điện thoại</span><input className="form-control" placeholder="Nhập số điện thoại" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label><span>Học vị</span><input className="form-control" placeholder="VD: ThS. BS, CKII" value={form.degree} onChange={(event) => setForm({ ...form, degree: event.target.value })} /></label>
              </div>
            </section>

            <section className="admin-doctor-form-section">
              <h3>Thông tin công tác</h3>
              <div className="admin-doctor-form-grid">
                <label>
                  <span>Cơ sở</span>
                  <select className="form-select" value={form.clinicId} onChange={(event) => updateClinic(event.target.value)}>
                    <option value="">Chọn cơ sở</option>
                    {clinics.map((item) => <option key={item._id} value={item._id}>{item.name}{item.clinicCode ? ` (${item.clinicCode})` : ''}</option>)}
                  </select>
                </label>
                <label>
                  <span>Chuyên khoa</span>
                  <select className="form-select" disabled={!form.clinicId || clinicSpecialties.length === 0} value={form.specialtyId} onChange={(event) => setForm({ ...form, specialtyId: event.target.value })}>
                    <option value="">{form.clinicId && clinicSpecialties.length === 0 ? 'Cơ sở này chưa có chuyên khoa' : 'Chọn chuyên khoa'}</option>
                    {clinicSpecialties.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                  </select>
                  {form.clinicId && clinicSpecialties.length === 0 && <small className="text-danger">Cơ sở này chưa có chuyên khoa</small>}
                </label>
                <label><span>Chức vụ</span><input className="form-control" placeholder="VD: Trưởng khoa" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} /></label>
                <label><span>Nơi công tác</span><input className="form-control" placeholder="Nhập nơi công tác" value={form.workplace} onChange={(event) => setForm({ ...form, workplace: event.target.value })} /></label>
                <label><span>Số năm kinh nghiệm</span><input className="form-control" type="number" min="0" placeholder="0" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} /></label>
              </div>
            </section>

            <section className="admin-doctor-form-section">
              <h3>Giới thiệu chuyên môn</h3>
              <label className="admin-doctor-textarea"><span>Giới thiệu</span><textarea className="form-control" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Nhập giới thiệu chuyên môn" /></label>
              <label className="admin-doctor-textarea"><span>Mô tả</span><textarea className="form-control" rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Nhập mô tả ngắn" /></label>
            </section>

            <section className="admin-doctor-form-section admin-doctor-account-section">
              <h3>Tài khoản đăng nhập</h3>
              {editing ? (
                <>
                  <div className={`doctor-account-status ${linkedDoctorUser ? 'linked' : 'empty'}`}>
                    <strong>
                      {linkedDoctorUser ? (
                        <>Trạng thái tài khoản: <span className={`badge ${getDoctorAccountState(linkedDoctorUser).badgeClass}`}>{getDoctorAccountState(linkedDoctorUser).label}</span></>
                      ) : 'Trạng thái: Chưa có tài khoản đăng nhập'}
                    </strong>
                    {linkedDoctorUser ? (
                      <>
                        <span>Email đăng nhập: <strong>{linkedDoctorUser.email}</strong></span>
                        <span>Email cá nhân nhận thông báo: <strong>{editingPersonalEmail || 'Chưa cập nhật'}</strong></span>
                      </>
                    ) : (
                      <span>Bạn có thể tạo tài khoản mới hoặc liên kết tài khoản bác sĩ đã tồn tại.</span>
                    )}
                    {linkedDoctorUser && (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => openResetPassword(editing, linkedDoctorUser)}>
                          Cấp lại mật khẩu
                        </button>
                        <button
                          className={`btn btn-sm ${linkedDoctorUser.isActive === false ? 'btn-outline-success' : 'btn-outline-danger'}`}
                          disabled={saving}
                          type="button"
                          onClick={() => updateAccountStatus(editing, linkedDoctorUser, linkedDoctorUser.isActive === false)}
                        >
                          {linkedDoctorUser.isActive === false ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        </button>
                      </div>
                    )}
                  </div>

                  {!linkedDoctorUser && (
                    <div className="doctor-account-actions">
                      <div className="doctor-account-box">
                        <h4>Tạo tài khoản mới</h4>
                        <div className="doctor-account-status empty">
                          <span>Email đăng nhập sẽ được tạo:</span>
                          <strong>{generatedLoginEmail || 'Chưa đủ mã cơ sở hoặc mã bác sĩ'}</strong>
                          <span>Email cá nhân nhận thông tin: <strong>{editingPersonalEmail || 'Chưa cập nhật'}</strong></span>
                        </div>
                        <button className="btn admin-gradient-btn mt-3" disabled={saving || !generatedLoginEmail || !editingPersonalEmail} type="button" onClick={createDoctorLoginAccount}>
                          Tạo và gửi tài khoản bác sĩ
                        </button>
                      </div>

                      <div className="doctor-account-box">
                        <h4>Liên kết tài khoản có sẵn</h4>
                        <label>
                          <span>Chọn tài khoản bác sĩ</span>
                          <select className="form-select" value={accountForm.userId} onChange={(event) => setAccountForm({ ...accountForm, userId: event.target.value })}>
                            <option value="">Chọn tài khoản chưa liên kết</option>
                            {linkableDoctorUsers.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.name} - {item.email}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="btn btn-outline-primary mt-3" disabled={saving || !linkableDoctorUsers.length} type="button" onClick={linkDoctorLoginAccount}>
                          Liên kết tài khoản
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="doctor-account-status empty">
                  <strong>Lưu hồ sơ bác sĩ trước</strong>
                  <span>Sau khi tạo bác sĩ, mở lại màn sửa để cấp tài khoản đăng nhập.</span>
                </div>
              )}
            </section>

            <section className="admin-doctor-form-section">
              <h3>Lịch làm việc mặc định</h3>
              <div className="admin-doctor-working-days">
                {daysOfWeek.map((dayOfWeek) => (
                  <label key={dayOfWeek}>
                    <input type="checkbox" checked={normalizeWorkingDays(form.workingDays).includes(dayOfWeek)} onChange={() => toggleWorkingDay(dayOfWeek)} />
                    <span>{dayLabels[dayOfWeek]}</span>
                  </label>
                ))}
              </div>
              <div className="admin-doctor-form-grid mt-3">
                <label><span>Giờ bắt đầu</span><input type="time" className="form-control" value={form.workingHoursStart} onChange={(event) => setForm({ ...form, workingHoursStart: event.target.value })} /></label>
                <label><span>Giờ kết thúc</span><input type="time" className="form-control" value={form.workingHoursEnd} onChange={(event) => setForm({ ...form, workingHoursEnd: event.target.value })} /></label>
              </div>
            </section>

            </div>

            <div className="admin-doctor-modal-footer">
              <button className="btn btn-outline-secondary" disabled={saving || uploading} type="button" onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn admin-gradient-btn" disabled={saving || uploading} type="submit">{saving ? 'Đang lưu...' : 'Lưu bác sĩ'}</button>
            </div>
          </form>
        </BaseModal>
      )}

      {(detailDoctor || detailLoading) && (
        <BaseModal ariaLabel="Chi tiết bác sĩ" className="admin-modal doctor-detail-admin-modal" onClose={() => setDetailDoctor(null)} size="lg">
          {detailLoading ? (
            <div className="admin-empty-state">
              <p>Đang tải chi tiết bác sĩ...</p>
            </div>
          ) : (
            <>
              <div className="admin-doctor-modal-header">
                <div>
                  <span className="eyebrow">Chi tiết bác sĩ</span>
                  <h2>{detailDoctor.doctor?.name}</h2>
                </div>
                <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setDetailDoctor(null)}>
                  Đóng
                </button>
              </div>

              <div className="doctor-detail-admin-body">
                <section className="doctor-detail-admin-profile">
                  <img
                    src={resolveMediaUrl(detailDoctor.doctor?.avatar, '/placeholder-doctor.svg')}
                    alt={detailDoctor.doctor?.name || 'Bác sĩ'}
                    onError={(event) => useImageFallback(event, '/placeholder-doctor.svg')}
                  />
                  <div>
                    <span className="eyebrow">Thông tin bác sĩ</span>
                    <h3>{detailDoctor.doctor?.degree ? `${detailDoctor.doctor.degree} ${detailDoctor.doctor.name}` : detailDoctor.doctor?.name}</h3>
                    <p>{detailDoctor.doctor?.description || detailDoctor.doctor?.bio || 'Chưa có mô tả.'}</p>
                  </div>
                </section>

                <section className="doctor-detail-admin-grid">
                  <article><span>Mã bác sĩ</span><strong>{detailDoctor.doctor?.doctorCode || 'Bác sĩ chưa có mã. Vui lòng lưu lại hồ sơ hoặc chạy đồng bộ mã.'}</strong></article>
                  <article><span>Mã cơ sở</span><strong>{detailDoctor.doctor?.clinicId?.clinicCode || 'Cơ sở chưa có mã cơ sở. Vui lòng cập nhật cơ sở.'}</strong></article>
                  <article><span>Email cá nhân</span><strong>{detailDoctor.doctor?.personalEmail || detailDoctor.doctor?.email || 'Chưa cập nhật'}</strong></article>
                  <article><span>Email đăng nhập</span><strong>{detailDoctor.doctor?.loginEmail || detailDoctor.account?.email || 'Chưa cấp tài khoản'}</strong></article>
                  <article><span>Số điện thoại</span><strong>{detailDoctor.doctor?.phone || 'Chưa cập nhật'}</strong></article>
                  <article><span>Học vị</span><strong>{detailDoctor.doctor?.degree || 'Chưa cập nhật'}</strong></article>
                  <article><span>Chuyên khoa</span><strong>{getName(detailDoctor.doctor?.specialtyId)}</strong></article>
                  <article>
                    <span>Cơ sở</span>
                    <strong>
                      {getName(detailDoctor.doctor?.clinicId)}
                      {detailDoctor.doctor?.clinicId?.clinicCode ? ` (${detailDoctor.doctor.clinicId.clinicCode})` : ''}
                    </strong>
                  </article>
                  <article><span>Kinh nghiệm</span><strong>{detailDoctor.doctor?.experienceYears || 0} năm</strong></article>
                </section>

                <section className="doctor-detail-admin-section">
                  <h3>Tài khoản đăng nhập</h3>
                  {detailDoctor.account ? (
                    <div className="doctor-account-status linked">
                      <strong>Trạng thái tài khoản: <span className={`badge ${getDoctorAccountState(detailDoctor.account).badgeClass}`}>{getDoctorAccountState(detailDoctor.account).label}</span></strong>
                      <span>Email đăng nhập: <strong>{detailDoctor.account.email}</strong></span>
                      <span>Email cá nhân nhận thông báo: <strong>{detailDoctor.doctor?.personalEmail || detailDoctor.doctor?.email || 'Chưa cập nhật'}</strong></span>
                      <span>Tên tài khoản: {detailDoctor.account.name}</span>
                      <span>Role: {detailDoctor.account.role}</span>
                      <span>Ngày tạo tài khoản: {formatDateTime(detailDoctor.account.createdAt)}</span>
                      <span>Ngày đổi mật khẩu lần đầu: {formatDateTime(detailDoctor.account.initialPasswordChangedAt)}</span>
                      <span>Lần đăng nhập cuối: {formatDateTime(detailDoctor.account.lastLoginAt)}</span>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => openResetPassword(detailDoctor.doctor, detailDoctor.account)}>
                          Cấp lại mật khẩu
                        </button>
                        <button
                          className={`btn btn-sm ${detailDoctor.account.isActive === false ? 'btn-outline-success' : 'btn-outline-danger'}`}
                          disabled={saving}
                          type="button"
                          onClick={() => updateAccountStatus(detailDoctor.doctor, detailDoctor.account, detailDoctor.account.isActive === false)}
                        >
                          {detailDoctor.account.isActive === false ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="doctor-account-status empty">
                      <strong>Trạng thái: Chưa có tài khoản đăng nhập</strong>
                      <span>Email cá nhân nhận thông báo: <strong>{detailDoctor.doctor?.personalEmail || detailDoctor.doctor?.email || 'Chưa cập nhật'}</strong></span>
                      <span>Bác sĩ này chưa được cấp hoặc liên kết tài khoản đăng nhập.</span>
                    </div>
                  )}
                </section>

                <section className="doctor-detail-admin-section">
                  <h3>Lịch làm việc mặc định</h3>
                  <div className="doctor-detail-admin-grid compact">
                    <article>
                      <span>Ngày làm việc</span>
                      <strong>{normalizeWorkingDays(detailDoctor.doctor?.workingDays).map((day) => dayLabels[day]).join(', ') || 'Chưa cập nhật'}</strong>
                    </article>
                    <article>
                      <span>Giờ làm việc</span>
                      <strong>{detailDoctor.doctor?.workingHours?.start || '08:00'} - {detailDoctor.doctor?.workingHours?.end || '17:00'}</strong>
                    </article>
                  </div>
                </section>
              </div>
            </>
          )}
        </BaseModal>
      )}

      {resetTarget && (
        <BaseModal ariaLabel="Cấp lại mật khẩu" className="admin-confirm-dialog" disableClose={saving} onClose={() => setResetTarget(null)} size="sm">
          <h2 className="h5 mb-2">Cấp lại mật khẩu</h2>
          <p className="text-secondary mb-3">
            Chọn cách cấp lại mật khẩu cho {resetTarget.doctor?.name}.
          </p>
          <form onSubmit={submitResetPassword}>
            <div className="d-grid gap-2 mb-3">
              <label className="border rounded-3 p-3 d-flex gap-2 align-items-start">
                <input
                  className="form-check-input mt-1"
                  checked={resetForm.mode === 'email'}
                  name="resetMode"
                  type="radio"
                  onChange={() => setResetForm({ ...defaultResetForm, mode: 'email' })}
                />
                <span>
                  <strong className="d-block">Tạo mật khẩu tạm và gửi qua email</strong>
                  <small className="text-secondary">Mật khẩu tạm sẽ được gửi tới email cá nhân của bác sĩ. Bác sĩ phải đổi mật khẩu trong lần đăng nhập đầu tiên.</small>
                </span>
              </label>
              <label className="border rounded-3 p-3 d-flex gap-2 align-items-start">
                <input
                  className="form-check-input mt-1"
                  checked={resetForm.mode === 'manual'}
                  name="resetMode"
                  type="radio"
                  onChange={() => setResetForm({ ...defaultResetForm, mode: 'manual' })}
                />
                <span><strong>Nhập mật khẩu mới thủ công</strong></span>
              </label>
            </div>
            {resetForm.mode === 'manual' && (
              <>
                <label className="form-label">Mật khẩu mới</label>
                <input
                  autoComplete="new-password"
                  className="form-control mb-3"
                  type="password"
                  value={resetForm.newPassword}
                  onChange={(event) => setResetForm({ ...resetForm, newPassword: event.target.value })}
                />
                <PasswordPolicyMeter password={resetForm.newPassword} userInfo={resetPasswordUserInfo} />
                <label className="form-label">Nhập lại mật khẩu mới</label>
                <input
                  autoComplete="new-password"
                  className="form-control mb-4"
                  type="password"
                  value={resetForm.confirmPassword}
                  onChange={(event) => setResetForm({ ...resetForm, confirmPassword: event.target.value })}
                />
              </>
            )}
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary" disabled={saving} type="button" onClick={() => setResetTarget(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" disabled={saving || (resetForm.mode === 'manual' && !resetPasswordPolicy.valid)} type="submit">
                {saving ? 'Đang xử lý...' : resetForm.mode === 'email' ? 'Tạo và gửi mật khẩu tạm' : 'Đặt mật khẩu mới'}
              </button>
            </div>
          </form>
        </BaseModal>
      )}

      {deleting && (
        <ConfirmDialog title="Xóa bác sĩ" message={`Xóa bác sĩ ${deleting.name}?`} onCancel={() => setDeleting(null)} onConfirm={remove} />
      )}
    </>
  );
}
