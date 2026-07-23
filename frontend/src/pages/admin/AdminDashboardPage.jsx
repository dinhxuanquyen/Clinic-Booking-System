import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client.js';
import { getStatusBadge } from '../../utils/status.js';
import { resolveMediaUrl } from '../../utils/media.js';
import { AdminEmptyState, getName } from './adminUtils.jsx';

const statusChartConfig = {
  pending: { label: 'Chờ xác nhận', color: '#f59e0b' },
  confirmed: { label: 'Đã xác nhận', color: '#22c55e' },
  in_progress: { label: 'Đang khám', color: '#2563eb' },
  completed: { label: 'Hoàn thành', color: '#0ea5e9' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
  no_show: { label: 'Không đến khám', color: '#9f1239' },
  cancel_requested: { label: 'Yêu cầu hủy', color: '#eab308' },
  reschedule_requested: { label: 'Yêu cầu đổi lịch', color: '#06b6d4' },
  reschedule_rejected: { label: 'Từ chối đổi lịch', color: '#f97316' }
};

const timeFilterOptions = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'this_week', label: 'Tuần này' },
  { value: '7d', label: '7 ngày gần nhất' },
  { value: '30d', label: '30 ngày gần nhất' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'this_quarter', label: 'Quý này' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn' },
  { value: 'all', label: 'Toàn bộ' }
];

const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const taskStatuses = ['pending', 'cancel_requested', 'reschedule_requested'];

function getVietnamToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseAppointmentDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const today = parseAppointmentDate(getVietnamToday()) || new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfQuarter(date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function endOfQuarter(date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth + 3, 0);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31);
}

function getDateRange(range, customFrom = '', customTo = '') {
  const today = startOfToday();
  const end = new Date(today);

  if (range === 'today') {
    return { start: today, end };
  }

  if (range === 'yesterday') {
    const yesterday = addDays(today, -1);
    return { start: yesterday, end: yesterday };
  }

  if (range === 'this_week') {
    return { start: startOfWeek(today), end: endOfWeek(today) };
  }

  if (range === '7d' || range === '30d') {
    const days = range === '7d' ? 7 : 30;
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));
    return { start, end };
  }

  if (range === 'this_month') {
    return { start: startOfMonth(today), end: endOfMonth(today) };
  }

  if (range === 'this_quarter') {
    return { start: startOfQuarter(today), end: endOfQuarter(today) };
  }

  if (range === 'this_year') {
    return { start: startOfYear(today), end: endOfYear(today) };
  }

  if (range === 'custom') {
    let start = parseAppointmentDate(customFrom) || today;
    let finish = parseAppointmentDate(customTo) || start;
    if (start > finish) {
      [start, finish] = [finish, start];
    }
    return { start, end: finish };
  }

  return { start: null, end: null };
}

function isInDateRange(appointment, range, customFrom = '', customTo = '') {
  if (range === 'all') return true;
  const date = parseAppointmentDate(appointment.date);
  if (!date) return false;
  const { start, end } = getDateRange(range, customFrom, customTo);
  return (!start || date >= start) && (!end || date <= end);
}

function buildDayBuckets(start, end) {
  const buckets = [];
  const current = new Date(start);

  while (current <= end) {
    const date = toDateKey(current);
    buckets.push({ key: date, date, label: formatDateLabel(date), total: 0 });
    current.setDate(current.getDate() + 1);
  }

  return buckets;
}

function buildMonthBuckets(year, startMonth = 0, endMonth = 11) {
  return Array.from({ length: endMonth - startMonth + 1 }, (_, index) => {
    const month = startMonth + index;
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: monthLabels[month],
      total: 0
    };
  });
}

