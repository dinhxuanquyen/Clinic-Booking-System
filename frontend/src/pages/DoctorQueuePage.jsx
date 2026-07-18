import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, getSocket } from '../services/socket.js';
import { getToken } from '../utils/auth.js';
import { getConsultationStatusPresentation } from '../utils/status.js';

const consultationToneClassMap = {
  danger: 'bg-danger',
  info: 'bg-primary',
  neutral: 'bg-secondary',
  success: 'bg-success',
  warning: 'bg-warning text-dark'
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function getName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function patientName(appointment) {
  return appointment.patientInfo?.name || appointment.patientId?.name || 'Bệnh nhân';
}

function consultationBadge(status) {
  const presentation = getConsultationStatusPresentation(status || 'waiting');
  return {
    label: presentation.label,
    className: consultationToneClassMap[presentation.tone] || consultationToneClassMap.neutral
  };
}

export default function DoctorQueuePage() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const isAdmin = hasRole('admin');
  const [date, setDate] = useState(todayString());
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const updatingRef = useRef('');

  const summary = useMemo(() => {
    const total = appointments.length;
    const waiting = appointments.filter((item) => (item.consultationStatus || 'waiting') === 'waiting').length;
    const inProgress = appointments.filter((item) => item.consultationStatus === 'in_progress').length;
    const completed = appointments.filter((item) => item.consultationStatus === 'completed' || item.status === 'completed').length;
    const skipped = appointments.filter((item) => item.consultationStatus === 'skipped').length;
    return { total, waiting, inProgress, completed, skipped };
  }, [appointments]);

  async function loadQueue(nextDate = date, nextDoctorId = doctorId) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextDate) params.set('date', nextDate);
      if (isAdmin && nextDoctorId) params.set('doctorId', nextDoctorId);
      const payload = await api(`/doctor/queue/today${params.toString() ? `?${params.toString()}` : ''}`);
      setAppointments(payload.data || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được hàng đợi khám');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    api('/doctors')
      .then((payload) => setDoctors(payload.data || []))
      .catch((error) => toast.error(error.message || 'Không tải được danh sách bác sĩ'));
  }, [isAdmin, toast]);

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    const socket = getSocket() || connectSocket(getToken());
    if (!socket) return undefined;

    function handleQueueUpdated(payload) {
      if (!payload?.appointmentId) return;
      setAppointments((current) => current.map((item) => (
        item._id === payload.appointmentId
          ? {
              ...item,
              consultationStatus: payload.consultationStatus || item.consultationStatus,
              queueNumber: payload.queueNumber || item.queueNumber,
              status: payload.consultationStatus === 'completed' ? 'completed' : item.status
            }
          : item
      )));
    }

    socket.on('queue:updated', handleQueueUpdated);
    return () => socket.off('queue:updated', handleQueueUpdated);
  }, [isAdmin]);

  async function updateConsultationStatus(appointmentId, consultationStatus) {
    if (updatingRef.current === appointmentId) return;
    updatingRef.current = appointmentId;
    setUpdatingId(appointmentId);
    try {
      const payload = await api(`/appointments/${appointmentId}/consultation-status`, {
        method: 'PATCH',
        body: JSON.stringify({ consultationStatus })
      });
      setAppointments((current) => current.map((item) => (item._id === appointmentId ? payload.data : item)));
      toast.success(`Đã cập nhật: ${consultationBadge(consultationStatus).label}`);
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được trạng thái khám');
    } finally {
      if (updatingRef.current === appointmentId) {
        updatingRef.current = '';
      }
      setUpdatingId('');
    }
  }

  function renderActions(item) {
    const status = item.consultationStatus || 'waiting';
    const disabled = updatingId === item._id;

    return (
      <div className="queue-actions">
        {status !== 'in_progress' && status !== 'completed' && (
          <button className="btn btn-sm btn-primary" disabled={disabled} type="button" onClick={() => updateConsultationStatus(item._id, 'in_progress')}>
            Gọi vào khám
          </button>
        )}
        {false && status !== 'completed' && (
          <button className="btn btn-sm btn-success" disabled={disabled} type="button" onClick={() => updateConsultationStatus(item._id, 'completed')}>
            Hoàn thành
          </button>
        )}
        {status === 'in_progress' && (
          <span className="queue-action-hint">Nhập hồ sơ ở Lịch hẹn để hoàn thành</span>
        )}
        {status !== 'completed' && status !== 'skipped' && (
          <button className="btn btn-sm btn-outline-secondary" disabled={disabled} type="button" onClick={() => updateConsultationStatus(item._id, 'skipped')}>
            Bỏ qua
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="doctor-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Queue & Consultation</p>
          <h1 className="doctor-page-title">{isAdmin ? 'Hàng đợi khám' : 'Hàng đợi khám của tôi'}</h1>
          <p className="doctor-page-subtitle">
            Quản lý quá trình khám trong ngày: chờ khám, đang khám, hoàn thành hoặc bỏ qua.
          </p>
        </div>
        <div className="doctor-page-actions">
          <div className="queue-today-card">
            <span>Ngày hôm nay</span>
            <strong>{date}</strong>
          </div>
        </div>
      </div>

      <section className="queue-filter-card">
        <div>
          <label className="form-label">Ngày khám</label>
          <input className="form-control" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        {isAdmin && (
          <div>
            <label className="form-label">Bác sĩ</label>
            <select className="form-select" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
              <option value="">Tất cả bác sĩ</option>
              {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}
            </select>
          </div>
        )}
        <button className="btn queue-filter-button" type="button" onClick={() => loadQueue()}>
          Xem hàng đợi
        </button>
      </section>

      <section className="queue-summary-grid">
        <article><strong>{summary.total}</strong><span>Tổng lượt</span></article>
        <article><strong>{summary.waiting}</strong><span>Chờ khám</span></article>
        <article><strong>{summary.inProgress}</strong><span>Đang khám</span></article>
        <article><strong>{summary.completed}</strong><span>Hoàn thành</span></article>
        <article><strong>{summary.skipped}</strong><span>Bỏ qua</span></article>
      </section>

      <section className="queue-list-card">
        <div className="queue-list-header">
          <div>
            <span className="eyebrow">Danh sách bệnh nhân</span>
            <h2>{isAdmin ? 'Hàng đợi theo bác sĩ' : getName(user)}</h2>
          </div>
          <div className="queue-legend">
            <span><i className="waiting" /> Chờ khám</span>
            <span><i className="in-progress" /> Đang khám</span>
            <span><i className="completed" /> Hoàn thành</span>
          </div>
        </div>

        {loading ? (
          <div className="doctor-loading-card">Đang tải hàng đợi khám...</div>
        ) : appointments.length ? (
          <div className="queue-items">
            {appointments.map((item) => {
              const badge = consultationBadge(item.consultationStatus || 'waiting');
              return (
                <article className="queue-item" key={item._id}>
                  <div className="queue-number">
                    <span>STT</span>
                    <strong>{item.queueNumber || '-'}</strong>
                  </div>
                  <div className="queue-info">
                    <div className="queue-info-title">
                      <h3>{patientName(item)}</h3>
                      <span className={`badge ${badge.className}`}>{badge.label}</span>
                    </div>
                    <div className="queue-meta">
                      <span>Giờ khám: {item.timeSlot}</span>
                      {isAdmin && <span>Bác sĩ: {getName(item.doctorId)}</span>}
                      <span>Lý do: {item.reason || 'Không có ghi chú'}</span>
                    </div>
                  </div>
                  {renderActions(item)}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="queue-empty-state">Không có bệnh nhân trong hàng đợi ngày này.</div>
        )}
      </section>
    </div>
  );
}
