import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client.js';
import { getStatusBadge } from '../../utils/status.js';
import { AdminEmptyState, getName } from './adminUtils.jsx';

const statusChartConfig = {
  pending: { label: 'Chờ xác nhận', color: '#f59e0b' },
  confirmed: { label: 'Đã xác nhận', color: '#22c55e' },
  completed: { label: 'Hoàn thành', color: '#2563eb' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
  no_show: { label: 'Không đến khám', color: '#9f1239' },
  cancel_requested: { label: 'Yêu cầu hủy', color: '#eab308' },
  reschedule_requested: { label: 'Yêu cầu đổi lịch', color: '#06b6d4' }
};

const timeFilterOptions = [
  { value: '7d', label: '7 ngày gần nhất' },
  { value: '30d', label: '30 ngày gần nhất' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'this_quarter', label: 'Quý này' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'all', label: 'Toàn bộ' }
];

const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function parseAppointmentDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
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

function getDateRange(range) {
  const today = startOfToday();
  const end = new Date(today);

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

  return { start: null, end: null };
}

function isInDateRange(appointment, range) {
  if (range === 'all') return true;
  const date = parseAppointmentDate(appointment.date);
  if (!date) return false;
  const { start, end } = getDateRange(range);
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

function getTimeChartConfig(range, appointments) {
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
    return { type: 'bar', title: 'Lịch hẹn theo tháng trong năm', data: buckets };
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
    return { type: 'bar', title: 'Lịch hẹn theo tháng trong quý', data: buckets };
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
      title: 'Lịch hẹn theo tháng',
      data: Array.from(byMonth.values()).sort((a, b) => a.key.localeCompare(b.key))
    };
  }

  const { start, end } = getDateRange(range);
  const buckets = buildDayBuckets(start, end);
  const bucketMap = new Map(buckets.map((item) => [item.key, item]));
  appointments.forEach((appointment) => {
    const bucket = bucketMap.get(appointment.date);
    if (bucket) bucket.total += 1;
  });

  return {
    type: 'line',
    title: range === 'this_month' ? 'Lịch hẹn theo ngày trong tháng' : 'Lịch hẹn theo ngày',
    data: buckets
  };
}

function isToday(date) {
  return date === new Date().toISOString().slice(0, 10);
}

function statCount(appointments, status) {
  return appointments.filter((item) => item.status === status).length;
}

function percentage(part, total) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function entityKey(value, fallback) {
  if (!value) return fallback;
  return typeof value === 'object' ? value._id || fallback : value;
}