function getTimeChartConfig(range, appointments, customFrom = '', customTo = '') {
  const today = startOfToday();

  if (range === 'this_year') {
    const buckets = buildMonthBuckets(today.getFullYear());
    const bucketMap = new Map(buckets.map((item) => [item.key, item]));
    appointments.forEach((appointment) => {
      const date = parseAppointmentDate(appointment.date);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketMap.get(key);
      if (bucket) bucket.total += 1;
    });
    return { type: 'bar', title: 'Số lịch theo từng tháng trong năm', data: buckets };
  }

  if (range === 'this_quarter') {
    const start = startOfQuarter(today);
    const end = endOfQuarter(today);
    const buckets = buildMonthBuckets(today.getFullYear(), start.getMonth(), end.getMonth());
    const bucketMap = new Map(buckets.map((item) => [item.key, item]));
    appointments.forEach((appointment) => {
      const date = parseAppointmentDate(appointment.date);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketMap.get(key);
      if (bucket) bucket.total += 1;
    });
    return { type: 'bar', title: 'Số lịch theo từng tháng trong quý', data: buckets };
  }

  if (range === 'all') {
    const byMonth = new Map();
    appointments.forEach((appointment) => {
      const date = parseAppointmentDate(appointment.date);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      const current = byMonth.get(key) || { key, label, total: 0 };
      current.total += 1;
      byMonth.set(key, current);
    });
    return {
      type: 'bar',
      title: 'Số lịch theo từng tháng',
      data: Array.from(byMonth.values()).sort((a, b) => a.key.localeCompare(b.key))
    };
  }

  const { start, end } = getDateRange(range, customFrom, customTo);
  const buckets = buildDayBuckets(start, end);
  const bucketMap = new Map(buckets.map((item) => [item.key, item]));
  appointments.forEach((appointment) => {
    const bucket = bucketMap.get(appointment.date);
    if (bucket) bucket.total += 1;
  });

  return {
    type: 'line',
    title: range === 'this_month' ? 'Số lịch theo từng ngày trong tháng' : 'Số lịch theo từng ngày',
    data: buckets
  };
}

function statCount(appointments, status) {
  return appointments.filter((item) => item.status === status).length;
}

function entityKey(value, fallback) {
  if (!value) return fallback;
  return typeof value === 'object' ? value._id || fallback : value;
}

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'CB';
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || '';
  return `${first}${last}`.toUpperCase();
}

function entityImage(value, type) {
  if (!value || typeof value !== 'object') return '';
  if (type === 'doctor') return value.avatar || value.image || value.photoUrl || value.photo || value.profileImage || '';
  return value.image || value.photo || value.logo || value.coverImage || '';
}

