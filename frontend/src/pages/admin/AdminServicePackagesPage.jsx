import { useEffect, useMemo, useState } from 'react';
import BaseModal from '../../components/BaseModal.jsx';
import { api, apiForm } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { resolveMediaUrl, useImageFallback } from '../../utils/media.js';
import { AdminEmptyState, normalizeText } from './adminUtils.jsx';

const defaultForm = {
  name: '',
  description: '',
  imageUrl: '',
  targetPatients: '',
  includes: '',
  price: '',
  durationMinutes: 30,
  clinicId: '',
  specialtyId: '',
  doctorId: '',
  isActive: true
};

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getName(value, fallback = 'Tất cả bác sĩ') {
  if (!value) return fallback;
  return typeof value === 'object' ? value.name || fallback : String(value);
}

function listToText(value) {
  return Array.isArray(value) ? value.join('\n') : String(value || '');
}

function textToList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUploadUrl(response) {
  return response?.data?.url || response?.data?.data?.url || response?.url || '';
}

export default function AdminServicePackagesPage() {
  const toast = useToast();
  const [packages, setPackages] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', clinicId: '', specialtyId: '', status: '' });

  const filteredSpecialties = useMemo(() => (
    specialties.filter((item) => !form.clinicId || (item.clinicId?._id || item.clinicId) === form.clinicId)
  ), [specialties, form.clinicId]);

  const visiblePackages = useMemo(() => {
    const keyword = normalizeText(filters.keyword);
    return packages.filter((item) => {
      const matchesKeyword = !keyword || [item.name, item.code, item.description].some((value) => normalizeText(value).includes(keyword));
      const matchesClinic = !filters.clinicId || (item.clinicId?._id || item.clinicId) === filters.clinicId;
      const matchesSpecialty = !filters.specialtyId || (item.specialtyId?._id || item.specialtyId) === filters.specialtyId;
      const matchesStatus = !filters.status || (filters.status === 'active' ? item.isActive : !item.isActive);
      return matchesKeyword && matchesClinic && matchesSpecialty && matchesStatus;
    });
  }, [packages, filters]);

  async function loadPackages() {
    try {
      const payload = await api('/admin/service-packages');
      setPackages(payload.data || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được gói khám');
    }
  }

  useEffect(() => {
    loadPackages();
    Promise.allSettled([api('/clinics'), api('/specialties')]).then(([clinicResult, specialtyResult]) => {
      if (clinicResult.status === 'fulfilled') setClinics(clinicResult.value.data || []);
      if (specialtyResult.status === 'fulfilled') setSpecialties(specialtyResult.value.data || []);
    });
  }, []);

  useEffect(() => {
    setDoctors([]);
    setForm((current) => ({ ...current, doctorId: '' }));
    if (!form.clinicId || !form.specialtyId) return;
    api('/doctors', { params: { clinicId: form.clinicId, specialtyId: form.specialtyId } })
      .then((payload) => setDoctors(payload.data || []))
      .catch(() => setDoctors([]));
  }, [form.clinicId, form.specialtyId]);

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      targetPatients: listToText(item.targetPatients),
      includes: listToText(item.includes),
      price: item.price ?? '',
      durationMinutes: item.durationMinutes || 30,
      clinicId: item.clinicId?._id || item.clinicId || '',
      specialtyId: item.specialtyId?._id || item.specialtyId || '',
      doctorId: item.doctorId?._id || item.doctorId || '',
      isActive: item.isActive !== false
    });
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'clinicId' ? { specialtyId: '', doctorId: '' } : {}),
      ...(field === 'specialtyId' ? { doctorId: '' } : {})
    }));
  }

  function validateForm() {
    if (!form.name.trim()) return 'Vui lòng nhập tên gói khám';
    if (!form.clinicId) return 'Vui lòng chọn cơ sở';
    if (!form.specialtyId) return 'Vui lòng chọn chuyên khoa';
    if (Number(form.price) < 0 || form.price === '') return 'Giá gói khám không hợp lệ';
    if (Number(form.durationMinutes) <= 0) return 'Thời lượng khám không hợp lệ';
    return '';
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const response = await apiForm('/uploads/package-image', formData);
      const url = getUploadUrl(response);
      if (!url) throw new Error('Không nhận được URL ảnh sau khi upload');
      updateForm('imageUrl', url);
      toast.success('Tải ảnh gói khám thành công');
    } catch (error) {
      toast.error(error.message || 'Không tải được ảnh gói khám');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function submit(event) {
    event.preventDefault();
    const message = validateForm();
    if (message) {
      toast.warning(message);
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        targetPatients: textToList(form.targetPatients),
        includes: textToList(form.includes),
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        doctorId: form.doctorId || null
      };
      await api(editing ? `/admin/service-packages/${editing._id}` : '/admin/service-packages', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body)
      });
      toast.success(editing ? 'Đã cập nhật gói khám' : 'Đã tạo gói khám');
      setModalOpen(false);
      await loadPackages();
    } catch (error) {
      toast.error(error.message || 'Không lưu được gói khám');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item) {
    try {
      await api(`/admin/service-packages/${item._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !item.isActive })
      });
      toast.success('Đã cập nhật trạng thái gói khám');
      await loadPackages();
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được trạng thái');
    }
  }

  async function removePackage(item) {
    if (!window.confirm(`Xóa gói khám "${item.name}"?`)) return;
    try {
      await api(`/admin/service-packages/${item._id}`, { method: 'DELETE' });
      toast.success('Đã xóa gói khám');
      await loadPackages();
    } catch (error) {
      toast.error(error.message || 'Không xóa được gói khám');
    }
  }

  return (
    <div className="admin-page service-packages-page">
      <div className="admin-page-heading d-flex justify-content-between align-items-start gap-3">
        <div>
          <span className="eyebrow">Quản lý dịch vụ</span>
          <h1>Gói khám</h1>
          <p>Thiết lập gói khám theo cơ sở, chuyên khoa và bác sĩ nếu cần.</p>
        </div>
        <button className="btn btn-primary rounded-pill px-4" type="button" onClick={openCreate}>Thêm gói khám</button>
      </div>

      <section className="service-package-filter-card">
        <input className="form-control" placeholder="Tìm tên hoặc mã gói khám" value={filters.keyword} onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))} />
        <select className="form-select" value={filters.clinicId} onChange={(event) => setFilters((current) => ({ ...current, clinicId: event.target.value, specialtyId: '' }))}>
          <option value="">Tất cả cơ sở</option>
          {clinics.map((clinic) => <option key={clinic._id} value={clinic._id}>{clinic.name}</option>)}
        </select>
        <select className="form-select" value={filters.specialtyId} onChange={(event) => setFilters((current) => ({ ...current, specialtyId: event.target.value }))}>
          <option value="">Tất cả chuyên khoa</option>
          {specialties.filter((item) => !filters.clinicId || (item.clinicId?._id || item.clinicId) === filters.clinicId).map((specialty) => (
            <option key={specialty._id} value={specialty._id}>{specialty.name}</option>
          ))}
        </select>
        <select className="form-select" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang áp dụng</option>
          <option value="inactive">Tạm khóa</option>
        </select>
      </section>

      <section className="admin-table-card service-package-table-card">
        {visiblePackages.length ? (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên gói</th>
                  <th>Phạm vi</th>
                  <th>Giá</th>
                  <th>Thời lượng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePackages.map((item) => (
                  <tr key={item._id}>
                    <td><strong>{item.code}</strong></td>
                    <td>
                      <div className="service-package-admin-name-cell">
                        <img
                          src={resolveMediaUrl(item.imageUrl, '/packages-family-banner.webp')}
                          alt={item.name}
                          onError={(event) => useImageFallback(event, '/packages-family-banner.webp')}
                        />
                        <div>
                          <strong>{item.name}</strong>
                          <p className="text-secondary mb-0 small">{item.description || 'Không có mô tả'}</p>
                          {(item.targetPatients?.length > 0 || item.includes?.length > 0) && (
                            <div className="service-package-admin-preview">
                              {item.targetPatients?.slice(0, 2).map((text) => <small key={`target-${text}`}>{text}</small>)}
                              {item.includes?.slice(0, 2).map((text) => <small key={`include-${text}`}>✓ {text}</small>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{getName(item.clinicId, 'Cơ sở')}</div>
                      <small className="text-secondary">{getName(item.specialtyId, 'Chuyên khoa')} · {getName(item.doctorId)}</small>
                    </td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{item.durationMinutes} phút</td>
                    <td><span className={`admin-status-badge ${item.isActive ? 'success' : 'muted'}`}>{item.isActive ? 'Đang áp dụng' : 'Tạm khóa'}</span></td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEdit(item)}>Sửa</button>
                        <button className="btn btn-sm btn-outline-warning" type="button" onClick={() => toggleStatus(item)}>{item.isActive ? 'Tạm khóa' : 'Kích hoạt'}</button>
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removePackage(item)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="Chưa có gói khám" description="Tạo gói khám để bệnh nhân chọn khi đặt lịch." />
        )}
      </section>

      {modalOpen && (
        <BaseModal ariaLabel={editing ? 'Cập nhật gói khám' : 'Thêm gói khám'} className="admin-modal service-package-modal" disableClose={saving || uploading} onClose={() => !saving && !uploading && setModalOpen(false)} size="lg">
          <form onSubmit={submit}>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <span className="eyebrow">Gói khám</span>
                <h2 className="h4 mt-2 mb-1">{editing ? 'Cập nhật gói khám' : 'Thêm gói khám'}</h2>
                <p className="text-secondary mb-0">Thiết lập giá, thời lượng và phạm vi áp dụng.</p>
              </div>
              <button className="btn btn-sm btn-outline-secondary" disabled={saving || uploading} type="button" onClick={() => setModalOpen(false)}>Đóng</button>
            </div>

            <div className="admin-modal-body service-package-modal-body">
              <div className="service-package-section-stack">
                <section className="service-package-form-section">
                  <div className="service-package-form-section-title service-package-form-section-title-primary">
                  <span>01</span>
                  <div>
                    <h3>Thông tin gói khám</h3>
                    <p>Thiết lập phạm vi áp dụng, giá và thời lượng tư vấn.</p>
                  </div>
                  </div>
                  <div className="service-package-form-grid service-package-form-grid-basic">
                    <div className="col-md-8">
                  <label className="form-label">Tên gói khám</label>
                  <input className="form-control" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Ví dụ: Khám tổng quát Nhi khoa" />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={String(form.isActive)} onChange={(event) => updateForm('isActive', event.target.value === 'true')}>
                    <option value="true">Đang áp dụng</option>
                    <option value="false">Tạm khóa</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Cơ sở</label>
                  <select className="form-select" value={form.clinicId} onChange={(event) => updateForm('clinicId', event.target.value)}>
                    <option value="">Chọn cơ sở</option>
                    {clinics.map((clinic) => <option key={clinic._id} value={clinic._id}>{clinic.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Chuyên khoa</label>
                  <select className="form-select" value={form.specialtyId} disabled={!form.clinicId} onChange={(event) => updateForm('specialtyId', event.target.value)}>
                    <option value="">Chọn chuyên khoa</option>
                    {filteredSpecialties.map((specialty) => <option key={specialty._id} value={specialty._id}>{specialty.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Bác sĩ áp dụng riêng</label>
                  <select className="form-select" value={form.doctorId} disabled={!form.specialtyId} onChange={(event) => updateForm('doctorId', event.target.value)}>
                    <option value="">Gói chung cho chuyên khoa</option>
                    {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Giá</label>
                  <input className="form-control" min="0" type="number" value={form.price} onChange={(event) => updateForm('price', event.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Thời lượng</label>
                  <input className="form-control" min="1" type="number" value={form.durationMinutes} onChange={(event) => updateForm('durationMinutes', event.target.value)} />
                </div>
                  </div>
                </section>
                <section className="service-package-form-section">
                  <div className="service-package-form-section-title service-package-form-section-title-content">
                  <span>02</span>
                  <div>
                    <h3>Nội dung hiển thị</h3>
                    <p>Mô tả quyền lợi và nhóm bệnh nhân phù hợp với gói khám.</p>
                  </div>
                  </div>
                  <div className="service-package-form-grid service-package-form-grid-content">
                    <div className="col-12">
                  <label className="form-label">Mô tả</label>
                  <textarea className="form-control" rows="4" value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Mô tả ngắn về quyền lợi hoặc nội dung gói khám" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phù hợp với ai</label>
                  <textarea className="form-control" rows="4" value={form.targetPatients} onChange={(event) => updateForm('targetPatients', event.target.value)} placeholder="Mỗi dòng một nhóm bệnh nhân phù hợp" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Quyền lợi / bao gồm</label>
                  <textarea className="form-control" rows="4" value={form.includes} onChange={(event) => updateForm('includes', event.target.value)} placeholder="Mỗi dòng một quyền lợi hoặc nội dung gói" />
                </div>
                <div className="col-12 service-package-image-field">
                  <label className="form-label">Ảnh gói khám</label>
                  <div className="service-package-image-uploader">
                    <img
                      src={resolveMediaUrl(form.imageUrl, '/packages-family-banner.webp')}
                      alt="Preview gói khám"
                      onError={(event) => useImageFallback(event, '/packages-family-banner.webp')}
                    />
                    <div>
                      <label className={`service-package-upload-btn ${uploading ? 'disabled' : ''}`}>
                        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadImage} />
                        {uploading ? 'Đang tải ảnh...' : 'Tải ảnh gói khám'}
                      </label>
                      <input
                        className="form-control"
                        value={form.imageUrl}
                        onChange={(event) => updateForm('imageUrl', event.target.value)}
                        placeholder="Hoặc dán URL ảnh: https://..."
                      />
                      <small>Ưu tiên ảnh ngang 16:9, rõ nét, dung lượng dưới 2MB.</small>
                    </div>
                  </div>
                </div>
                <div className="col-12 service-package-preview-field">
                  <div className="service-package-preview-card">
                    <span>Preview</span>
                    <strong>{form.name || 'Tên gói khám'}</strong>
                    <em>{form.price !== '' ? formatCurrency(form.price) : 'Giá gói'} · {form.durationMinutes || 30} phút</em>
                    <p>{form.description || 'Mô tả ngắn gọn về gói khám sẽ hiển thị tại đây.'}</p>
                    <div>
                      {textToList(form.includes).slice(0, 4).map((item) => <small key={item}>✓ {item}</small>)}
                    </div>
                  </div>
                </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 admin-modal-footer">
              <button className="btn btn-outline-secondary rounded-pill px-4" disabled={saving || uploading} type="button" onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary rounded-pill px-4" disabled={saving || uploading} type="submit">{saving ? 'Đang lưu...' : 'Lưu gói khám'}</button>
            </div>
          </form>
        </BaseModal>
      )}
    </div>
  );
}
