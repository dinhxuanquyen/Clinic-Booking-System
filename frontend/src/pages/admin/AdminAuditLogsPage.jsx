import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import BaseModal from '../../components/BaseModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cleanDisplayObject, cleanDisplayText } from '../../utils/textEncoding.js';
import { AdminPagination } from './adminUtils.jsx';

const limit = 10;

const roleOptions = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'doctor', label: 'Bác sĩ' },
  { value: 'patient', label: 'Bệnh nhân' }
];

const actionOptions = [
  '',
  'CREATE_CLINIC', 'UPDATE_CLINIC', 'DELETE_CLINIC',
  'CREATE_DOCTOR', 'UPDATE_DOCTOR', 'DELETE_DOCTOR',
  'CREATE_DOCTOR_ACCOUNT', 'RESET_DOCTOR_PASSWORD',
  'LOCK_DOCTOR_ACCOUNT', 'UNLOCK_DOCTOR_ACCOUNT',
  'CREATE_SPECIALTY', 'UPDATE_SPECIALTY', 'DELETE_SPECIALTY',
  'CREATE_APPOINTMENT', 'CONFIRM_APPOINTMENT', 'CANCEL_APPOINTMENT', 'RESCHEDULE_APPOINTMENT', 'AUTO_MARK_NO_SHOW',
  'CREATE_SCHEDULE_EXCEPTION', 'UPDATE_SCHEDULE_EXCEPTION', 'DELETE_SCHEDULE_EXCEPTION',
  'UPDATE_SCHEDULE_TEMPLATE',
  'LOGIN_SUCCESS', 'LOGIN_FAILED'
];

const entityOptions = ['', 'Clinic', 'Specialty', 'Doctor', 'Appointment', 'ScheduleTemplate', 'ScheduleException', 'User'];

const initialFilters = { keyword: '', actorRole: '', action: '', entityType: '', startDate: '', endDate: '' };

const actionLabels = {
  CREATE_CLINIC: 'Tạo cơ sở',
  UPDATE_CLINIC: 'Cập nhật cơ sở',
  DELETE_CLINIC: 'Xóa cơ sở',
  CREATE_DOCTOR: 'Tạo bác sĩ',
  UPDATE_DOCTOR: 'Cập nhật bác sĩ',
  DELETE_DOCTOR: 'Xóa bác sĩ',
  CREATE_DOCTOR_ACCOUNT: 'Cấp tài khoản bác sĩ',
  RESET_DOCTOR_PASSWORD: 'Cấp lại mật khẩu bác sĩ',
  LOCK_DOCTOR_ACCOUNT: 'Khóa tài khoản bác sĩ',
  UNLOCK_DOCTOR_ACCOUNT: 'Mở khóa tài khoản bác sĩ',
  CREATE_SPECIALTY: 'Tạo chuyên khoa',
  UPDATE_SPECIALTY: 'Cập nhật chuyên khoa',
  DELETE_SPECIALTY: 'Xóa chuyên khoa',
  CREATE_APPOINTMENT: 'Tạo lịch hẹn',
  CREATE_APPOINTMENT_WITH_SERVICE: 'Tạo lịch hẹn có gói khám',
  CONFIRM_APPOINTMENT: 'Xác nhận lịch hẹn',
  START_APPOINTMENT: 'Bắt đầu khám',
  COMPLETE_APPOINTMENT: 'Hoàn thành lịch khám',
  CANCEL_APPOINTMENT: 'Hủy lịch hẹn',
  RESCHEDULE_APPOINTMENT: 'Đổi lịch hẹn',
  CREATE_MEDICAL_RECORD: 'Tạo hồ sơ khám bệnh',
  UPDATE_MEDICAL_RECORD: 'Cập nhật hồ sơ khám bệnh',
  CREATE_SCHEDULE_EXCEPTION: 'Tạo ngoại lệ lịch',
  UPDATE_SCHEDULE_EXCEPTION: 'Cập nhật ngoại lệ lịch',
  DELETE_SCHEDULE_EXCEPTION: 'Xóa ngoại lệ lịch',
  UPDATE_SCHEDULE_TEMPLATE: 'Cập nhật lịch làm việc',
  EXPORT_APPOINTMENT_PDF: 'Xuất PDF phiếu đặt lịch',
  EXPORT_QUEUE_TICKET_PDF: 'Xuất PDF phiếu khám',
  EXPORT_MEDICAL_RECORD_PDF: 'Xuất PDF hồ sơ khám bệnh',
  CHANGE_PASSWORD: 'Đổi mật khẩu',
  LOGIN_SUCCESS: 'Đăng nhập hệ thống',
  LOGIN_FAILED: 'Đăng nhập thất bại'
};

