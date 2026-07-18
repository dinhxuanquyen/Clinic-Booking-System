import BaseModal from '../../components/BaseModal.jsx';

export { getStatusBadge } from '../../utils/status.js';

export const emptyWorkingHours = { start: '08:00', end: '17:00' };

export const adminPageSize = 10;

export function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export function paginate(items, page, pageSize = adminPageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    pageItems: items.slice(start, start + pageSize)
  };
}

export function AdminPagination({ currentPage, onPageChange, totalPages }) {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <button className="btn btn-outline-primary btn-sm" disabled={currentPage === 1} type="button" onClick={() => onPageChange(currentPage - 1)}>
        Trước
      </button>
      <span>Trang {currentPage} / {totalPages}</span>
      <button className="btn btn-outline-primary btn-sm" disabled={currentPage === totalPages} type="button" onClick={() => onPageChange(currentPage + 1)}>
        Sau
      </button>
    </div>
  );
}

export function AdminEmptyState({ message = 'Không có dữ liệu' }) {
  return (
    <div className="admin-empty-state">
      <span aria-hidden="true">∅</span>
      <p>{message}</p>
    </div>
  );
}

export function getId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id : value;
}

export function getName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

export function Modal({ title, children, onClose, onSubmit, submitText = 'Lưu' }) {
  return (
    <BaseModal ariaLabel={title} className="admin-modal" onClose={onClose}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0">{title}</h2>
        <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>
          Đóng
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="admin-modal-body">
          {children}
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3 admin-modal-footer">
          <button className="btn btn-outline-secondary" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" type="submit">
            {submitText}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

export function AdminAlert({ message, type = 'success' }) {
  if (!message) return null;
  return <div className={`alert alert-${type}`}>{message}</div>;
}

export function ConfirmDialog({ title = 'Xác nhận', message, confirmText = 'Xóa', cancelText = 'Hủy', onConfirm, onCancel }) {
  return (
    <BaseModal ariaLabel={title} className="admin-confirm-dialog" onClose={onCancel} size="sm">
      <h2 className="h5 mb-2">{title}</h2>
      <p className="text-secondary mb-4">{message}</p>
      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>
          {cancelText}
        </button>
        <button className="btn btn-danger" type="button" onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </BaseModal>
  );
}