function buildRanking(appointments, field, fallbackName) {
  const map = new Map();
  appointments.forEach((appointment) => {
    const value = appointment[field];
    const key = entityKey(value, fallbackName);
    const name = getName(value);
    const current = map.get(key) || { key, name, count: 0 };
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

function activityMeta(appointment) {
  const patientName = getName(appointment.patientId);
  const doctorName = getName(appointment.doctorId);

  if (appointment.status === 'confirmed') {
    return {
      icon: '✓',
      tone: 'success',
      action: `${patientName} có lịch đã được xác nhận với ${doctorName}`,
      time: appointment.updatedAt || appointment.createdAt
    };
  }

  if (appointment.status === 'cancelled') {
    return {
      icon: '×',
      tone: 'danger',
      action: `${patientName} có lịch đã hủy với ${doctorName}`,
      time: appointment.cancelRequest?.handledAt || appointment.updatedAt || appointment.createdAt
    };
  }

  if (appointment.status === 'cancel_requested') {
    return {
      icon: '↩',
      tone: 'warning',
      action: `${patientName} đã gửi yêu cầu hủy lịch với ${doctorName}`,
      time: appointment.cancelRequest?.requestedAt || appointment.updatedAt || appointment.createdAt
    };
  }

  if (appointment.status === 'reschedule_requested') {
    return {
      icon: '↻',
      tone: 'info',
      action: `${patientName} đã gửi yêu cầu đổi lịch với ${doctorName}`,
      time: appointment.rescheduleRequest?.requestedAt || appointment.updatedAt || appointment.createdAt
    };
  }

  if (appointment.status === 'completed') {
    return {
      icon: '✓',
      tone: 'primary',
      action: `${patientName} đã hoàn thành lịch khám với ${doctorName}`,
      time: appointment.updatedAt || appointment.createdAt
    };
  }

  return {
    icon: '+',
    tone: 'neutral',
    action: `${patientName} đã đặt lịch với ${doctorName}`,
    time: appointment.createdAt || appointment.updatedAt
  };
}

function AppointmentMiniTable({ appointments, compactEmpty = false, emptyMessage, showAction = false }) {
  if (!appointments.length) {
    return (
      <div className="empty-state empty-state-compact">
        <div className="empty-state-icon">📅</div>
        <h3 className="empty-state-title">{emptyMessage || 'Không có dữ liệu'}</h3>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="dash-mini-table">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Giờ</th>
            <th>Bệnh nhân</th>
            <th>Bác sĩ</th>
            <th>Cơ sở</th>
            <th>Trạng thái</th>
            {showAction && <th></th>}
          </tr>
        </thead>
        <tbody>
          {appointments.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <tr key={item._id}>
                <td style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{item.date}</td>
                <td style={{ color: 'var(--color-primary-dark)', fontWeight: 600 }}>{item.timeSlot}</td>
                <td>{getName(item.patientId)}</td>
                <td>{getName(item.doctorId)}</td>
                <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{getName(item.clinicId)}</td>
                <td><span className={badge.className}>{badge.label}</span></td>
                {showAction && (
                  <td style={{ textAlign: 'right' }}>
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

function ActivityFeed({ activities }) {
  if (!activities.length) {
    return (
      <div className="empty-state empty-state-compact">
        <div className="empty-state-icon">📊</div>
        <h3 className="empty-state-title">Chưa có hoạt động gần đây</h3>
      </div>
    );
  }

  return (
    <div className="dash-activity-feed">
      {activities.map((item) => (
        <div className="dash-activity-item" key={`${item.appointmentId}-${item.time}-${item.action}`}>
          <div className={`dash-activity-icon ${item.tone}`}>{item.icon}</div>
          <div className="dash-activity-content">
            <p className="dash-activity-action">{item.action}</p>
            <p className="dash-activity-meta">{item.patientName} · {item.doctorName}</p>
          </div>
          <span className="dash-activity-time">{formatActivityTime(item.time)}</span>
        </div>
      ))}
    </div>
  );
}

function StatusDonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return (
      <div className="empty-state empty-state-compact">
        <div className="empty-state-icon">📊</div>
        <h3 className="empty-state-title">Chưa có dữ liệu trạng thái</h3>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer height={220} width="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={3}>
            {data.map((item) => <Cell fill={item.color} key={item.status} />)}
          </Pie>
          <Tooltip
            formatter={(value, _name, props) => [value, props.payload.label]}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="dash-chart-legend">
        {data.map((item) => (
          <div className="dash-chart-legend-item" key={item.status}>
            <span className="dash-chart-legend-dot" style={{ background: item.color }} />
            <span>{item.label}: <strong>{item.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeAppointmentsChart({ data, type }) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  if (!total) {
    return (
      <div className="empty-state empty-state-compact">
        <div className="empty-state-icon">📈</div>
        <h3 className="empty-state-title">Chưa có lịch hẹn trong khoảng thời gian này</h3>
      </div>
    );
  }

  return (
    <ResponsiveContainer height={220} width="100%">
      {type === 'bar' ? (
        <BarChart data={data}>
          <CartesianGrid stroke="var(--gray-100)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 12, fill: 'var(--gray-400)' }} />
          <YAxis allowDecimals={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: 'var(--gray-400)' }} />
          <Tooltip
            formatter={(value) => [value, 'Lịch hẹn']}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
          />
          <Bar dataKey="total" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data}>
          <CartesianGrid stroke="var(--gray-100)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 12, fill: 'var(--gray-400)' }} />
          <YAxis allowDecimals={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: 'var(--gray-400)' }} />
          <Tooltip
            formatter={(value) => [value, 'Lịch hẹn']}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
          />
          <Line type="monotone" dataKey="total" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 3, fill: '#0284C7' }} activeDot={{ r: 6 }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

function RankingCard({ title, items, emptyMessage }) {
  const rankClass = (index) => {
    if (index === 0) return 'r1';
    if (index === 1) return 'r2';
    if (index === 2) return 'r3';
    return 'rn';
  };

  return (
    <div className="dash-ranking-card">
      <h2>{title}</h2>
      {items.length ? (
        <ul className="dash-ranking-list">
          {items.map((item, index) => (
            <li key={item.key} className="dash-ranking-item">
              <span className={`dash-ranking-num ${rankClass(index)}`}>{index + 1}</span>
              <span className="dash-ranking-name" title={item.name}>{item.name}</span>
              <span className="dash-ranking-count">{item.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state empty-state-compact">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">{emptyMessage}</h3>
        </div>
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
  const [timeRange, setTimeRange] = useState('30d');
  const [clinicFilter, setClinicFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/clinics'), api('/specialties'), api('/doctors'), api('/appointments'), api('/admin/doctor-users')])
      .then(([clinicPayload, specialtyPayload, doctorPayload, appointmentPayload, doctorUserPayload]) => {
        setClinics(clinicPayload.data || []);
        setSpecialties(specialtyPayload.data || []);
        setDoctors(doctorPayload.data || []);
        setAppointments(appointmentPayload.data || []);
        setDoctorUsers(doctorUserPayload.data || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  const filteredAppointments = useMemo(() => appointments.filter((item) => {
    const matchesTime = isInDateRange(item, timeRange);
    const matchesClinic = clinicFilter === 'all' || entityKey(item.clinicId, '') === clinicFilter;
    return matchesTime && matchesClinic;
  }), [appointments, clinicFilter, timeRange]);

  const actionAppointments = useMemo(
    () => filteredAppointments.filter((item) => ['pending', 'cancel_requested', 'reschedule_requested'].includes(item.status)).slice(0, 8),
    [filteredAppointments]
  );

  const recentAppointments = useMemo(() => filteredAppointments.slice(0, 8), [filteredAppointments]);

  const activities = useMemo(() => filteredAppointments
    .map((appointment) => {
      const meta = activityMeta(appointment);
      return {
        appointmentId: appointment._id,
        patientName: getName(appointment.patientId),
        doctorName: getName(appointment.doctorId),
        ...meta
      };
    })
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    .slice(0, 10), [filteredAppointments]);

  const statusChartData = useMemo(() => Object.entries(statusChartConfig).map(([status, config]) => ({
    status,
    ...config,
    value: statCount(filteredAppointments, status)
  })), [filteredAppointments]);

  const timeChart = useMemo(() => getTimeChartConfig(timeRange, filteredAppointments), [filteredAppointments, timeRange]);

  const topDoctors = useMemo(() => buildRanking(filteredAppointments, 'doctorId', 'unknown-doctor'), [filteredAppointments]);
  const topSpecialties = useMemo(() => buildRanking(filteredAppointments, 'specialtyId', 'unknown-specialty'), [filteredAppointments]);
  const topClinics = useMemo(() => buildRanking(filteredAppointments, 'clinicId', 'unknown-clinic'), [filteredAppointments]);

  const clinicScopedAppointments = useMemo(() => appointments.filter((item) => {
    return clinicFilter === 'all' || entityKey(item.clinicId, '') === clinicFilter;
  }), [appointments, clinicFilter]);

  const thisMonthAppointments = useMemo(
    () => clinicScopedAppointments.filter((item) => isInDateRange(item, 'this_month')),
    [clinicScopedAppointments]
  );

  const pendingCount = statCount(filteredAppointments, 'pending');
  const rescheduleRequestCount = statCount(filteredAppointments, 'reschedule_requested');
  const cancelRequestCount = statCount(filteredAppointments, 'cancel_requested');
  const completedCount = statCount(filteredAppointments, 'completed');
  const cancelledCount = statCount(filteredAppointments, 'cancelled');
  const noShowCount = statCount(filteredAppointments, 'no_show');
  const doctorAccountStats = useMemo(() => {
    const linkedAccounts = doctorUsers.filter((item) => item.doctorId);
    return {
      issued: linkedAccounts.length,
      unissued: Math.max(doctors.length - linkedAccounts.length, 0),
      temporary: linkedAccounts.filter((item) => item.mustChangePassword && item.isActive !== false).length,
      locked: linkedAccounts.filter((item) => item.isActive === false).length
    };
  }, [doctorUsers, doctors.length]);

  const priorityStats = [
    {
      label: 'Lịch hôm nay',
      description: 'Các lịch khám cần theo dõi trong ngày',
      value: filteredAppointments.filter((item) => isToday(item.date)).length,
      icon: '📅',
      tone: 'cyan',
      to: '/admin/appointments?date=today'
    },
    {
      label: 'Chờ xác nhận',
      description: 'Lịch mới cần phòng khám xác nhận',
      value: pendingCount,
      icon: '⌛',
      tone: 'warning',
      to: '/admin/appointments?status=pending'
    },
    {
      label: 'Yêu cầu đổi lịch',
      description: 'Bệnh nhân đang chờ phản hồi đổi lịch',
      value: rescheduleRequestCount,
      icon: '↻',
      tone: 'info',
      to: '/admin/appointments?status=reschedule_requested'
    },
    {
      label: 'Yêu cầu hủy',
      description: 'Yêu cầu hủy cần được xử lý',
      value: cancelRequestCount,
      icon: '↩',
      tone: 'danger',
      to: '/admin/appointments?status=cancel_requested'
    }
  ];

  const immediateTasks = [
    { label: 'lịch chờ xác nhận', value: pendingCount, to: '/admin/appointments?status=pending', tone: 'warning' },
    { label: 'yêu cầu đổi lịch', value: rescheduleRequestCount, to: '/admin/appointments?status=reschedule_requested', tone: 'info' },
    { label: 'yêu cầu hủy', value: cancelRequestCount, to: '/admin/appointments?status=cancel_requested', tone: 'danger' }
  ];

  const systemOverviewStats = [
    { label: 'Lịch tháng này', value: thisMonthAppointments.length, icon: 'TH', tone: 'neutral' },
    { label: 'Tỷ lệ hoàn thành', value: percentage(completedCount, filteredAppointments.length), icon: '✓', tone: 'primary' },
    { label: 'Tỷ lệ hủy', value: percentage(cancelledCount, filteredAppointments.length), icon: '×', tone: 'danger' },
    { label: 'Không đến khám', value: noShowCount, icon: '!', tone: 'danger' },
    { label: 'Tổng bác sĩ', value: doctors.length, icon: 'BS', tone: 'primary' },
    { label: 'Đã cấp tài khoản', value: doctorAccountStats.issued, icon: 'TK', tone: 'info' },
    { label: 'Chưa cấp tài khoản', value: doctorAccountStats.unissued, icon: '—', tone: 'neutral' },
    { label: 'Chưa đổi mật khẩu lần đầu', value: doctorAccountStats.temporary, icon: 'MK', tone: 'warning' },
    { label: 'Đang bị khóa', value: doctorAccountStats.locked, icon: 'K', tone: 'danger' },
    { label: 'Tổng chuyên khoa', value: specialties.length, icon: 'CK', tone: 'cyan' },
    { label: 'Tổng cơ sở', value: clinics.length, icon: 'CS', tone: 'info' }
  ];

  const quickActions = [
    { label: 'Thêm bác sĩ', to: '/admin/doctors', icon: '+' },
    { label: 'Thêm chuyên khoa', to: '/admin/specialties', icon: '+' },
    { label: 'Thêm lịch làm việc', to: '/admin/schedules', icon: '+' },
    { label: 'Xem lịch hẹn', to: '/admin/appointments', icon: '→' }
  ];

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-heading admin-page-heading">
        <div>
          <span className="eyebrow">Tổng quan</span>
          <h1 className="h3 mt-2 mb-0">Dashboard vận hành</h1>
          <p className="text-secondary mt-1 mb-0">Theo dõi và vận hành hệ thống đặt lịch khám.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* ── KPI Cards ── */}
      <div className="dash-kpi-grid">
        {priorityStats.map((item) => (
          <Link
            className={`dash-kpi-card accent-${item.tone === 'warning' ? 'amber' : item.tone === 'info' ? 'cyan' : item.tone === 'danger' ? 'red' : 'violet'}`}
            key={item.label}
            to={item.to}
          >
            <div className={`dash-kpi-icon ${item.tone === 'warning' ? 'amber' : item.tone === 'info' ? 'cyan' : item.tone === 'danger' ? 'red' : 'violet'}`}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dash-kpi-value">{item.value}</div>
              <div className="dash-kpi-label">{item.label}</div>
            </div>
            {item.value > 0 && <span className="dash-kpi-badge">Mới</span>}
          </Link>
        ))}
      </div>

      {/* ── Immediate Tasks + Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="dash-section-card">
          <div className="dash-section-head">
            <div>
              <h2>Cần xử lý ngay</h2>
              <p>Các công việc vận hành cần ưu tiên.</p>
            </div>
          </div>
          {immediateTasks.every((item) => item.value === 0) ? (
            <div style={{ padding: '12px 0', color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 600 }}>
              ✓ Không có công việc cần xử lý ngay
            </div>
          ) : (
            <div className="dash-immediate-grid">
              {immediateTasks.map((item) => (
                <Link
                  className={`dash-immediate-card ${item.tone === 'warning' ? 'amber-card' : item.tone === 'info' ? 'info-card' : 'red-card'}`}
                  key={item.label}
                  to={item.to}
                >
                  <span className="dash-immediate-count">{item.value}</span>
                  <span className="dash-immediate-label">{item.label}</span>
                  <span className="dash-immediate-arrow">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="dash-section-card">
          <div className="dash-section-head">
            <div>
              <h2>Thao tác nhanh</h2>
              <p>Đi tới các luồng quản trị thường dùng.</p>
            </div>
          </div>
          <div className="dash-quick-actions-grid">
            {quickActions.map((item) => (
              <Link className="dash-quick-action" key={item.label} to={item.to}>
                <span className="dash-quick-action-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Analytics Filter ── */}
      <div className="dash-filter-bar">
        <div>
          <h2>Analytics</h2>
          <p>KPI, biểu đồ và xếp hạng theo bộ lọc bên dưới.</p>
        </div>
        <div className="dash-filter-controls">
          <label className="dash-filter-label">
            <span>Thời gian</span>
            <select className="form-select form-select-sm" value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
              {timeFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="dash-filter-label">
            <span>Cơ sở</span>
            <select className="form-select form-select-sm" value={clinicFilter} onChange={(event) => setClinicFilter(event.target.value)}>
              <option value="all">Tất cả cơ sở</option>
              {clinics.map((clinic) => (
                <option key={clinic._id} value={clinic._id}>{clinic.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="dash-charts-grid">
        <div className="dash-chart-card">
          <div className="dash-chart-card-head">
            <div>
              <h2>Trạng thái lịch hẹn</h2>
              <p>Tỷ lệ phân bổ theo trạng thái vận hành.</p>
            </div>
          </div>
          <StatusDonutChart data={statusChartData} />
        </div>

        <div className="dash-chart-card">
          <div className="dash-chart-card-head">
            <div>
              <h2>Lịch hẹn theo thời gian</h2>
              <p>{timeChart.title}</p>
            </div>
          </div>
          <TimeAppointmentsChart data={timeChart.data} type={timeChart.type} />
        </div>
      </div>

      {/* ── Rankings ── */}
      <div className="dash-ranking-grid">
        <RankingCard title="Top bác sĩ" items={topDoctors} emptyMessage="Chưa có dữ liệu" />
        <RankingCard title="Top chuyên khoa" items={topSpecialties} emptyMessage="Chưa có dữ liệu" />
        <RankingCard title="Top cơ sở" items={topClinics} emptyMessage="Chưa có dữ liệu" />
      </div>

      {/* ── System Overview ── */}
      <div className="dash-section-card">
        <div className="dash-section-head">
          <div>
            <h2>Tổng quan hệ thống</h2>
            <p>Các chỉ số vận hành và tài khoản bác sĩ.</p>
          </div>
        </div>
        <div className="dash-system-grid">
          {systemOverviewStats.map((item) => (
            <div className="dash-system-stat" key={item.label}>
              <div className={`dash-system-stat-icon ds-stat-icon ${item.tone === 'primary' ? 'sky' : item.tone === 'info' ? 'cyan' : item.tone === 'warning' ? 'amber' : item.tone === 'danger' ? 'red' : 'gray'}`}>
                {item.icon}
              </div>
              <div className="dash-system-stat-value">{item.value}</div>
              <div className="dash-system-stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Action Appointments ── */}
      <div className="dash-section-card">
        <div className="dash-section-head">
          <div>
            <h2>Lịch hẹn cần xử lý</h2>
            <p>Ưu tiên các lịch chờ xác nhận, yêu cầu hủy và đổi lịch.</p>
          </div>
          <Link className="btn btn-sm btn-outline-primary" to="/admin/appointments">Xem tất cả</Link>
        </div>
        <AppointmentMiniTable appointments={actionAppointments} compactEmpty emptyMessage="Không có lịch hẹn cần xử lý" showAction />
      </div>

      {/* ── Activity Feed + Recent Appointments ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="dash-section-card" style={{ margin: 0 }}>
          <div className="dash-section-head">
            <div>
              <h2>Hoạt động gần đây</h2>
              <p>Theo dõi các thay đổi mới nhất.</p>
            </div>
          </div>
          <ActivityFeed activities={activities} />
        </div>

        <div className="dash-section-card" style={{ margin: 0 }}>
          <div className="dash-section-head">
            <div>
              <h2>Lịch hẹn gần đây</h2>
              <p>8 lịch mới nhất trong hệ thống.</p>
            </div>
            <Link className="btn btn-sm btn-primary" to="/admin/appointments">Xem tất cả</Link>
          </div>
          <AppointmentMiniTable appointments={recentAppointments} emptyMessage="Chưa có lịch hẹn nào" />
        </div>
      </div>
    </>
  );
}
