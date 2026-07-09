import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getStatusBadge } from '../utils/status.js';

const statuses = ['pending', 'confirmed', 'cancel_requested', 'completed', 'cancelled'];

export default function StaffToday() {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState(user?.clinicId || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState([]);

  async function load() {
    const payload = await api(`/appointments/clinic/${clinicId}/today?date=${date}`);
    setAppointments(payload.data || []);
  }

  async function updateStatus(appointmentId, status) {
    const payload = await api(`/appointments/clinic/${clinicId}/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    setAppointments((current) => current.map((item) => (item._id === appointmentId ? payload.data : item)));
  }

  return (
    <main className="container py-4">
      <h1 className="h3 mb-3">Lịch khám trong ngày</h1>
      <div className="row g-2 mb-3">
        <div className="col-md-5">
          <input className="form-control" value={clinicId} onChange={(e) => setClinicId(e.target.value)} />
        </div>
        <div className="col-md-4">
          <input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-md-3">
          <button className="btn btn-primary w-100" onClick={load}>
            Xem lịch
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Giờ</th>
              <th>Bệnh nhân</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <tr key={item._id}>
                  <td>{item.timeSlot}</td>
                  <td>{item.patientId?.name || item.patientId}</td>
                  <td>{item.reason}</td>
                  <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={item.status}
                      onChange={(e) => updateStatus(item._id, e.target.value)}
                    >
                      {statuses.map((status) => <option key={status} value={status}>{getStatusBadge(status).label}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
