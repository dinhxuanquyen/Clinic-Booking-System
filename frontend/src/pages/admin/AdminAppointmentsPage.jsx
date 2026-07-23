import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import AppointmentDetailModal from '../../components/AppointmentDetailModal.jsx';
import BaseModal from '../../components/BaseModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AdminEmptyState, AdminPagination, getName, paginate } from './adminUtils.jsx';
import { downloadPdf } from '../../utils/downloadFile.js';
import { downloadMedicalRecordPdf } from '../../utils/medicalRecordPdf.js';
import { getStatusBadge } from '../../utils/status.js';
import { getVietnamToday } from '../../utils/dateTime.js';

const statuses = ['pending', 'confirmed', 'in_progress', 'cancel_requested', 'reschedule_requested', 'completed', 'cancelled', 'no_show'];

function todayString() {
  return getVietnamToday();
}

function normalizeFiltersFromSearch(searchParams) {
  const rawDate = searchParams.get('date') || '';
  const status = searchParams.get('status') || '';

  return {
    date: rawDate === 'today' ? todayString() : rawDate,
    doctorId: searchParams.get('doctorId') || '',
    status: statuses.includes(status) ? status : ''
  };
}

function buildQueryString(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString() ? `?${params.toString()}` : '';
}

export default function AdminAppointmentsPage() {
  const toast = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryOpenedRef = useRef('');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [filters, setFilters] = useState({ date: '', doctorId: '', status: '' });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [handlingCancel, setHandlingCancel] = useState(null);
  const [handlingReschedule, setHandlingReschedule] = useState(null);
  const [downloadingPdfKey, setDownloadingPdfKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { currentPage: safePage, pageItems, totalPages } = useMemo(() => paginate(appointments, currentPage), [appointments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.date, filters.doctorId, filters.status]);

  function load(nextFilters = filters) {
    setLoading(true);
    setLoadError('');
    Promise.all([api('/doctors'), api(`/appointments${buildQueryString(nextFilters)}`)])
      .then(([doctorPayload, appointmentPayload]) => {
        setDoctors(doctorPayload.data || []);
        setAppointments(appointmentPayload.data || []);
      })
      .catch((err) => {
        setLoadError(err.message);
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const nextFilters = normalizeFiltersFromSearch(searchParams);
    setFilters(nextFilters);
    load(nextFilters);
  }, [location.search]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (filters.date) params.set('date', filters.date);
    if (filters.doctorId) params.set('doctorId', filters.doctorId);
    if (filters.status) params.set('status', filters.status);

    if (params.toString() === searchParams.toString()) {
      load(filters);
      return;
    }

    setSearchParams(params);
  }

  function resetFilters() {
    setFilters({ date: '', doctorId: '', status: '' });
    setSearchParams({});
  }

  useEffect(() => {
    const appointmentId = new URLSearchParams(location.search).get('appointmentId');
    if (!appointmentId || queryOpenedRef.current === appointmentId || !appointments.length) return;
    const appointment = appointments.find((item) => item._id === appointmentId);
    if (appointment) {
      queryOpenedRef.current = appointmentId;
      setSelectedAppointment(appointment);
    }
  }, [appointments, location.search]);

  async function updateStatus(id, status, adminNote = '', actionContext = '') {
    const wasHandlingCancelRequest = Boolean(handlingCancel);
    const wasHandlingRescheduleRequest = Boolean(handlingReschedule);
    const isCancelRequestAction = actionContext === 'cancel_request' || wasHandlingCancelRequest;
    const isRescheduleRequestAction = actionContext === 'reschedule_request' || wasHandlingRescheduleRequest;
    try {
      await api(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote })
      });
      if (status === 'cancelled' && isCancelRequestAction) {
        toast.success('Đã xác nhận hủy lịch');
      } else if (status === 'confirmed' && isRescheduleRequestAction) {
        toast.success('Đã xác nhận đổi lịch');
      } else if (status === 'reschedule_rejected') {
        toast.success('Đã từ chối yêu cầu đổi lịch');
      } else if (status === 'confirmed' && isCancelRequestAction) {
        toast.success('Đã từ chối yêu cầu hủy');
      } else {
        toast.success('Cập nhật trạng thái thành công');
      }
      setHandlingCancel(null);
      setHandlingReschedule(null);
      load();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }

  function updateStatusFromModal(appointment, status, adminNote = '', actionContext = '') {
    return updateStatus(appointment._id, status, adminNote, actionContext);
  }

  async function downloadAppointmentPdf(appointment, type) {
    if (!appointment?._id) return;
    const key = `${appointment._id}:${type}`;
    if (downloadingPdfKey) return;

    setDownloadingPdfKey(key);
    try {
      if (type === 'appointment') {
        await downloadPdf(`/appointments/${appointment._id}/pdf`);
      } else if (type === 'queue') {
        await downloadPdf(`/appointments/${appointment._id}/queue-ticket/pdf`);
      } else if (type === 'record') {
        const payload = await api(`/appointments/${appointment._id}/medical-record`);
        await downloadMedicalRecordPdf(payload.data._id);
      }
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    } finally {
      setDownloadingPdfKey('');
    }
  }

  return (
    <div className="admin-appointments-page">
      <div className="page-heading admin-page-heading admin-appointments-heading">
        <span className="eyebrow">Quản lý</span>
        <h1 className="h3 mt-2 mb-0">Lịch hẹn</h1>
      </div>

      <div className="management-panel admin-table-card mb-3 admin-appointments-card">
        <div className="admin-table-toolbar admin-appointments-filter-panel">
          <input type="date" className="form-control" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
          <select className="form-select" value={filters.doctorId} onChange={(event) => setFilters({ ...filters, doctorId: event.target.value })}>
            <option value="">Tất cả bác sĩ</option>
            {doctors.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
          <select className="form-select" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Tất cả trạng thái</option>
            {statuses.map((status) => <option key={status} value={status}>{getStatusBadge(status).label}</option>)}
          </select>
          <button className="btn btn-primary" type="button" onClick={applyFilters}>Lọc</button>
          <button className="btn btn-outline-secondary" type="button" onClick={resetFilters}>Xem tất cả</button>
        </div>

        {!loading && !loadError && (
          <div className="admin-appointments-result-bar">
            <strong>{appointments.length}</strong>
            <span>lịch hẹn phù hợp</span>
            {(filters.date || filters.doctorId || filters.status) && <em>Đang áp dụng bộ lọc</em>}
          </div>
        )}

        {loadError && (
          <div className="alert alert-danger admin-appointments-alert" role="alert">{loadError}</div>
        )}

        {loading ? (
          <div className="admin-appointments-loading" aria-live="polite">
            {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
          </div>
        ) : appointments.length ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table admin-appointments-table">
                <thead><tr><th>Ngày</th><th>Giờ</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Cơ sở</th><th>Trạng thái</th><th>Cập nhật</th><th></th></tr></thead>
                <tbody>
                  {pageItems.map((item) => {
                    const badge = getStatusBadge(item.status);
                    return (
                      <tr key={item._id}>
                        <td><strong>{item.date}</strong></td>
                        <td><span className="admin-appointments-time-chip">{item.timeSlot}</span></td>
                        <td className="admin-appointments-name-cell">{getName(item.patientId)}</td>
                        <td className="admin-appointments-name-cell">{getName(item.doctorId)}</td>
                        <td className="admin-appointments-name-cell">{getName(item.clinicId)}</td>
                        <td><span className={`badge ${badge.className} admin-appointments-status-badge`}>{badge.label}</span></td>
                        <td>
                          {item.status === 'cancel_requested' ? (
                            <div className="admin-appointments-request-actions danger">
                              <button className="btn btn-sm btn-danger" type="button" onClick={() => setHandlingCancel({ appointment: item, status: 'cancelled' })}>
                                Xác nhận hủy
                              </button>
                              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setHandlingCancel({ appointment: item, status: 'confirmed' })}>
                                Từ chối hủy
                              </button>
                            </div>
                          ) : item.status === 'reschedule_requested' ? (
                            <div className="admin-appointments-request-actions">
                              <button className="btn btn-sm btn-primary" type="button" onClick={() => setHandlingReschedule({ appointment: item, status: 'confirmed' })}>
                                Xác nhận đổi lịch
                              </button>
                              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => setHandlingReschedule({ appointment: item, status: 'reschedule_rejected' })}>
                                Từ chối đổi lịch
                              </button>
                            </div>
                          ) : (
                            <label className="admin-appointments-status-control">
                              <span>Cập nhật</span>
                              <select className="form-select form-select-sm" value={item.status} onChange={(event) => updateStatus(item._id, event.target.value)}>
                                {statuses.map((status) => <option key={status} value={status}>{getStatusBadge(status).label}</option>)}
                              </select>
                            </label>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="admin-appointments-utility-actions">
                            <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => setSelectedAppointment(item)}>
                              Chi tiết
                            </button>
                            <button className="btn btn-outline-primary btn-sm" disabled={downloadingPdfKey === `${item._id}:appointment`} type="button" onClick={() => downloadAppointmentPdf(item, 'appointment')}>
                              Phiếu đặt lịch
                            </button>
                            {['confirmed', 'in_progress', 'completed'].includes(item.status) && (
                              <button className="btn btn-outline-primary btn-sm" disabled={downloadingPdfKey === `${item._id}:queue`} type="button" onClick={() => downloadAppointmentPdf(item, 'queue')}>
                                Phiếu khám
                              </button>
                            )}
                            {item.status === 'completed' && (
                              <button className="btn btn-outline-success btn-sm" disabled={downloadingPdfKey === `${item._id}:record`} type="button" onClick={() => downloadAppointmentPdf(item, 'record')}>
                                Kết quả khám
                              </button>
                            )}
                          </div>
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
          <AdminEmptyState message="Không có lịch hẹn phù hợp" />
        )}
      </div>

      <AppointmentDetailModal
        appointment={selectedAppointment}
        onAfterAction={() => setSelectedAppointment(null)}
        onClose={() => setSelectedAppointment(null)}
        onUpdateStatus={updateStatusFromModal}
        role="admin"
      />
      {handlingCancel && (
        <CancelHandleModal
          actionStatus={handlingCancel.status}
          appointment={handlingCancel.appointment}
          onClose={() => setHandlingCancel(null)}
          onSubmit={(adminNote) => updateStatus(handlingCancel.appointment._id, handlingCancel.status, adminNote, 'cancel_request')}
        />
      )}
      {handlingReschedule && (
        <RescheduleHandleModal
          actionStatus={handlingReschedule.status}
          appointment={handlingReschedule.appointment}
          onClose={() => setHandlingReschedule(null)}
          onSubmit={(adminNote) => updateStatus(handlingReschedule.appointment._id, handlingReschedule.status, adminNote, 'reschedule_request')}
        />
      )}
    </div>
  );
}

function CancelHandleModal({ actionStatus, appointment, onClose, onSubmit }) {
  const [adminNote, setAdminNote] = useState('');
  const isApprove = actionStatus === 'cancelled';

  return (
    <BaseModal ariaLabel={isApprove ? 'Xác nhận hủy lịch' : 'Từ chối yêu cầu hủy'} className="admin-modal" onClose={onClose}>
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Xử lý yêu cầu hủy</span>
          <h2 className="h5 mt-2 mb-0">{isApprove ? 'Xác nhận hủy lịch' : 'Từ chối yêu cầu hủy'}</h2>
        </div>
        <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onClose}>Đóng</button>
      </div>
      <div className="alert alert-warning">
        <strong>Lý do hủy của bệnh nhân:</strong>
        <div>{appointment.cancelRequest?.reason || 'Không có lý do'}</div>
      </div>
      <label className="form-label">Ghi chú admin</label>
      <textarea className="form-control" rows="4" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} />
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Hủy</button>
        <button className={`btn ${isApprove ? 'btn-danger' : 'btn-primary'}`} type="button" onClick={() => onSubmit(adminNote.trim())}>
          {isApprove ? 'Xác nhận hủy' : 'Từ chối hủy'}
        </button>
      </div>
    </BaseModal>
  );
}

function RescheduleHandleModal({ actionStatus, appointment, onClose, onSubmit }) {
  const [adminNote, setAdminNote] = useState('');
  const isApprove = actionStatus === 'confirmed';
  const request = appointment.rescheduleRequest || {};

  return (
    <BaseModal ariaLabel={isApprove ? 'Xác nhận đổi lịch' : 'Từ chối yêu cầu đổi lịch'} className="admin-modal" onClose={onClose}>
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Xử lý yêu cầu đổi lịch</span>
          <h2 className="h5 mt-2 mb-0">{isApprove ? 'Xác nhận đổi lịch' : 'Từ chối yêu cầu đổi lịch'}</h2>
        </div>
        <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onClose}>Đóng</button>
      </div>
      <div className="appointment-detail-grid mb-3">
        <div><strong>Ngày hiện tại</strong><span>{request.oldDate || appointment.date}</span></div>
        <div><strong>Giờ hiện tại</strong><span>{request.oldTimeSlot || appointment.timeSlot}</span></div>
        <div><strong>Ngày mới</strong><span>{request.newDate || 'Chưa cập nhật'}</span></div>
        <div><strong>Giờ mới</strong><span>{request.newTimeSlot || 'Chưa cập nhật'}</span></div>
        <div className="appointment-detail-full"><strong>Lý do đổi lịch</strong><span>{request.reason || 'Không có lý do'}</span></div>
      </div>
      <label className="form-label">Ghi chú admin</label>
      <textarea className="form-control" rows="4" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} />
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Hủy</button>
        <button className={`btn ${isApprove ? 'btn-primary' : 'btn-danger'}`} type="button" onClick={() => onSubmit(adminNote.trim())}>
          {isApprove ? 'Xác nhận đổi lịch' : 'Từ chối đổi lịch'}
        </button>
      </div>
    </BaseModal>
  );
}