function buildRanking(appointments, field, fallbackName) {
  const map = new Map();
  appointments.forEach((appointment) => {
    const value = appointment[field];
    const key = entityKey(value, fallbackName);
    const name = getName(value);
    const current = map.get(key) || { key, name, entity: typeof value === 'object' ? value : null, count: 0 };
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function formatDateLabel(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  });
}

function formatActivityTime(value) {
  if (!value) return 'Chưa cập nhật';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function fallbackAppointmentTimestamp(appointment) {
  const dateTime = `${appointment.date || ''}T${(appointment.timeSlot || '00:00').split('-')[0] || '00:00'}:00`;
  const parsed = new Date(dateTime);
  return Number.isNaN(parsed.getTime()) ? appointment.date : parsed.toISOString();
}

function activityMeta(appointment) {
  const patientName = getName(appointment.patientId);
  const doctorName = getName(appointment.doctorId);

  if (appointment.status === 'confirmed') {
    return {
      icon: 'OK',
      tone: 'success',
      action: `${patientName} có lịch đã được xác nhận với ${doctorName}`,
      time: appointment.updatedAt || appointment.createdAt || fallbackAppointmentTimestamp(appointment)
    };
  }

  if (appointment.status === 'cancelled') {
    return {
      icon: 'HU',
      tone: 'danger',
      action: `${patientName} có lịch đã hủy với ${doctorName}`,
      time: appointment.cancelRequest?.handledAt || appointment.updatedAt || appointment.createdAt || fallbackAppointmentTimestamp(appointment)
    };
  }

  if (appointment.status === 'cancel_requested') {
    return {
      icon: 'YC',
      tone: 'warning',
      action: `${patientName} đã gửi yêu cầu hủy lịch với ${doctorName}`,
      time: appointment.cancelRequest?.requestedAt || appointment.updatedAt || appointment.createdAt || fallbackAppointmentTimestamp(appointment)
    };
  }

  if (appointment.status === 'reschedule_requested') {
    return {
      icon: 'DL',
      tone: 'info',
      action: `${patientName} đã gửi yêu cầu đổi lịch với ${doctorName}`,
      time: appointment.rescheduleRequest?.requestedAt || appointment.updatedAt || appointment.createdAt || fallbackAppointmentTimestamp(appointment)
    };
  }

  if (appointment.status === 'in_progress') {
    return {
      icon: 'KH',
      tone: 'primary',
      action: `${patientName} đang trong quy trình khám với ${doctorName}`,
      time: appointment.updatedAt || appointment.createdAt || fallbackAppointmentTimestamp(appointment)
    };
  }

  if (appointment.status === 'completed') {
    return {
      icon: 'HT',
      tone: 'primary',
      action: `${patientName} đã hoàn thành lịch khám với ${doctorName}`,
      time: appointment.updatedAt || appointment.createdAt || fallbackAppointmentTimestamp(appointment)
    };
  }

  return {
    icon: 'MO',
    tone: 'neutral',
    action: `${patientName} đã đặt lịch với ${doctorName}`,
    time: appointment.createdAt || appointment.updatedAt || fallbackAppointmentTimestamp(appointment)
  };
}

function scopeLabel(timeRange, clinicFilter, clinics, customFrom = '', customTo = '') {
  const timeLabel = timeRange === 'custom'
    ? `${customFrom || '...'} - ${customTo || '...'}`
    : timeFilterOptions.find((item) => item.value === timeRange)?.label || 'Khoảng thời gian đã chọn';
  const clinicLabel = clinicFilter === 'all'
    ? 'tất cả cơ sở'
    : clinics.find((clinic) => clinic._id === clinicFilter)?.name || 'cơ sở đã chọn';
  return `${timeLabel}, ${clinicLabel}`;
}

function DashboardLoading() {
  return (
    <div className="dash-loading-state" role="status" aria-live="polite">
      <div className="dash-loading-bar" />
      <h2>Đang tải bảng điều khiển vận hành</h2>
      <p>Hệ thống đang tổng hợp lịch hẹn, bác sĩ, cơ sở và tài khoản quản trị.</p>
    </div>
  );
}

function AppointmentMiniTable({ appointments, emptyMessage, showAction = false }) {
  if (!appointments.length) {
    return <AdminEmptyState message={emptyMessage || 'Không có dữ liệu phù hợp'} />;
  }

  return (
    <div className="dash-table-wrap">
      <table className="dash-mini-table">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Giờ</th>
            <th>Bệnh nhân</th>
            <th>Bác sĩ</th>
            <th>Cơ sở</th>
            <th>Trạng thái</th>
            {showAction && <th aria-label="Thao tác"></th>}
          </tr>
        </thead>
        <tbody>
          {appointments.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <tr key={item._id}>
                <td data-label="Ngày">{item.date}</td>
                <td data-label="Giờ">{item.timeSlot}</td>
                <td data-label="Bệnh nhân">{getName(item.patientId)}</td>
                <td data-label="Bác sĩ">{getName(item.doctorId)}</td>
                <td data-label="Cơ sở">{getName(item.clinicId)}</td>
                <td data-label="Trạng thái"><span className={badge.className}>{badge.label}</span></td>
                {showAction && (
                  <td data-label="Thao tác" className="dash-table-action">
                    <Link className="btn btn-xs btn-outline-primary" to={`/admin/appointments?appointmentId=${item._id}`}>
                      Xem
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AppointmentUpdatesList({ updates }) {
  if (!updates.length) {
    return <AdminEmptyState message="Chưa có cập nhật lịch hẹn trong phạm vi đã chọn" />;
  }

  return (
    <div className="dash-activity-feed">
      {updates.map((item) => (
        <Link className="dash-activity-item" key={`${item.appointmentId}-${item.time}-${item.status}`} to={`/admin/appointments?appointmentId=${item.appointmentId}`}>
          <div className={`dash-activity-icon ${item.tone}`}>{item.icon}</div>
          <div className="dash-activity-content">
            <p className="dash-activity-action">{item.action}</p>
            <p className="dash-activity-meta">{item.patientName} · {item.doctorName}</p>
          </div>
          <span className="dash-activity-time">{formatActivityTime(item.time)}</span>
        </Link>
      ))}
    </div>
  );
}

function StatusDonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return <div className="dash-chart-body"><AdminEmptyState message="Chưa có dữ liệu trạng thái trong phạm vi đã chọn" /></div>;
  }

  return (
    <>
      <div className="dash-chart-body dash-chart-body-donut">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart margin={{ top: 16, right: 18, bottom: 18, left: 18 }}>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={3}
            >
              {data.map((item) => <Cell fill={item.color} key={item.status} />)}
            </Pie>
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              formatter={(value, _name, props) => [value, props.payload.label]}
              contentStyle={{ borderRadius: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
              wrapperStyle={{ zIndex: 30, pointerEvents: 'none' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="dash-donut-center" aria-hidden="true">
          <strong>{total}</strong>
          <span>Tổng lịch</span>
        </div>
      </div>
      <div className="dash-chart-legend">
        {data.filter((item) => item.value > 0).map((item) => (
          <div className="dash-chart-legend-item" key={item.status}>
            <span className="dash-chart-legend-dot" style={{ background: item.color }} />
            <span>{item.label}: <strong>{item.value}</strong></span>
          </div>
        ))}
      </div>
    </>
  );
}

function TimeAppointmentsChart({ data, type }) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  if (!total) {
    return <div className="dash-chart-body"><AdminEmptyState message="Chưa có lịch hẹn trong khoảng thời gian này" /></div>;
  }

  return (
    <div className="dash-chart-body dash-chart-body-trend">
      <ResponsiveContainer height="100%" width="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--gray-100)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 12, fill: 'var(--gray-500)' }} />
            <YAxis allowDecimals={false} domain={[0, (dataMax) => Math.max(4, dataMax + 1)]} tickLine={false} width={32} tick={{ fontSize: 12, fill: 'var(--gray-500)' }} />
            <Tooltip
              formatter={(value) => [value, 'Lịch hẹn']}
              contentStyle={{ borderRadius: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
            />
            <Bar dataKey="total" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="appointmentsTrendFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.26} />
                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--gray-100)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 12, fill: 'var(--gray-500)' }} />
            <YAxis allowDecimals={false} domain={[0, (dataMax) => Math.max(4, dataMax + 1)]} tickLine={false} width={32} tick={{ fontSize: 12, fill: 'var(--gray-500)' }} />
            <Tooltip
              formatter={(value) => [value, 'Lịch hẹn']}
              contentStyle={{ borderRadius: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
            />
            <Area type="monotone" dataKey="total" stroke="#0EA5E9" strokeWidth={3} fill="url(#appointmentsTrendFill)" dot={{ r: 3, fill: '#ffffff', stroke: '#0EA5E9', strokeWidth: 3 }} activeDot={{ r: 6, fill: '#0284C7', stroke: '#ffffff', strokeWidth: 3 }} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function RankingCard({ title, items, emptyMessage, type }) {
  const rankClass = (index) => {
    if (index === 0) return 'r1';
    if (index === 1) return 'r2';
    if (index === 2) return 'r3';
    return 'rn';
  };
  const placeholder = type === 'doctor'
    ? '/placeholder-doctor.svg'
    : type === 'clinic'
      ? '/placeholder-clinic.svg'
      : '/placeholder-specialty.svg';

  return (
    <div className="dash-ranking-card">
      <h2>{title}</h2>
      {items.length ? (
        <ul className="dash-ranking-list">
          {items.map((item, index) => {
            const image = entityImage(item.entity, type);
            const imageSrc = resolveMediaUrl(image, placeholder);
            return (
              <li key={item.key} className="dash-ranking-item">
                <span className={`dash-ranking-num ${rankClass(index)}`}>{index + 1}</span>
                <span className={`dash-ranking-photo dash-ranking-photo-${type}`}>
                  <span className="dash-ranking-photo-fallback">{initialsFromName(item.name)}</span>
                  <img
                    alt={item.name}
                    loading="lazy"
                    src={imageSrc}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </span>
                <span className="dash-ranking-name" title={item.name}>{item.name}</span>
                <span className="dash-ranking-count">{item.count} lịch</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <AdminEmptyState message={emptyMessage} />
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorUsers, setDoctorUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const todayKey = useMemo(() => getVietnamToday(), []);
  const [timeRange, setTimeRange] = useState('today');
  const [customFrom, setCustomFrom] = useState(todayKey);
  const [customTo, setCustomTo] = useState(todayKey);
  const [clinicFilter, setClinicFilter] = useState('all');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setError('');

    Promise.all([api('/clinics'), api('/specialties'), api('/doctors'), api('/appointments'), api('/admin/doctor-users')])
      .then(([clinicPayload, specialtyPayload, doctorPayload, appointmentPayload, doctorUserPayload]) => {
        if (!alive) return;
        setClinics(clinicPayload.data || []);
        setSpecialties(specialtyPayload.data || []);
        setDoctors(doctorPayload.data || []);
        setAppointments(appointmentPayload.data || []);
        setDoctorUsers(doctorUserPayload.data || []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || 'Không tải được dữ liệu dashboard');
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const clinicScopedAppointments = useMemo(() => appointments.filter((item) => {
    return clinicFilter === 'all' || entityKey(item.clinicId, '') === clinicFilter;
  }), [appointments, clinicFilter]);

  const currentTaskAppointments = useMemo(
    () => clinicScopedAppointments.filter((item) => taskStatuses.includes(item.status)),
    [clinicScopedAppointments]
  );

  const analyticsAppointments = useMemo(
    () => clinicScopedAppointments.filter((item) => isInDateRange(item, timeRange, customFrom, customTo)),
    [clinicScopedAppointments, timeRange, customFrom, customTo]
  );

  const statusChartData = useMemo(() => Object.entries(statusChartConfig).map(([status, config]) => ({
    status,
    ...config,
    value: statCount(analyticsAppointments, status)
  })), [analyticsAppointments]);

  const timeChart = useMemo(() => getTimeChartConfig(timeRange, analyticsAppointments, customFrom, customTo), [analyticsAppointments, timeRange, customFrom, customTo]);
  const topDoctors = useMemo(() => buildRanking(analyticsAppointments, 'doctorId', 'unknown-doctor'), [analyticsAppointments]);
  const topSpecialties = useMemo(() => buildRanking(analyticsAppointments, 'specialtyId', 'unknown-specialty'), [analyticsAppointments]);
  const topClinics = useMemo(() => buildRanking(analyticsAppointments, 'clinicId', 'unknown-clinic'), [analyticsAppointments]);

  const pendingCount = statCount(currentTaskAppointments, 'pending');
  const rescheduleRequestCount = statCount(currentTaskAppointments, 'reschedule_requested');
  const cancelRequestCount = statCount(currentTaskAppointments, 'cancel_requested');
  const analyticsPendingCount = statCount(analyticsAppointments, 'pending');
  const analyticsRescheduleRequestCount = statCount(analyticsAppointments, 'reschedule_requested');
  const analyticsCancelRequestCount = statCount(analyticsAppointments, 'cancel_requested');
  const inProgressCount = statCount(analyticsAppointments, 'in_progress');
  const noShowCount = statCount(analyticsAppointments, 'no_show');

  const actionAppointments = useMemo(
    () => currentTaskAppointments
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || fallbackAppointmentTimestamp(b) || 0) - new Date(a.updatedAt || a.createdAt || fallbackAppointmentTimestamp(a) || 0))
      .slice(0, 8),
    [currentTaskAppointments]
  );

  const recentUpdates = useMemo(() => analyticsAppointments
    .map((appointment) => {
      const meta = activityMeta(appointment);
      return {
        appointmentId: appointment._id,
        status: appointment.status,
        patientName: getName(appointment.patientId),
        doctorName: getName(appointment.doctorId),
        ...meta
      };
    })
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    .slice(0, 10), [analyticsAppointments]);

  const doctorAccountStats = useMemo(() => {
    const linkedAccounts = doctorUsers.filter((item) => item.doctorId);
    return {
      issued: linkedAccounts.length,
      unissued: Math.max(doctors.length - linkedAccounts.length, 0),
      locked: linkedAccounts.filter((item) => item.isActive === false).length
    };
  }, [doctorUsers, doctors.length]);

  const selectedScopeLabel = scopeLabel(timeRange, clinicFilter, clinics, customFrom, customTo);
  const selectedClinicLabel = clinicFilter === 'all'
    ? 'toàn hệ thống'
    : clinics.find((clinic) => clinic._id === clinicFilter)?.name || 'cơ sở đã chọn';
  const selectedTimeLabel = timeRange === 'custom'
    ? `${customFrom || '...'} - ${customTo || '...'}`
    : timeFilterOptions.find((item) => item.value === timeRange)?.label || 'Khoảng đang chọn';

  const todayStats = [
    {
      label: 'Tổng lịch',
      description: `${selectedTimeLabel} · ${selectedClinicLabel}`,
      value: analyticsAppointments.length,
      badge: selectedTimeLabel,
      tone: 'primary',
      marker: 'calendar',
      to: timeRange === 'today' ? '/admin/appointments?date=today' : '/admin/appointments'
    },
    {
      label: 'Chờ xác nhận',
      description: 'Lịch mới cần phòng khám xác nhận',
      value: analyticsPendingCount,
      badge: analyticsPendingCount ? 'Cần xử lý' : 'Ổn định',
      tone: 'warning',
      marker: 'pending',
      to: '/admin/appointments?status=pending'
    },
    {
      label: 'Yêu cầu đổi lịch',
      description: 'Bệnh nhân đang chờ phản hồi đổi lịch',
      value: analyticsRescheduleRequestCount,
      badge: analyticsRescheduleRequestCount ? 'Cần xử lý' : 'Ổn định',
      tone: 'info',
      marker: 'reschedule',
      to: '/admin/appointments?status=reschedule_requested'
    },
    {
      label: 'Yêu cầu hủy',
      description: 'Yêu cầu hủy cần được xử lý',
      value: analyticsCancelRequestCount,
      badge: analyticsCancelRequestCount ? 'Cần xử lý' : 'Ổn định',
      tone: 'danger',
      marker: 'cancel',
      to: '/admin/appointments?status=cancel_requested'
    },
    {
      label: 'Đang khám',
      description: 'Lịch trong khoảng đang ở quy trình khám',
      value: inProgressCount,
      badge: 'Theo dõi',
      tone: 'success',
      marker: 'progress',
      to: '/admin/appointments?status=in_progress'
    }
  ];

  const immediateTasks = [
    {
      label: 'Lịch chờ xác nhận',
      value: pendingCount,
      description: 'Kiểm tra lịch mới và xác nhận để bệnh nhân nhận phiếu khám.',
      to: '/admin/appointments?status=pending',
      tone: 'warning'
    },
    {
      label: 'Yêu cầu đổi lịch',
      value: rescheduleRequestCount,
      description: 'Phản hồi yêu cầu đổi ngày hoặc khung giờ khám.',
      to: '/admin/appointments?status=reschedule_requested',
      tone: 'info'
    },
    {
      label: 'Yêu cầu hủy',
      value: cancelRequestCount,
      description: 'Xử lý yêu cầu hủy và cập nhật trạng thái lịch hẹn.',
      to: '/admin/appointments?status=cancel_requested',
      tone: 'danger'
    }
  ];

  const systemInventoryStats = [
    { label: 'Tổng cơ sở', value: clinics.length, tone: 'info' },
    { label: 'Tổng bác sĩ', value: doctors.length, tone: 'primary' },
    { label: 'Tổng chuyên khoa', value: specialties.length, tone: 'cyan' },
    { label: 'Đã cấp tài khoản', value: doctorAccountStats.issued, tone: 'success' },
    { label: 'Chưa cấp tài khoản', value: doctorAccountStats.unissued, tone: 'neutral' },
    { label: 'Tài khoản bị khóa', value: doctorAccountStats.locked, tone: 'danger' }
  ];

  const quickActions = [
    { label: 'Quản lý lịch hẹn', description: 'Xem, lọc và xử lý trạng thái lịch', to: '/admin/appointments', tone: 'primary' },
    { label: 'Quản lý bác sĩ', description: 'Thông tin bác sĩ và tài khoản liên kết', to: '/admin/doctors', tone: 'info' },
    { label: 'Quản lý lịch làm việc', description: 'Ca khám, ngày nghỉ và ngoại lệ', to: '/admin/schedules', tone: 'warning' },
    { label: 'Quản lý cơ sở', description: 'Danh sách phòng khám trong hệ thống', to: '/admin/clinics', tone: 'success' }
  ];

  if (isLoading) {
    return (
      <>
        <div className="page-heading admin-page-heading">
          <div>
            <span className="eyebrow">Tổng quan</span>
            <h1 className="h3 mt-2 mb-0">Bảng điều khiển vận hành</h1>
          </div>
        </div>
        <DashboardLoading />
      </>
    );
  }

  return (
    <>
      <div className="page-heading admin-page-heading">
        <div>
          <span className="eyebrow">Tổng quan</span>
          <h1 className="h3 mt-2 mb-0">Bảng điều khiển vận hành</h1>
          <p className="text-secondary mt-1 mb-0">Theo dõi vận hành lịch khám, yêu cầu cần xử lý và dữ liệu quản trị cốt lõi.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          Không tải được dữ liệu dashboard: {error}
        </div>
      )}

      {!error && (
        <div className="admin-dashboard-page">
          <section className="dash-section-block" aria-labelledby="operations-overview-heading">
            <div className="dash-section-head dash-section-head-compact">
              <div>
                <span className="eyebrow">Vận hành</span>
                <h2 id="operations-overview-heading">Tổng quan vận hành</h2>
                <p>Theo dõi lịch khám theo ngày, tuần, tháng, quý hoặc khoảng thời gian tùy chọn. Phạm vi cơ sở: {selectedClinicLabel}.</p>
              </div>
              <div className="dash-filter-controls dash-overview-filter-controls">
                <label className="dash-filter-label">
                  <span>Khoảng thời gian</span>
                  <select className="form-select form-select-sm" value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
                    {timeFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="dash-filter-label">
                  <span>Phạm vi cơ sở</span>
                  <select className="form-select form-select-sm" value={clinicFilter} onChange={(event) => setClinicFilter(event.target.value)}>
                    <option value="all">Tất cả cơ sở</option>
                    {clinics.map((clinic) => (
                      <option key={clinic._id} value={clinic._id}>{clinic.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {timeRange === 'custom' && (
              <div className="dash-custom-range-row">
                <label className="dash-filter-label">
                  <span>Từ ngày</span>
                  <input className="form-control form-control-sm" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
                </label>
                <label className="dash-filter-label">
                  <span>Đến ngày</span>
                  <input className="form-control form-control-sm" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
                </label>
              </div>
            )}
            <div className="dash-kpi-grid dash-kpi-grid-five">
              {todayStats.map((item) => (
                <Link className={`dash-kpi-card accent-${item.tone}`} key={item.label} to={item.to}>
                  <div className={`dash-kpi-icon ${item.tone}`} aria-hidden="true">
                    <span className={`dash-kpi-marker dash-kpi-marker-${item.marker}`} />
                  </div>
                  <div className="dash-kpi-content">
                    <div className="dash-kpi-value">{item.value}</div>
                    <div className="dash-kpi-label">{item.label}</div>
                    <p>{item.description}</p>
                  </div>
                  <span className={`dash-kpi-badge dash-kpi-badge-${item.tone}`}>{item.badge}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="dash-section-card dash-task-center" aria-labelledby="task-center-heading">
            <div className="dash-section-head">
              <div>
                <span className="eyebrow">Trung tâm tác vụ</span>
                <h2 id="task-center-heading">Việc cần xử lý hiện tại</h2>
                <p>3 nhóm tác vụ thật từ lịch hẹn, theo phạm vi cơ sở đang chọn và không phụ thuộc khoảng thời gian phân tích.</p>
              </div>
            </div>
            {immediateTasks.every((item) => item.value === 0) ? (
              <div className="dash-success-note">Không có yêu cầu cần xử lý ngay trong phạm vi hiện tại.</div>
            ) : (
              <div className="dash-immediate-grid">
                {immediateTasks.map((item) => (
                  <Link className={`dash-immediate-card ${item.tone}-card`} key={item.label} to={item.to}>
                    <span className="dash-immediate-count">{item.value}</span>
                    <span className="dash-immediate-body">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <span className="dash-immediate-arrow">Xử lý</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="dash-filter-bar" aria-labelledby="analytics-filter-heading">
            <div>
              <span className="eyebrow">Phân tích</span>
              <h2 id="analytics-filter-heading">Phân tích lịch hẹn</h2>
              <p>Biểu đồ, xếp hạng và cập nhật gần đây đang dùng cùng khoảng: {selectedScopeLabel}.</p>
            </div>
          </section>

          <div className="dash-charts-grid">
            <section className="dash-chart-card" aria-labelledby="status-overview-heading">
              <div className="dash-chart-card-head">
                <div>
                  <h2 id="status-overview-heading">Trạng thái lịch hẹn</h2>
                  <p>Phân bổ trạng thái theo {selectedScopeLabel}. Không gộp yêu cầu với kết quả xử lý.</p>
                </div>
                {noShowCount > 0 && <span className="dash-attention-chip">{noShowCount} không đến khám</span>}
              </div>
              <StatusDonutChart data={statusChartData} />
            </section>

            <section className="dash-chart-card" aria-labelledby="time-trend-heading">
              <div className="dash-chart-card-head">
                <div>
                  <h2 id="time-trend-heading">Xu hướng số lịch hẹn</h2>
                  <p>{timeChart.title} · {selectedScopeLabel}</p>
                </div>
              </div>
              <TimeAppointmentsChart data={timeChart.data} type={timeChart.type} />
            </section>
          </div>

          <section className={`dash-ranking-grid ${clinicFilter !== 'all' ? 'dash-ranking-grid-two' : ''}`} aria-label="Xếp hạng theo số lịch hẹn">
            <RankingCard title="Bác sĩ có nhiều lịch nhất" type="doctor" items={topDoctors} emptyMessage="Chưa có dữ liệu bác sĩ trong phạm vi này" />
            <RankingCard title="Chuyên khoa có nhiều lịch nhất" type="specialty" items={topSpecialties} emptyMessage="Chưa có dữ liệu chuyên khoa trong phạm vi này" />
            {clinicFilter === 'all' && (
              <RankingCard title="Cơ sở có nhiều lịch nhất" type="clinic" items={topClinics} emptyMessage="Chưa có dữ liệu cơ sở trong phạm vi này" />
            )}
          </section>

          <section className="dash-section-card" aria-labelledby="action-appointments-heading">
            <div className="dash-section-head">
              <div>
                <h2 id="action-appointments-heading">Lịch hẹn cần xử lý</h2>
                <p>Danh sách ưu tiên từ trung tâm tác vụ, sắp theo cập nhật gần nhất.</p>
              </div>
              <Link className="btn btn-sm btn-outline-primary" to="/admin/appointments">Xem tất cả</Link>
            </div>
            <AppointmentMiniTable appointments={actionAppointments} emptyMessage="Không có lịch hẹn cần xử lý" showAction />
          </section>

          <section className="dash-section-card" aria-labelledby="recent-updates-heading">
            <div className="dash-section-head">
              <div>
                <h2 id="recent-updates-heading">Cập nhật lịch hẹn gần đây</h2>
                <p>Dữ liệu được suy ra từ lịch hẹn, không phải audit log hệ thống.</p>
              </div>
              <Link className="btn btn-sm btn-primary" to="/admin/appointments">Mở trang lịch hẹn</Link>
            </div>
            <AppointmentUpdatesList updates={recentUpdates} />
          </section>

          <div className="dash-lower-grid">
            <section className="dash-section-card dash-secondary-card" aria-labelledby="inventory-heading">
              <div className="dash-section-head">
                <div>
                  <h2 id="inventory-heading">Kiểm kê hệ thống</h2>
                  <p>Thông tin cấu hình hệ thống, đặt ở mức ưu tiên phụ.</p>
                </div>
              </div>
              <div className="dash-system-grid">
                {systemInventoryStats.map((item) => (
                  <div className={`dash-system-stat tone-${item.tone}`} key={item.label}>
                    <span className={`dash-system-stat-marker ${item.tone}`} aria-hidden="true" />
                    <div className="dash-system-stat-value">{item.value}</div>
                    <div className="dash-system-stat-label">{item.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="dash-section-card dash-secondary-card" aria-labelledby="quick-actions-heading">
              <div className="dash-section-head">
                <div>
                  <h2 id="quick-actions-heading">Thao tác nhanh</h2>
                  <p>Các luồng quản trị thường dùng.</p>
                </div>
              </div>
              <div className="dash-quick-actions-grid">
                {quickActions.map((item) => (
                  <Link className={`dash-quick-action ${item.tone}`} key={item.label} to={item.to}>
                    <span className="dash-quick-action-icon" aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
