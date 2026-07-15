import { useEffect, useMemo, useState } from 'react';
import { api, apiForm } from '../../api/client.js';
import BaseModal from '../../components/BaseModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { resolveMediaUrl, useImageFallback } from '../../utils/media.js';
import { AdminAlert, AdminEmptyState, AdminPagination, ConfirmDialog, getId, getName, normalizeText, paginate } from './adminUtils.jsx';

const defaultForm = { name: '', description: '', image: '', clinicId: '' };

function getUploadUrl(response) {
  return response?.data?.url || response?.data?.data?.url || response?.url || '';
}

export default function AdminSpecialtiesPage() {
  const toast = useToast();
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', clinicId: '' });
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSpecialties = useMemo(() => {
    const keyword = normalizeText(filters.search);
    return specialties.filter((item) => {
      const matchesSearch = !keyword || normalizeText(item.name).includes(keyword);
      const matchesClinic = !filters.clinicId || getId(item.clinicId) === filters.clinicId;
      return matchesSearch && matchesClinic;
    });
  }, [filters, specialties]);

  const { currentPage: safePage, pageItems, totalPages } = useMemo(
    () => paginate(filteredSpecialties, currentPage),
    [currentPage, filteredSpecialties]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.clinicId]);

  function load() {
    Promise.all([api('/clinics'), api('/specialties')])
      .then(([clinicPayload, specialtyPayload]) => {
        setClinics(clinicPayload.data || []);
        setSpecialties(specialtyPayload.data || []);
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
    setForm({ ...defaultForm, clinicId: clinics[0]?._id || '' });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setError('');
    setForm({
      name: item.name || '',
      description: item.description || '',
      image: item.image || '',
      clinicId: getId(item.clinicId)
    });
    setModalOpen(true);
  }

  function validateForm() {
    if (!form.clinicId) return 'Vui lòng chọn cơ sở';
    if (!form.name.trim()) return 'Vui lòng nhập tên chuyên khoa';
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
      const response = await apiForm('/uploads/specialty-image', formData);
      const url = getUploadUrl(response);
      if (!url) throw new Error('Không nhận được URL ảnh sau khi upload');
      setForm((current) => ({ ...current, image: url }));
      toast.success('Tải ảnh chuyên khoa thành công');
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
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      toast.warning(validationMessage);
      return;
    }

    setError('');
    setSaving(true);
    try {
      await api(editing ? `/specialties/${editing._id}` : '/specialties', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          description: form.description.trim()
        })
      });
      toast.success(editing ? 'Cập nhật chuyên khoa thành công' : 'Thêm chuyên khoa thành công');
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
      await api(`/specialties/${deleting._id}`, { method: 'DELETE' });
      toast.success('Xóa chuyên khoa thành công');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center page-heading admin-page-heading admin-specialties-page-heading">
        <div>
          <span className="eyebrow">Quản lý</span>
          <h1 className="h3 mt-2 mb-0">Chuyên khoa</h1>
          <p className="admin-page-subtitle mb-0">Quản lý chuyên khoa, ảnh minh họa và cơ sở áp dụng trong hệ thống.</p>
        </div>
        <button className="btn btn-primary admin-gradient-btn" onClick={openCreate}>Thêm chuyên khoa</button>
      </div>

      <div className="admin-specialties-summary">
        <div className="admin-specialty-summary-card">
          <span>Tổng chuyên khoa</span>
          <strong>{specialties.length}</strong>
        </div>
        <div className="admin-specialty-summary-card">
          <span>Đang hiển thị</span>
          <strong>{filteredSpecialties.length}</strong>
        </div>
        <div className="admin-specialty-summary-card">
          <span>Cơ sở hỗ trợ</span>
          <strong>{clinics.length}</strong>
        </div>
      </div>

      <div className="management-panel admin-table-card admin-specialties-table-card">
        <div className="admin-table-toolbar admin-specialties-toolbar">
          <input
            className="form-control"
            placeholder="Tìm theo tên chuyên khoa..."
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
          <select
            className="form-select"
            value={filters.clinicId}
            onChange={(event) => setFilters({ ...filters, clinicId: event.target.value })}
          >
            <option value="">Tất cả cơ sở</option>
            {clinics.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </div>

        {filteredSpecialties.length ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table admin-specialties-table">
                <thead>
                  <tr>
                    <th>Chuyên khoa</th>
                    <th>Cơ sở</th>
                    <th>Mô tả</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="admin-specialty-name-cell">
                          <img
                            src={resolveMediaUrl(item.image, '/placeholder-specialty.svg')}
                            alt={item.name || 'Chuyên khoa'}
                            onError={(event) => useImageFallback(event, '/placeholder-specialty.svg')}
                          />
                          <div>
                            <strong>{item.name}</strong>
                            <span>{item.image ? 'Đã có ảnh minh họa' : 'Chưa có ảnh minh họa'}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="admin-specialty-clinic-pill">{getName(item.clinicId)}</span></td>
                      <td className="text-secondary admin-specialty-description-cell">{item.description || 'Chưa có mô tả chuyên khoa.'}</td>
                      <td className="text-end">
                        <div className="admin-specialty-action-group">
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
          <AdminEmptyState message="Không có chuyên khoa phù hợp" />
        )}
      </div>

      {modalOpen && (
        <BaseModal className="admin-modal admin-specialty-modal" disableClose={saving || uploading} onClose={() => setModalOpen(false)} size="lg">
          <div className="admin-specialty-modal-header">
            <div>
              <span className="eyebrow">QUẢN LÝ CHUYÊN KHOA</span>
              <h2>{editing ? 'Cập nhật chuyên khoa' : 'Thêm chuyên khoa'}</h2>
              <p>{editing ? 'Điều chỉnh thông tin hiển thị của chuyên khoa.' : 'Tạo chuyên khoa mới để bệnh nhân dễ tìm đúng dịch vụ cần khám.'}</p>
            </div>
            <button className="btn btn-sm btn-outline-secondary" disabled={saving || uploading} type="button" onClick={() => setModalOpen(false)}>
              Đóng
            </button>
          </div>

          <form className="admin-specialty-form" onSubmit={submit}>
            <div className="admin-specialty-modal-body">
              <AdminAlert message={error} type="danger" />

              <section className="admin-specialty-form-section">
                <div className="admin-specialty-section-heading">
                  <span>01</span>
                  <div>
                    <h3>Thông tin chuyên khoa</h3>
                    <p>Nhập tên chuyên khoa và cơ sở đang cung cấp dịch vụ này.</p>
                  </div>
                </div>
                <div className="admin-specialty-form-grid">
                  <label>
                    <span>Cơ sở</span>
                    <select className="form-select" value={form.clinicId} onChange={(event) => setForm({ ...form, clinicId: event.target.value })}>
                      <option value="">Chọn cơ sở</option>
                      {clinics.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Tên chuyên khoa</span>
                    <input className="form-control" placeholder="Ví dụ: Tim mạch, Nhi khoa, Da liễu..." value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  </label>
                </div>
              </section>

              <section className="admin-specialty-form-section admin-specialty-image-section">
                <div>
                  <div className="admin-specialty-section-heading">
                    <span>02</span>
                    <div>
                      <h3>Ảnh chuyên khoa</h3>
                      <p>Ưu tiên ảnh ngang, rõ nét, thể hiện đúng dịch vụ y tế.</p>
                    </div>
                  </div>
                  <ul className="admin-specialty-helper-list">
                    <li>Tỷ lệ gợi ý 16:9 hoặc 4:3.</li>
                    <li>Dung lượng nên dưới 2MB để tải trang nhanh.</li>
                  </ul>
                </div>
                <div className="admin-specialty-image-card">
                  <img
                    src={resolveMediaUrl(form.image, '/placeholder-specialty.svg')}
                    alt="Preview chuyên khoa"
                    onError={(event) => useImageFallback(event, '/placeholder-specialty.svg')}
                  />
                  <label className={`admin-specialty-upload-btn ${uploading ? 'disabled' : ''}`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadImage} />
                    {uploading ? 'Đang tải ảnh...' : 'Tải ảnh chuyên khoa'}
                  </label>
                </div>
              </section>

              <section className="admin-specialty-form-section">
                <div className="admin-specialty-section-heading">
                  <span>03</span>
                  <div>
                    <h3>Mô tả</h3>
                    <p>Mô tả ngắn gọn giúp bệnh nhân hiểu chuyên khoa phù hợp với vấn đề nào.</p>
                  </div>
                </div>
                <label className="admin-specialty-textarea">
                  <span>Mô tả chuyên khoa</span>
                  <textarea
                    className="form-control"
                    placeholder="Ví dụ: Khám và tư vấn các vấn đề liên quan đến tim mạch, huyết áp, nhịp tim..."
                    rows="5"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </label>
              </section>
            </div>

            <div className="admin-specialty-modal-footer">
              <button className="btn btn-outline-secondary" disabled={saving || uploading} type="button" onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn admin-gradient-btn" disabled={saving || uploading} type="submit">{saving ? 'Đang lưu...' : editing ? 'Cập nhật chuyên khoa' : 'Lưu chuyên khoa'}</button>
            </div>
          </form>
        </BaseModal>
      )}

      {deleting && (
        <ConfirmDialog title="Xóa chuyên khoa" message={`Xóa chuyên khoa ${deleting.name}?`} onCancel={() => setDeleting(null)} onConfirm={remove} />
      )}
    </>
  );
}
