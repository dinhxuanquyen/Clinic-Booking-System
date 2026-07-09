import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { AdminAlert, AdminEmptyState, AdminPagination, getId, getName, Modal, paginate } from './adminUtils.jsx';

const defaultForm = {
  doctorId: '',
  clinicId: '',
  date: '2026-06-01',
  workingHoursStart: '08:00',
  workingHoursEnd: '11:00',
  slotDuration: 30,
  isWorkingDay: true,
  note: ''
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function parseWorkingHours(value, fallbackStart = '08:00', fallbackEnd = '11:00') {
  return {
    start: value?.start || fallbackStart,
    end: value?.end || fallbackEnd
  };
}

export default function AdminSchedulesPage() {
  const toast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ clinicId: '', doctorId: '', date: '' });
  const [activeTab, setActiveTab] = useState('list');
  const [slotFilters, setSlotFilters] = useState({ clinicId: '', doctorId: '', date: todayString() });
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');
  const [slotData, setSlotData] = useState([]);
  const [slotViewed, setSlotViewed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filterDoctors = doctors.filter((item) => !filters.clinicId || getId(item.clinicId) === filters.clinicId);
  const formDoctors = doctors.filter((item) => form.clinicId && getId(item.clinicId) === form.clinicId);
  const slotDoctors = doctors.filter((item) => slotFilters.clinicId && getId(item.clinicId) === slotFilters.clinicId);
  const selectedSlotDoctor = doctors.find((item) => item._id === slotFilters.doctorId);
  const slotSummary = {
    total: slotData.length,
    available: slotData.filter((item) => item.available).length,
    booked: slotData.filter((item) => !item.available).length,
    working: slotData.length > 0
  };

  const filteredSchedules = useMemo(() => schedules.filter((item) => {
    const matchesClinic = !filters.clinicId || getId(item.clinicId) === filters.clinicId;
    const matchesDoctor = !filters.doctorId || getId(item.doctorId) === filters.doctorId;
    const matchesDate = !filters.date || item.date === filters.date;
    return matchesClinic && matchesDoctor && matchesDate;
  }), [filters, schedules]);

  const clinics = useMemo(() => {
    const map = new Map();
    doctors.forEach((doctor) => {
      const id = getId(doctor.clinicId);
      if (id && !map.has(id)) map.set(id, doctor.clinicId);
    });
    return Array.from(map.values());
  }, [doctors]);

  const selectedSlotClinic = clinics.find((item) => getId(item) === slotFilters.clinicId);

  const { currentPage: safePage, pageItems, totalPages } = useMemo(() => paginate(filteredSchedules, currentPage), [currentPage, filteredSchedules]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.clinicId, filters.doctorId, filters.date]);

  function load() {
    Promise.all([api('/doctors'), api('/schedules')])
      .then(([doctorPayload, schedulePayload]) => {
        setDoctors(doctorPayload.data || []);
        setSchedules(schedulePayload.data || []);
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
    setForm({ ...defaultForm, doctorId: '', clinicId: '' });
    setModalOpen(true);
  }

  function openEdit(item) {
    const workingHours = parseWorkingHours(item.workingHours);
    const doctorId = getId(item.doctorId);
    const doctor = doctors.find((doctorItem) => doctorItem._id === doctorId);
    setEditing(item);
    setError('');
    setForm({
      doctorId,
      clinicId: getId(doctor?.clinicId) || getId(item.clinicId),
      date: item.date,
      workingHoursStart: workingHours.start,
      workingHoursEnd: workingHours.end,
      slotDuration: item.slotDuration || 30,
      isWorkingDay: Boolean(item.isWorkingDay),
      note: item.note || ''
    });
    setModalOpen(true);
  }

  function updateDoctor(doctorId) {
    const doctor = doctors.find((item) => item._id === doctorId);
    setForm({ ...form, doctorId, clinicId: getId(doctor?.clinicId) });
  }

  function updateFormClinic(clinicId) {
    setForm({ ...form, clinicId, doctorId: '' });
  }

  function updateFilterClinic(clinicId) {
    setFilters({ ...filters, clinicId, doctorId: '' });
  }

  function updateSlotClinic(clinicId) {
    setSlotFilters({ ...slotFilters, clinicId, doctorId: '' });
    setSlotData([]);
    setSlotMessage('');
    setSlotViewed(false);
  }

  async function loadAvailableSlots() {
    if (!slotFilters.clinicId || !slotFilters.doctorId || !slotFilters.date) {
      toast.warning('Vui lòng chọn cơ sở, bác sĩ và ngày');
      return;
    }

    setSlotLoading(true);
    setSlotViewed(true);
    setSlotMessage('');
    try {
      const payload = await api(`/doctors/${slotFilters.doctorId}/available-slots?date=${slotFilters.date}`);
      setSlotData(payload.data || []);
      setSlotMessage(payload.message || '');
    } catch (err) {
      setSlotData([]);
      setSlotMessage('');
      toast.error(err.message);
    } finally {
      setSlotLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.clinicId) {
      toast.warning('Vui lòng chọn cơ sở');
      return;
    }
    if (!form.doctorId) {
      toast.warning('Vui lòng chọn bác sĩ');
      return;
    }
    if (!form.date) {
      toast.warning('Vui lòng chọn ngày làm việc');
      return;
    }
    if (!form.workingHoursStart || !form.workingHoursEnd) {
      toast.warning('Vui lòng nhập giờ bắt đầu và giờ kết thúc');
      return;
    }

    try {
      const body = {
        doctorId: form.doctorId,
        clinicId: form.clinicId,
        date: form.date,
        workingHours: { start: form.workingHoursStart, end: form.workingHoursEnd },
        slotDuration: Number(form.slotDuration),
        isWorkingDay: Boolean(form.isWorkingDay),
        note: form.note
      };
      await api(editing ? `/schedules/${editing._id}` : '/schedules', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      toast.success(editing ? 'Cập nhật thành công' : 'Thêm thành công');
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center page-heading admin-page-heading">
        <div><span className="eyebrow">Quản lý</span><h1 className="h3 mt-2 mb-0">Lịch làm việc</h1></div>
        <button className="btn btn-primary" onClick={openCreate}>Thêm lịch</button>
      </div>

      <div className="admin-tabs mb-3">
        <button className={`admin-tab ${activeTab === 'list' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('list')}>
          Danh sách lịch
        </button>
        <button className={`admin-tab ${activeTab === 'doctor-calendar' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('doctor-calendar')}>
          Lịch bác sĩ
        </button>
      </div>

      {activeTab === 'list' && (
      <div className="management-panel admin-table-card">
        <div className="admin-table-toolbar">
          <select className="form-select" value={filters.clinicId} onChange={(event) => updateFilterClinic(event.target.value)}>
            <option value="">Tất cả cơ sở</option>
            {clinics.map((item) => <option key={getId(item)} value={getId(item)}>{getName(item)}</option>)}
          </select>
          <select className="form-select" value={filters.doctorId} onChange={(event) => setFilters({ ...filters, doctorId: event.target.value })}>
            <option value="">Tất cả bác sĩ</option>
            {filterDoctors.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
          <input className="form-control" type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
        </div>

        {filteredSchedules.length ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table">
                <thead><tr><th>Bác sĩ</th><th>Cơ sở</th><th>Ngày</th><th>Giờ</th><th>Slot</th><th>Làm việc</th><th></th></tr></thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item._id}>
                      <td className="fw-semibold">{getName(item.doctorId)}</td>
                      <td>{getName(item.clinicId)}</td>
                      <td>{item.date}</td>
                      <td>{item.workingHours?.start}-{item.workingHours?.end}</td>
                      <td>{item.slotDuration} phút</td>
                      <td><span className={`admin-schedule-status-badge ${item.isWorkingDay ? 'working' : 'off'}`}>{item.isWorkingDay ? 'Có' : 'Nghỉ'}</span></td>
                      <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(item)}>Sửa</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        ) : (
          <AdminEmptyState message="Không có lịch làm việc phù hợp" />
        )}
      </div>
      )}

      {activeTab === 'doctor-calendar' && (
        <section className="management-panel admin-schedule-calendar-card">
          <div className="admin-section-heading">
            <div>
              <h2>Lịch bác sĩ</h2>
              <p>Xem nhanh các khung giờ trống và đã đặt theo từng cơ sở.</p>
            </div>
          </div>

          <div className="admin-schedule-filter-card">
            <div className="admin-schedule-calendar-toolbar">
              <label>
                <span>Cơ sở</span>
                <select className="form-select" value={slotFilters.clinicId} onChange={(event) => updateSlotClinic(event.target.value)}>
                  <option value="">Chọn cơ sở</option>
                  {clinics.map((item) => <option key={getId(item)} value={getId(item)}>{getName(item)}</option>)}
                </select>
              </label>
              <label>
                <span>Bác sĩ</span>
                <select
                  className="form-select"
                  disabled={!slotFilters.clinicId || slotDoctors.length === 0}
                  value={slotFilters.doctorId}
                  onChange={(event) => {
                    setSlotFilters({ ...slotFilters, doctorId: event.target.value });
                    setSlotData([]);
                    setSlotMessage('');
                    setSlotViewed(false);
                  }}
                >
                  <option value="">{slotFilters.clinicId && slotDoctors.length === 0 ? 'Cơ sở này chưa có bác sĩ' : 'Chọn bác sĩ'}</option>
                  {slotDoctors.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Ngày</span>
                <input
                  className="form-control"
                  type="date"
                  value={slotFilters.date}
                  onChange={(event) => {
                    setSlotFilters({ ...slotFilters, date: event.target.value });
                    setSlotData([]);
                    setSlotMessage('');
                    setSlotViewed(false);
                  }}
                />
              </label>
              <button className="btn admin-gradient-btn" disabled={slotLoading} type="button" onClick={loadAvailableSlots}>
                {slotLoading ? 'Đang tải...' : 'Xem lịch'}
              </button>
            </div>
          </div>

          {slotFilters.clinicId && slotDoctors.length === 0 && (
            <div className="admin-schedule-inline-empty">Cơ sở này chưa có bác sĩ</div>
          )}

          {slotViewed && (
            <div className="admin-schedule-slot-view">
              <div className="admin-schedule-summary">
                <div><span>Cơ sở</span><strong>{getName(selectedSlotClinic)}</strong></div>
                <div><span>Bác sĩ</span><strong>{getName(selectedSlotDoctor)}</strong></div>
                <div><span>Ngày</span><strong>{slotFilters.date}</strong></div>
                <div><span>Tổng slot</span><strong>{slotSummary.total}</strong></div>
                <div className="success"><span>Trống</span><strong>{slotSummary.available}</strong></div>
                <div className="info"><span>Đã đặt</span><strong>{slotSummary.booked}</strong></div>
                <div className={slotSummary.working ? 'success' : 'danger'}><span>Trạng thái ngày</span><strong>{slotSummary.working ? 'Làm việc' : 'Nghỉ'}</strong></div>
              </div>

              <div className="admin-schedule-legend">
                <span><i className="available" /> Trống</span>
                <span><i className="booked" /> Đã đặt</span>
                <span><i className="off" /> Nghỉ</span>
              </div>

              {!slotLoading && slotData.length > 0 && (
                <div className="admin-schedule-slot-grid">
                  {slotData.map((slot) => (
                    <div className={`admin-schedule-slot ${slot.available ? 'available' : 'booked'}`} key={slot.timeSlot}>
                      <i aria-hidden="true" />
                      <strong>{slot.timeSlot}</strong>
                      <span>{slot.available ? 'Trống' : 'Đã đặt'}</span>
                    </div>
                  ))}
                </div>
              )}

              {!slotLoading && slotData.length === 0 && (
                <div className="admin-schedule-off-empty">
                  <span aria-hidden="true">📅</span>
                  <strong>Nghỉ</strong>
                  <p>{slotMessage || 'Bác sĩ không có lịch làm việc trong ngày này'}</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Cập nhật lịch làm việc' : 'Thêm lịch làm việc'} onClose={() => setModalOpen(false)} onSubmit={submit}>
          <AdminAlert message={error} type="danger" />
          <div className="admin-schedule-form">
            <section className="admin-schedule-form-section">
              <h3>Thông tin bác sĩ</h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Cơ sở</label>
                  <select className="form-select" value={form.clinicId} onChange={(event) => updateFormClinic(event.target.value)}>
                    <option value="">Chọn cơ sở</option>
                    {clinics.map((item) => <option key={getId(item)} value={getId(item)}>{getName(item)}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Bác sĩ</label>
                  <select className="form-select" disabled={!form.clinicId || formDoctors.length === 0} value={form.doctorId} onChange={(event) => updateDoctor(event.target.value)}>
                    <option value="">{form.clinicId && formDoctors.length === 0 ? 'Cơ sở này chưa có bác sĩ' : 'Chọn bác sĩ'}</option>
                    {formDoctors.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                  </select>
                  {form.clinicId && formDoctors.length === 0 && (
                    <div className="form-text text-danger">Cơ sở này chưa có bác sĩ</div>
                  )}
                </div>
              </div>
            </section>

            <section className="admin-schedule-form-section">
              <h3>Thời gian làm việc</h3>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Ngày</label>
                  <input type="date" className="form-control" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Giờ bắt đầu</label>
                  <input type="time" className="form-control" value={form.workingHoursStart} onChange={(event) => setForm({ ...form, workingHoursStart: event.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Giờ kết thúc</label>
                  <input type="time" className="form-control" value={form.workingHoursEnd} onChange={(event) => setForm({ ...form, workingHoursEnd: event.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Slot duration</label>
                  <input type="number" min="5" step="5" className="form-control" value={form.slotDuration} onChange={(event) => setForm({ ...form, slotDuration: event.target.value })} />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <label className="admin-schedule-switch">
                    <input type="checkbox" checked={form.isWorkingDay} onChange={(event) => setForm({ ...form, isWorkingDay: event.target.checked })} />
                    <span />
                    <strong>Làm việc</strong>
                  </label>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-control" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
                </div>
              </div>
            </section>
          </div>
        </Modal>
      )}
    </>
  );
}