const entityLabels = {
  Clinic: 'Cơ sở',
  Specialty: 'Chuyên khoa',
  Doctor: 'Bác sĩ',
  Appointment: 'Lịch hẹn',
  ScheduleTemplate: 'Lịch làm việc',
  ScheduleException: 'Ngoại lệ lịch',
  MedicalRecord: 'Hồ sơ khám bệnh',
  User: 'Tài khoản'
};

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function roleLabel(role) {
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'doctor') return 'Bác sĩ';
  if (role === 'patient') return 'Bệnh nhân';
  return 'Hệ thống';
}

function displayText(value, fallback = '-') {
  return cleanDisplayText(value, fallback);
}

function actionLabel(action) {
  if (action === 'AUTO_MARK_NO_SHOW') return 'Tự động đánh dấu không đến khám';
  return actionLabels[action] || action || '-';
}

function entityLabel(entityType) {
  return entityLabels[entityType] || entityType || '-';
}

function actionTone(action = '') {
  if (action.includes('NO_SHOW')) return 'danger';
  if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('LOCK') || action.includes('FAILED')) return 'danger';
  if (action.includes('UPDATE') || action.includes('RESET') || action.includes('RESCHEDULE')) return 'warning';
  if (action.includes('CREATE') || action.includes('CONFIRM') || action.includes('UNLOCK') || action.includes('SUCCESS')) return 'success';
  return 'neutral';
}

function buildParams(filters, page) {
  const params = { page, limit };
  Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
  return params;
}

