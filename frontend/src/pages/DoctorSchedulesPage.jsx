import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import BaseModal from '../components/BaseModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getVietnamToday } from '../utils/dateTime.js';
import { AdminEmptyState, ConfirmDialog } from './admin/adminUtils.jsx';

const dayLabels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const exceptionLabels = {
  day_off: 'Nghỉ cả ngày',
  half_day: 'Nửa ngày',
  custom_hours: 'Đổi ca',
  overtime: 'Tăng ca'
};

const defaultExceptionForm = {
  date: getVietnamToday(),
  type: 'day_off',
  reason: '',
  startTime: '',
  endTime: '',
  slotDuration: 30
};

const morningShift = { startTime: '08:00', endTime: '12:00', slotDuration: 30 };
const afternoonShift = { startTime: '13:30', endTime: '17:00', slotDuration: 30 };

function newTemplateItem(dayOfWeek, shift = morningShift) {
  return {
    dayOfWeek,
    startTime: shift.startTime,
    endTime: shift.endTime,
    slotDuration: shift.slotDuration || 30,
    isWorking: true
  };
}

function toMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(totalMinutes) {
  const boundedMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hours = Math.floor(boundedMinutes / 60);
  const minutes = boundedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isSameShift(item, shift) {
  return item.startTime === shift.startTime && item.endTime === shift.endTime;
}

function hasShift(rows, shift) {
  return rows.some((item) => isSameShift(item, shift));
}

function overlaps(first, second) {
  if (!first.isWorking || !second.isWorking) return false;
  return toMinutes(first.startTime) < toMinutes(second.endTime)
    && toMinutes(second.startTime) < toMinutes(first.endTime);
}

function shiftOverlapsRows(rows, shift) {
  const candidate = { ...shift, isWorking: true };
  return rows.some((item) => overlaps(item, candidate));
}

function canAddShift(rows, shift) {
  return !hasShift(rows, shift) && !shiftOverlapsRows(rows, shift);
}

function getShiftLabel(item) {
  const start = toMinutes(item.startTime);
  if (start >= 5 * 60 && start < 12 * 60) return 'Ca sáng';
  if (start >= 12 * 60 && start < 18 * 60) return 'Ca chiều';
  return 'Ca tối';
}

function getNextSuggestedShift(dayOfWeek, rows) {
  if ((!rows.length || !hasShift(rows, morningShift)) && canAddShift(rows, morningShift)) {
    return newTemplateItem(dayOfWeek, morningShift);
  }

  if (!hasShift(rows, afternoonShift) && canAddShift(rows, afternoonShift)) {
    return newTemplateItem(dayOfWeek, afternoonShift);
  }

  const latestShift = [...rows].sort((a, b) => toMinutes(b.endTime) - toMinutes(a.endTime))[0];
  const startMinutes = toMinutes(latestShift.endTime) + 30;
  const endMinutes = Math.min(startMinutes + 150, 23 * 60);

  if (startMinutes >= 23 * 60 || endMinutes <= startMinutes) {
    return null;
  }

  return newTemplateItem(dayOfWeek, {
    startTime: toTime(startMinutes),
    endTime: toTime(endMinutes),
    slotDuration: 30
  });
}

function validateTemplateItems(items) {
  for (const item of items) {
    if (item.isWorking && (!item.startTime || !item.endTime || toMinutes(item.startTime) >= toMinutes(item.endTime))) {
      return 'Vui lòng kiểm tra giờ bắt đầu và kết thúc của lịch mặc định';
    }

    if (item.isWorking && Number(item.slotDuration || 0) <= 0) {
      return 'Slot duration phải lớn hơn 0';
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
      const first = items[index];
      const second = items[nextIndex];
      if (Number(first.dayOfWeek) !== Number(second.dayOfWeek)) continue;
      if (!first.isWorking || !second.isWorking) continue;

      if (isSameShift(first, second)) {
        return 'Ca làm việc này đã tồn tại';
      }

      if (overlaps(first, second)) {
        return 'Ca làm việc không được chồng lấn thời gian';
      }
    }
  }

  return '';
}

function countSlots(item) {
  if (!item.isWorking) return 0;
  const duration = Number(item.slotDuration || 30);
  const total = toMinutes(item.endTime) - toMinutes(item.startTime);
  return Math.max(0, Math.floor(total / duration));
}

function getWeekDates() {
  const today = new Date(`${getVietnamToday()}T00:00:00`);
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + 1 - day);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function monthDays(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const prefix = Array.from({ length: first.getDay() }, () => null);
  const days = Array.from({ length: last.getDate() }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
  return [...prefix, ...days];
}

export default function DoctorSchedulesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('template');
  const [template, setTemplate] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState(defaultExceptionForm);
  const [editingException, setEditingException] = useState(null);
  const [deletingException, setDeletingException] = useState(null);
  const [month, setMonth] = useState(getVietnamToday().slice(0, 7));

  const templateByDay = useMemo(() => {
    const map = new Map(dayLabels.map((_, day) => [day, []]));
    template.forEach((item) => {
      const day = Number(item.dayOfWeek);
      map.set(day, [...(map.get(day) || []), item].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    });
    return map;
  }, [template]);

  const weekDates = useMemo(getWeekDates, []);
  const stats = useMemo(() => {
    const workingDays = new Set(template.filter((item) => item.isWorking).map((item) => Number(item.dayOfWeek))).size;
    const weeklySlots = template.reduce((sum, item) => sum + countSlots(item), 0);
    const weekAppointments = appointments.filter((item) => weekDates.includes(item.date));
    const fillRate = weeklySlots ? Math.round((weekAppointments.length / weeklySlots) * 100) : 0;

    return {
      workingDays,
      weeklySlots,
      weekAppointments: weekAppointments.length,
      fillRate
    };
  }, [appointments, template, weekDates]);

  async function loadData() {
    if (!user?.doctorId) return;
    setLoading(true);
    try {
      const [templatePayload, exceptionPayload, appointmentPayload] = await Promise.all([
        api('/doctor/schedule-template'),
        api('/doctor/schedule-exceptions'),
        api(`/doctors/${user.doctorId}/appointments`)
      ]);
      setTemplate(templatePayload.data || []);
      setExceptions(exceptionPayload.data || []);
      setAppointments(appointmentPayload.data || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được lịch làm việc');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user?.doctorId]);

  function addTemplateShift(dayOfWeek, presetShift = null) {
    setTemplate((current) => {
      const rows = current.filter((item) => Number(item.dayOfWeek) === Number(dayOfWeek));
      const nextShift = presetShift
        ? newTemplateItem(dayOfWeek, presetShift)
        : getNextSuggestedShift(dayOfWeek, rows);

      if (!nextShift) {
        toast.warning('Không còn khoảng trống phù hợp để thêm ca trong ngày này');
        return current;
      }

      if (rows.some((item) => isSameShift(item, nextShift))) {
        toast.warning('Ca làm việc này đã tồn tại');
        return current;
      }

      if (!canAddShift(rows, nextShift)) {
        toast.warning('Ca làm việc không được chồng lấn thời gian');
        return current;
      }

      return [...current, nextShift];
    });
  }

  function updateTemplate(index, field, value) {
    setTemplate((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function removeTemplate(index) {
    setTemplate((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveTemplate() {
    const validationMessage = validateTemplateItems(template);
    if (validationMessage) {
      toast.warning(validationMessage);
      return;
    }

    const invalid = template.find((item) => item.isWorking && (!item.startTime || !item.endTime || toMinutes(item.startTime) >= toMinutes(item.endTime)));
    if (invalid) {
      toast.warning('Vui lòng kiểm tra giờ bắt đầu và kết thúc của lịch mặc định');
      return;
    }

    setSavingTemplate(true);
    try {
      const payload = await api('/doctor/schedule-template', {
        method: 'PUT',
        body: JSON.stringify(template.map((item) => ({
          dayOfWeek: Number(item.dayOfWeek),
          startTime: item.startTime,
          endTime: item.endTime,
          slotDuration: Number(item.slotDuration || 30),
          isWorking: Boolean(item.isWorking)
        })))
      });
      setTemplate(payload.data || []);
      toast.success('Đã lưu lịch làm việc mặc định');
    } catch (error) {
      toast.error(error.message || 'Không lưu được lịch mặc định');
    } finally {
      setSavingTemplate(false);
    }
  }

  function openCreateException(date = getVietnamToday()) {
    setEditingException(null);
    setExceptionForm({ ...defaultExceptionForm, date });
    setExceptionModalOpen(true);
  }

  function openEditException(item) {
    setEditingException(item);
    setExceptionForm({
      date: item.date,
      type: item.type,
      reason: item.reason || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      slotDuration: item.slotDuration || 30
    });
    setExceptionModalOpen(true);
  }

  async function saveException(event) {
    event.preventDefault();
    if (!exceptionForm.date) {
      toast.warning('Vui lòng chọn ngày');
      return;
    }
    if (exceptionForm.type !== 'day_off' && (!exceptionForm.startTime || !exceptionForm.endTime)) {
      toast.warning('Vui lòng nhập giờ bắt đầu và kết thúc');
      return;
    }

    try {
      await api(editingException ? `/doctor/schedule-exceptions/${editingException._id}` : '/doctor/schedule-exceptions', {
        method: editingException ? 'PUT' : 'POST',
        body: JSON.stringify({
          date: exceptionForm.date,
          type: exceptionForm.type,
          reason: exceptionForm.reason,
          startTime: exceptionForm.type === 'day_off' ? '' : exceptionForm.startTime,
          endTime: exceptionForm.type === 'day_off' ? '' : exceptionForm.endTime,
          slotDuration: Number(exceptionForm.slotDuration || 30)
        })
      });
      toast.success(editingException ? 'Đã cập nhật ngoại lệ lịch' : 'Đã tạo ngoại lệ lịch');
      setExceptionModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.message || 'Không lưu được ngoại lệ lịch');
    }
  }

  async function deleteException() {
    if (!deletingException) return;
    try {
      await api(`/doctor/schedule-exceptions/${deletingException._id}`, { method: 'DELETE' });
      toast.success('Đã xóa ngoại lệ lịch');
      setDeletingException(null);
      loadData();
    } catch (error) {
      toast.error(error.message || 'Không xóa được ngoại lệ lịch');
    }
  }

  const calendarDays = monthDays(`${month}-01`);
  const exceptionByDate = new Map(exceptions.map((item) => [item.date, item]));

  return (
    <div className="doctor-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <span className="eyebrow">Lịch làm việc của tôi</span>
          <h1 className="h3 mt-2 mb-1">Quản lý lịch khám theo tuần</h1>
          <p className="text-secondary mb-0">Cấu hình lịch mặc định một lần, chỉ tạo ngoại lệ khi nghỉ, đổi ca hoặc tăng ca.</p>
        </div>
        <button className="btn btn-primary" disabled={!user?.doctorId} type="button" onClick={() => openCreateException()}>
          Tạo ngoại lệ
        </button>
      </div>

      <section className="doctor-schedule-stats">
        <article><strong>{stats.workingDays}</strong><span>Ngày làm việc tuần này</span></article>
        <article><strong>{stats.weeklySlots}</strong><span>Số slot tuần này</span></article>
        <article><strong>{stats.weekAppointments}</strong><span>Lịch hẹn tuần này</span></article>
        <article><strong>{stats.fillRate}%</strong><span>Tỷ lệ lấp đầy lịch</span></article>
      </section>

      <div className="admin-tabs mb-3">
        <button className={`admin-tab ${activeTab === 'template' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('template')}>
          Lịch làm việc mặc định
        </button>
        <button className={`admin-tab ${activeTab === 'exceptions' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('exceptions')}>
          Ngày nghỉ & thay đổi lịch
        </button>
        <button className={`admin-tab ${activeTab === 'calendar' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('calendar')}>
          Calendar view
        </button>
      </div>

      {loading ? (
        <section className="management-panel admin-table-card"><AdminEmptyState message="Đang tải lịch làm việc..." /></section>
      ) : null}

      {!loading && activeTab === 'template' && (
        <section className="management-panel admin-table-card">
          <div className="doctor-template-header">
            <div>
              <h2>Lịch làm việc mặc định theo tuần</h2>
              <p>Hỗ trợ nhiều ca trong một ngày, ví dụ 08:00-12:00 và 13:30-17:00.</p>
            </div>
            <button className="btn btn-primary" disabled={savingTemplate} type="button" onClick={saveTemplate}>
              {savingTemplate ? 'Đang lưu...' : 'Lưu lịch mặc định'}
            </button>
          </div>

          <div className="doctor-week-template">
            {dayLabels.map((label, day) => {
              const rows = templateByDay.get(day) || [];
              const hasMorning = hasShift(rows, morningShift);
              const hasAfternoon = hasShift(rows, afternoonShift);
              const canAddMorning = canAddShift(rows, morningShift);
              const canAddAfternoon = canAddShift(rows, afternoonShift);
              const canAddSuggested = Boolean(getNextSuggestedShift(day, rows));
              const morningTitle = hasMorning ? 'Ca sáng đã tồn tại' : 'Ca sáng bị chồng lấn với ca hiện có';
              const afternoonTitle = hasAfternoon ? 'Ca chiều đã tồn tại' : 'Ca chiều bị chồng lấn với ca hiện có';
              return (
                <article className="doctor-day-template-card" key={day}>
                  <div className="doctor-day-template-title">
                    <strong>{label}</strong>
                    <div className="doctor-day-template-actions">
                      <button className="btn btn-sm btn-outline-primary" disabled={!canAddMorning} title={!canAddMorning ? morningTitle : undefined} type="button" onClick={() => addTemplateShift(day, morningShift)}>
                        Thêm ca sáng
                      </button>
                      <button className="btn btn-sm btn-outline-primary" disabled={!canAddAfternoon} title={!canAddAfternoon ? afternoonTitle : undefined} type="button" onClick={() => addTemplateShift(day, afternoonShift)}>
                        Thêm ca chiều
                      </button>
                      <button className="btn btn-sm btn-primary" disabled={!canAddSuggested} title={!canAddSuggested ? 'Không còn khoảng trống phù hợp để thêm ca' : undefined} type="button" onClick={() => addTemplateShift(day)}>
                      Thêm ca
                      </button>
                    </div>
                  </div>

                  {rows.length ? rows.map((item) => {
                    const index = template.indexOf(item);
                    return (
                      <div className="doctor-shift-row" key={`${day}-${index}`}>
                        <div className="doctor-shift-label">
                          <strong>{getShiftLabel(item)}</strong>
                          <span>{item.startTime} - {item.endTime}</span>
                        </div>
                        <label className="admin-schedule-switch compact">
                          <input type="checkbox" checked={item.isWorking} onChange={(event) => updateTemplate(index, 'isWorking', event.target.checked)} />
                          <span />
                        </label>
                        <input type="time" value={item.startTime} onChange={(event) => updateTemplate(index, 'startTime', event.target.value)} />
                        <input type="time" value={item.endTime} onChange={(event) => updateTemplate(index, 'endTime', event.target.value)} />
                        <input min="5" step="5" type="number" value={item.slotDuration} onChange={(event) => updateTemplate(index, 'slotDuration', event.target.value)} />
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removeTemplate(index)}>Xóa</button>
                      </div>
                    );
                  }) : (
                    <div className="doctor-schedule-empty-small">Chưa có ca làm việc</div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!loading && activeTab === 'exceptions' && (
        <section className="management-panel admin-table-card">
          <div className="doctor-template-header">
            <div>
              <h2>Ngày nghỉ & thay đổi lịch</h2>
              <p>Tạo ngoại lệ khi nghỉ cá nhân, đổi ca, khám nửa ngày hoặc tăng ca.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => openCreateException()}>Tạo ngoại lệ</button>
          </div>

          {exceptions.length ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table">
                <thead>
                  <tr><th>Ngày</th><th>Loại</th><th>Giờ</th><th>Lý do</th><th /></tr>
                </thead>
                <tbody>
                  {exceptions.map((item) => (
                    <tr key={item._id}>
                      <td className="fw-semibold">{item.date}</td>
                      <td><span className={`schedule-exception-badge ${item.type}`}>{exceptionLabels[item.type]}</span></td>
                      <td>{item.type === 'day_off' ? 'Nghỉ' : `${item.startTime} - ${item.endTime}`}</td>
                      <td>{item.reason || 'Không có ghi chú'}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-2" type="button" onClick={() => openEditException(item)}>Sửa</button>
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => setDeletingException(item)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState message="Chưa có ngày nghỉ hoặc thay đổi lịch" />
          )}
        </section>
      )}

      {!loading && activeTab === 'calendar' && (
        <section className="management-panel admin-table-card">
          <div className="doctor-template-header">
            <div>
              <h2>Calendar view</h2>
              <p>Xanh: có lịch mặc định. Đỏ: nghỉ. Cam: ngoại lệ/đổi ca.</p>
            </div>
            <input className="form-control doctor-month-picker" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <div className="doctor-calendar-grid">
            {dayLabels.map((label) => <strong key={label}>{label}</strong>)}
            {calendarDays.map((date, index) => {
              if (!date) return <span className="doctor-calendar-day muted" key={`empty-${index}`} />;
              const day = new Date(`${date}T00:00:00`).getDay();
              const exception = exceptionByDate.get(date);
              const hasTemplate = (templateByDay.get(day) || []).some((item) => item.isWorking);
              const className = exception?.type === 'day_off' ? 'off' : exception ? 'exception' : hasTemplate ? 'working' : '';

              return (
                <button className={`doctor-calendar-day ${className}`} key={date} type="button" onClick={() => openCreateException(date)}>
                  <span>{Number(date.slice(-2))}</span>
                  <small>{exception ? exceptionLabels[exception.type] : hasTemplate ? 'Có lịch' : 'Trống'}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {exceptionModalOpen && (
        <BaseModal className="admin-modal" onClose={() => setExceptionModalOpen(false)}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <span className="eyebrow">Ngoại lệ lịch</span>
              <h2 className="h5 mb-0">{editingException ? 'Cập nhật ngoại lệ' : 'Tạo ngoại lệ lịch'}</h2>
            </div>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setExceptionModalOpen(false)}>Đóng</button>
          </div>

          <form onSubmit={saveException}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Ngày</label>
                <input className="form-control" type="date" value={exceptionForm.date} onChange={(event) => setExceptionForm({ ...exceptionForm, date: event.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Loại ngoại lệ</label>
                <select className="form-select" value={exceptionForm.type} onChange={(event) => setExceptionForm({ ...exceptionForm, type: event.target.value })}>
                  {Object.entries(exceptionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {exceptionForm.type !== 'day_off' && (
                <>
                  <div className="col-md-4">
                    <label className="form-label">Giờ bắt đầu</label>
                    <input className="form-control" type="time" value={exceptionForm.startTime} onChange={(event) => setExceptionForm({ ...exceptionForm, startTime: event.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Giờ kết thúc</label>
                    <input className="form-control" type="time" value={exceptionForm.endTime} onChange={(event) => setExceptionForm({ ...exceptionForm, endTime: event.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Slot</label>
                    <input className="form-control" min="5" step="5" type="number" value={exceptionForm.slotDuration} onChange={(event) => setExceptionForm({ ...exceptionForm, slotDuration: event.target.value })} />
                  </div>
                </>
              )}
              <div className="col-12">
                <label className="form-label">Lý do</label>
                <textarea className="form-control" rows="3" value={exceptionForm.reason} onChange={(event) => setExceptionForm({ ...exceptionForm, reason: event.target.value })} />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button className="btn btn-outline-secondary" type="button" onClick={() => setExceptionModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" type="submit">Lưu ngoại lệ</button>
            </div>
          </form>
        </BaseModal>
      )}

      {deletingException && (
        <ConfirmDialog
          title="Xóa ngoại lệ lịch"
          message={`Xóa ngoại lệ ngày ${deletingException.date}?`}
          onCancel={() => setDeletingException(null)}
          onConfirm={deleteException}
        />
      )}
    </div>
  );
}
