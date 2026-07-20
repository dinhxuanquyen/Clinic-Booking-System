import { useEffect, useMemo, useState } from 'react';
import { api, apiForm } from '../../api/client.js';
import BaseModal from '../../components/BaseModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { resolveMediaUrl, useImageFallback } from '../../utils/media.js';
import { AdminAlert, AdminEmptyState, AdminPagination, ConfirmDialog, normalizeText, paginate } from './adminUtils.jsx';

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

const defaultWorkingHours = daysOfWeek.map((dayOfWeek) => ({
  dayOfWeek,
  open: '08:00',
  close: '17:00',
  isClosed: false
}));

const defaultForm = {
  name: '',
  clinicCode: '',
  address: '',
  phone: '',
  email: '',
  description: '',
  image: '/placeholder-clinic.svg',
  galleryImages: [],
  workingHours: defaultWorkingHours
};

function normalizeWorkingHours(value) {
  const parsed = Array.isArray(value) ? value : [];
  return daysOfWeek.map((dayOfWeek) => {
    const current = parsed.find((item) => item?.dayOfWeek === dayOfWeek) || {};
    return {
      dayOfWeek,
      open: current.open || '08:00',
      close: current.close || '17:00',
      isClosed: Boolean(current.isClosed)
    };
  });
}

function buildDefaultForm() {
  return { ...defaultForm, workingHours: normalizeWorkingHours(defaultForm.workingHours) };
}

function getUploadUrl(response) {
  return response?.data?.url || response?.data?.data?.url || response?.url || '';
}

function normalizeGalleryImages(images) {
  const list = Array.isArray(images) ? images : [];
  const normalized = list.map((item) => String(item || '').trim()).filter(Boolean);

  return Array.from(new Set(normalized));
}