export default function AdminAuditLogsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const hasFilters = useMemo(() => Object.values(appliedFilters).some(Boolean), [appliedFilters]);

  function loadLogs(page = pagination.page, nextFilters = appliedFilters) {
    setLoading(true);
    api('/admin/audit-logs', { params: buildParams(nextFilters, page) })
      .then((payload) => {
        setLogs(payload.data?.logs || []);
        setPagination(payload.data?.pagination || { page, limit, total: 0, totalPages: 1 });
      })
      .catch((error) => toast.error(displayText(error.message)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadLogs(1, appliedFilters); }, [appliedFilters]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  function openDetail(log) {
    api(`/admin/audit-logs/${log._id}`)
      .then((payload) => setSelectedLog(payload.data))
      .catch((error) => toast.error(displayText(error.message)));
  }

  return (
    <div>
      {/* ── Page Heading ── */}
      <div className="d-flex justify-content-between align-items-center page-heading admin-page-heading">
        <div>
          <span className="eyebrow">Nhật ký</span>
          <h1 className="h3 mt-2 mb-0">Nhật ký hệ thống</h1>
          <p className="text-secondary mt-2 mb-0">
            Theo dõi các thao tác quan trọng trong hệ thống Clinic Booking.
          </p>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <div className="audit-filter-card">
        <form onSubmit={applyFilters}>
          <div className="audit-filter-grid">
            <div>
              <label className="form-label">Từ khóa</label>
              <input
                className="form-control"
                placeholder="Người thực hiện, mô tả..."
                value={filters.keyword}
                onChange={(event) => updateFilter('keyword', event.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Vai trò</label>
              <select className="form-select" value={filters.actorRole} onChange={(event) => updateFilter('actorRole', event.target.value)}>
                {roleOptions.map((item) => <option key={item.value || 'all-role'} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Hành động</label>
              <select className="form-select" value={filters.action} onChange={(event) => updateFilter('action', event.target.value)}>
                {actionOptions.map((item) => <option key={item || 'all-action'} value={item}>{item ? actionLabel(item) : 'Tất cả hành động'}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Loại đối tượng</label>
              <select className="form-select" value={filters.entityType} onChange={(event) => updateFilter('entityType', event.target.value)}>
                {entityOptions.map((item) => <option key={item || 'all-entity'} value={item}>{item ? entityLabel(item) : 'Tất cả đối tượng'}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Từ ngày</label>
              <input className="form-control" type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} />
            </div>
            <div>
              <label className="form-label">Đến ngày</label>
              <input className="form-control" type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} />
            </div>
            <div className="audit-filter-actions">
              <button className="btn btn-primary" type="submit">Lọc</button>
              <button className="btn btn-secondary" disabled={!hasFilters} type="button" onClick={clearFilters}>Xóa lọc</button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Timeline Results ── */}
      <div className="management-panel admin-table-card">
        <div className="audit-summary-bar">
          <p className="audit-result-count">
            <strong>{pagination.total}</strong> bản ghi nhật ký
            {hasFilters && <span style={{ marginLeft: 6, color: 'var(--color-primary)' }}>• Đang lọc</span>}
          </p>
          <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>
            Trang {pagination.page}/{pagination.totalPages}
          </span>
        </div>

        {loading ? (
          <div className="audit-timeline-list">
            {Array.from({ length: 5 }, (_, i) => (
              <div className="audit-timeline-item" key={i}>
                <div className="audit-timeline-side">
                  <div className="skeleton-line skeleton-circle" style={{ width: 36, height: 36 }} />
                  <div className="audit-timeline-line" />
                </div>
                <div className="audit-timeline-body" style={{ flex: 1 }}>
                  <div className="skeleton-line" style={{ height: 72, borderRadius: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">Chưa có nhật ký phù hợp</h3>
            <p className="empty-state-desc">Thay đổi điều kiện lọc để tìm các bản ghi khác.</p>
          </div>
        ) : (
          <>
            <div className="audit-timeline-list">
              {logs.map((log) => {
                const tone = actionTone(log.action);
                const roleKey = log.actorRole || 'system';
                const dotIcon = tone === 'success' ? '✓' : tone === 'danger' ? '✕' : tone === 'warning' ? '!' : '·';

                return (
                  <div className="audit-timeline-item" key={log._id}>
                    <div className="audit-timeline-side">
                      <div className={`audit-timeline-dot ${tone}`}>{dotIcon}</div>
                      <div className="audit-timeline-line" />
                    </div>
                    <div className="audit-timeline-body">
                      <div
                        className="audit-timeline-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => openDetail(log)}
                        onKeyDown={(e) => e.key === 'Enter' && openDetail(log)}
                      >
                        <div className="audit-timeline-head">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className={`audit-action-tag ${tone}`}>{actionLabel(log.action)}</span>
                            {log.entityType && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600 }}>
                                → {entityLabel(log.entityType)}
                              </span>
                            )}
                          </div>
                          <span className="audit-timeline-time">{formatDateTime(log.createdAt)}</span>
                        </div>

                        <div className="audit-timeline-actor">
                          <span className="audit-actor-name">
                            {displayText(log.actorName || log.entityName, 'Hệ thống')}
                          </span>
                          <span className={`audit-role-pill ${roleKey}`}>{roleLabel(log.actorRole)}</span>
                          {log.ipAddress && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>
                              {log.ipAddress}
                            </span>
                          )}
                        </div>

                        <p className="audit-timeline-desc">
                          {displayText(log.description, 'Không có mô tả')}
                        </p>

                        {log.entityName && (
                          <div className="audit-timeline-entity">
                            <span className="audit-entity-type">{entityLabel(log.entityType)}:</span>
                            <span>{displayText(log.entityName)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <AdminPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => loadLogs(page)}
            />
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedLog && (
        <BaseModal ariaLabel="Chi tiết nhật ký hệ thống" className="admin-modal" onClose={() => setSelectedLog(null)} size="lg">
          <div className="modal-header-ds">
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Chi tiết nhật ký
              </p>
              <h2>Chi tiết nhật ký</h2>
              <p>{formatDateTime(selectedLog.createdAt)}</p>
            </div>
            <button className="modal-close-btn" type="button" onClick={() => setSelectedLog(null)}>✕</button>
          </div>

          <div className="modal-body-ds">
            <div className="audit-detail-grid">
              <div><span>Người thực hiện</span><strong>{displayText(selectedLog.actorName, 'Hệ thống')}</strong></div>
              <div><span>Vai trò</span><strong>{roleLabel(selectedLog.actorRole)}</strong></div>
              <div><span>Hành động</span>
                <span className={`audit-action-tag ${actionTone(selectedLog.action)}`} style={{ display: 'inline-flex' }}>
                  {actionLabel(selectedLog.action)}
                </span>
              </div>
              <div><span>Loại đối tượng</span><strong>{entityLabel(selectedLog.entityType)}</strong></div>
              <div><span>Tên đối tượng</span><strong>{displayText(selectedLog.entityName, '-')}</strong></div>
              <div>
                <span>Địa chỉ IP</span>
                <code style={{ fontSize: '0.85rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
                  {selectedLog.ipAddress || '-'}
                </code>
              </div>
              <div className="audit-detail-wide"><span>Mô tả</span><strong>{displayText(selectedLog.description, '-')}</strong></div>
              <div className="audit-detail-wide">
                <span>Trình duyệt/thiết bị</span>
                <small style={{ color: 'var(--gray-500)', wordBreak: 'break-all' }}>{displayText(selectedLog.userAgent, '-')}</small>
              </div>
            </div>

            <div className="audit-metadata-box" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: '0.9rem' }}>Dữ liệu bổ sung</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600 }}>Dạng JSON</span>
              </div>
              <pre style={{ fontSize: '0.82rem', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '14px', overflow: 'auto', maxHeight: 320, margin: 0 }}>
                {JSON.stringify(cleanDisplayObject(selectedLog.metadata || {}), null, 2)}
              </pre>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