function isSameImage(first, second) {
  const firstValue = String(first || '').trim();
  const secondValue = String(second || '').trim();
  if (!firstValue || !secondValue) return false;

  return firstValue === secondValue || resolveMediaUrl(firstValue, '') === resolveMediaUrl(secondValue, '');
}

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AdminClinicsPage() {
  const toast = useToast();
  const [clinics, setClinics] = useState([]);
  const [form, setForm] = useState(buildDefaultForm);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredClinics = useMemo(() => {
    const keyword = normalizeText(search);
    if (!keyword) return clinics;
    return clinics.filter((item) => [item.name, item.clinicCode, item.address, item.email, item.phone].some((value) => normalizeText(value).includes(keyword)));
  }, [clinics, search]);

  const { currentPage: safePage, pageItems, totalPages } = useMemo(() => paginate(filteredClinics, currentPage), [currentPage, filteredClinics]);
  const visibleGalleryImages = useMemo(
    () => normalizeGalleryImages(form.galleryImages).filter((url) => !isSameImage(url, form.image)),
    [form.galleryImages, form.image]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  function load() {
    api('/clinics')
      .then((payload) => setClinics(payload.data || []))
      .catch((err) => {
        setError(err.message);
        toast.error(err.message);
      });
  }

  useEffect(load, []);

  function closeModal() {
    if (saving || uploading) return;
    setEditing(null);
    setForm(buildDefaultForm());
    setModalOpen(false);
  }

  function openCreate() {
    setEditing(null);
    setError('');
    setForm(buildDefaultForm());
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setError('');
    setForm({
      name: item.name || '',
      clinicCode: item.clinicCode || '',
      address: item.address || '',
      phone: item.phone || '',
      email: item.email || '',
      description: item.description || '',
      image: item.image || '/placeholder-clinic.svg',
      galleryImages: normalizeGalleryImages(item.galleryImages).filter((url) => !isSameImage(url, item.image)),
      workingHours: normalizeWorkingHours(item.workingHours)
    });
    setModalOpen(true);
  }

  function updateWorkingHour(dayOfWeek, field, value) {
    setForm((current) => ({
      ...current,
      workingHours: current.workingHours.map((item) => (item.dayOfWeek === dayOfWeek ? { ...item, [field]: value } : item))
    }));
  }

  function validateForm() {
    if (!form.name.trim()) return 'Vui lòng nhập tên cơ sở';
    if (!/^[A-Za-z][A-Za-z0-9]{1,4}$/.test(form.clinicCode.trim())) return 'Mã cơ sở phải gồm 2-5 ký tự chữ hoặc số, bắt đầu bằng chữ và không có khoảng trắng';
    if (!form.address.trim()) return 'Vui lòng nhập địa chỉ cơ sở';
    if (!form.phone.trim()) return 'Vui lòng nhập số điện thoại cơ sở';
    if (!isValidEmail(form.email.trim())) return 'Email cơ sở không hợp lệ';
    return '';
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    setError('');

    try {
      const response = await apiForm('/uploads/clinic-image', formData);
      const url = getUploadUrl(response);
      if (!url) throw new Error('Không nhận được URL ảnh sau khi upload');
      setForm((current) => ({
        ...current,
        image: url,
        galleryImages: normalizeGalleryImages(current.galleryImages).filter((item) => !isSameImage(item, url))
      }));
      toast.success('Upload ảnh thành công');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function uploadGalleryImages(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError('');

    try {
      const urls = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await apiForm('/uploads/clinic-image', formData);
        const url = getUploadUrl(response);
        if (url) urls.push(url);
      }

      if (!urls.length) throw new Error('Không nhận được URL ảnh sau khi upload');
      setForm((current) => {
        const image = current.image && current.image !== '/placeholder-clinic.svg' ? current.image : urls[0];

        return {
          ...current,
          image,
          galleryImages: normalizeGalleryImages([...current.galleryImages, ...urls]).filter((item) => !isSameImage(item, image))
        };
      });
      toast.success(`Upload ${urls.length} ảnh thành công`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function setPrimaryImage(url) {
    setForm((current) => ({
      ...current,
      image: url,
      galleryImages: normalizeGalleryImages(current.galleryImages).filter((item) => !isSameImage(item, url))
    }));
  }

  function removeGalleryImage(url) {
    setForm((current) => {
      const galleryImages = current.galleryImages.filter((item) => item !== url);
      const image = current.image === url ? galleryImages[0] || '/placeholder-clinic.svg' : current.image;

      return {
        ...current,
        image,
        galleryImages: normalizeGalleryImages(galleryImages)
      };
    });
  }

  async function submit(event) {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      toast.warning(validationMessage);
      return;
    }

    setError('');
    setSaving(true);
    try {
      await api(editing ? `/clinics/${editing._id}` : '/clinics', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          clinicCode: form.clinicCode.trim().toUpperCase(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          description: form.description.trim(),
          image: form.image,
          galleryImages: normalizeGalleryImages(form.galleryImages).filter((url) => !isSameImage(url, form.image)),
          workingHours: normalizeWorkingHours(form.workingHours)
        })
      });
      toast.success(editing ? 'Cập nhật thành công' : 'Thêm thành công');
      setModalOpen(false);
      setEditing(null);
      setForm(buildDefaultForm());
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
      await api(`/clinics/${deleting._id}`, { method: 'DELETE' });
      toast.success('Xóa thành công');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center page-heading admin-page-heading">
        <div><span className="eyebrow">Quản lý</span><h1 className="h3 mt-2 mb-0">Cơ sở</h1></div>
        <button className="btn btn-primary" onClick={openCreate}>Thêm cơ sở</button>
      </div>

      <div className="management-panel admin-table-card">
        <div className="admin-table-toolbar">
          <input className="form-control" placeholder="Tìm theo tên, địa chỉ, email, số điện thoại..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {filteredClinics.length ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table admin-clinics-table">
                <thead><tr><th>Cơ sở</th><th>Địa chỉ</th><th>Điện thoại</th><th>Email</th><th></th></tr></thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="admin-media-cell">
                          <img
                            className="admin-media-thumb admin-media-thumb-clinic"
                            src={resolveMediaUrl(item.image, '/placeholder-clinic.svg')}
                            alt={item.name || 'Cơ sở'}
                            onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')}
                          />
                          <div className="admin-media-copy">
                            <strong title={item.name}>{item.name}</strong>
                            <div className="admin-media-meta">
                              <span className="admin-code-pill">{item.clinicCode || 'Chưa có mã'}</span>
                              {Array.isArray(item.galleryImages) && item.galleryImages.length > 0 ? (
                                <span className="admin-media-count">{item.galleryImages.length} ảnh không gian</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="admin-table-text admin-table-address" title={item.address}>{item.address}</span></td>
                      <td><span className="admin-table-text">{item.phone}</span></td>
                      <td><span className="admin-table-text admin-table-email" title={item.email}>{item.email}</span></td>
                      <td className="text-end">
                        <div className="admin-table-actions">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(item)}>Sửa</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(item)}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        ) : (
          <AdminEmptyState message="Không có cơ sở phù hợp" />
        )}
      </div>

      {modalOpen && (
        <BaseModal ariaLabel={editing ? 'Cập nhật cơ sở' : 'Thêm cơ sở'} className="admin-modal admin-clinic-modal" disableClose={saving || uploading} onClose={closeModal} size="lg">
          <div className="admin-clinic-modal-header">
            <div>
              <span className="eyebrow">QUẢN LÝ CƠ SỞ</span>
              <h2>{editing ? 'Cập nhật cơ sở' : 'Thêm cơ sở'}</h2>
            </div>
            <button className="btn btn-sm btn-outline-secondary" disabled={saving || uploading} type="button" onClick={closeModal}>
              Đóng
            </button>
          </div>

          <form className="admin-clinic-form" onSubmit={submit}>
            <div className="admin-clinic-modal-body">
              <AdminAlert message={error} type="danger" />

              <section className="admin-clinic-form-section">
                <h3>Thông tin cơ sở</h3>
                <div className="admin-clinic-form-grid">
                  <label>
                    <span>Tên cơ sở</span>
                    <input className="form-control" placeholder="Nhập tên cơ sở" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  </label>
                  <label>
                    <span>Mã cơ sở</span>
                    <input
                      className="form-control text-uppercase"
                      maxLength="5"
                      placeholder="VD: HN"
                      value={form.clinicCode}
                      onChange={(event) => setForm({ ...form, clinicCode: event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() })}
                    />
                  </label>
                  <label>
                    <span>Địa chỉ</span>
                    <input className="form-control" placeholder="Nhập địa chỉ cơ sở" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                  </label>
                  <label>
                    <span>Số điện thoại</span>
                    <input className="form-control" placeholder="Nhập số điện thoại" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                  </label>
                  <label>
                    <span>Email</span>
                    <input className="form-control" placeholder="Nhập email cơ sở" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                  </label>
                </div>
              </section>

              <section className="admin-clinic-form-section admin-clinic-image-section">
                <div>
                  <h3>Ảnh chính cơ sở</h3>
                  <p>Ảnh đại diện hiển thị ở đầu trang chi tiết cơ sở.</p>
                </div>
                <div className="admin-clinic-image-card">
                  <img src={resolveMediaUrl(form.image, '/placeholder-clinic.svg')} alt="Preview cơ sở" onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')} />
                  <div className="admin-clinic-image-actions">
                    <label className={`admin-clinic-upload-btn ${uploading ? 'disabled' : ''}`}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadImage} />
                      {uploading ? 'Đang tải ảnh...' : 'Tải ảnh chính'}
                    </label>
                  </div>
                </div>
              </section>

              <section className="admin-clinic-form-section admin-clinic-gallery-section">
                <div className="admin-clinic-gallery-header">
                  <div>
                    <h3>Ảnh không gian khám bệnh</h3>
                    <p>Thêm nhiều ảnh phòng khám, khu tiếp đón và trang thiết bị để hiển thị trong trang chi tiết.</p>
                  </div>
                  <label className={`admin-clinic-upload-btn secondary inline ${uploading ? 'disabled' : ''}`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={uploadGalleryImages} />
                    {uploading ? 'Đang tải ảnh...' : 'Thêm ảnh không gian'}
                  </label>
                </div>
                {visibleGalleryImages.length ? (
                  <div className="admin-clinic-gallery-list">
                    {visibleGalleryImages.map((url) => (
                      <article className="admin-clinic-gallery-thumb" key={url}>
                        <img src={resolveMediaUrl(url, '/placeholder-clinic.svg')} alt="Ảnh không gian khám bệnh" onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')} />
                        <span className="admin-clinic-gallery-badge">Ảnh không gian</span>
                        <div className="admin-clinic-gallery-actions">
                          <button type="button" onClick={() => setPrimaryImage(url)}>Dùng làm chính</button>
                          <button type="button" onClick={() => removeGalleryImage(url)}>Xóa</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="admin-clinic-gallery-empty">Chưa có ảnh không gian khám bệnh.</div>
                )}
              </section>

              <section className="admin-clinic-form-section">
                <h3>Mô tả cơ sở</h3>
                <label className="admin-clinic-textarea">
                  <span>Mô tả</span>
                  <textarea className="form-control" placeholder="Nhập mô tả cơ sở" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                </label>
              </section>

              <section className="admin-clinic-form-section">
                <h3>Giờ làm việc</h3>
                <div className="admin-clinic-working-hours">
                  {form.workingHours.map((item) => (
                    <div className="admin-clinic-working-row" key={item.dayOfWeek}>
                      <div className="admin-clinic-day-label">{dayLabels[item.dayOfWeek]}</div>
                      <label>
                        <span>Giờ bắt đầu</span>
                        <input type="time" className="form-control" value={item.open} disabled={item.isClosed} onChange={(event) => updateWorkingHour(item.dayOfWeek, 'open', event.target.value)} />
                      </label>
                      <label>
                        <span>Giờ kết thúc</span>
                        <input type="time" className="form-control" value={item.close} disabled={item.isClosed} onChange={(event) => updateWorkingHour(item.dayOfWeek, 'close', event.target.value)} />
                      </label>
                      <label className="admin-clinic-switch">
                        <input type="checkbox" checked={!item.isClosed} onChange={(event) => updateWorkingHour(item.dayOfWeek, 'isClosed', !event.target.checked)} />
                        <span>Đang hoạt động</span>
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="admin-clinic-modal-footer">
              <button className="btn btn-outline-secondary" disabled={saving || uploading} type="button" onClick={closeModal}>Hủy</button>
              <button className="btn admin-gradient-btn" disabled={saving || uploading} type="submit">{saving ? 'Đang lưu...' : 'Lưu cơ sở'}</button>
            </div>
          </form>
        </BaseModal>
      )}
      {deleting && (
        <ConfirmDialog title="Xóa cơ sở" message={`Xóa cơ sở ${deleting.name}?`} onCancel={() => setDeleting(null)} onConfirm={remove} />
      )}
    </>
  );
}
