import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { displayName, formatDateVN, formatQueueNumber, formatTimeSlot } from '../utils/appointmentView.js';
import { getVietnamToday } from '../utils/dateTime.js';
import { getConsultationStatusPresentation } from '../utils/status.js';
import { cleanDisplayText } from '../utils/textEncoding.js';

const ATTENTION_STATUSES = ['pending', 'cancel_requested', 'reschedule_requested'];

const statusChartConfig = {
  pending: { label: 'Chờ xác nhận', color: '#f59e0b' },
  confirmed: { label: 'Đã xác nhận', color: '#0ea5e9' },
  in_progress: { label: 'Đang khám', color: '#2563eb' },
  completed: { label: 'Hoàn thành', color: '#10b981' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
  no_show: { label: 'Không đến khám', color: '#9f1239' },
  cancel_requested: { label: 'Yêu cầu hủy', color: '#eab308' },
  reschedule_requested: { label: 'Yêu cầu đổi lịch', color: '#06b6d4' },
  reschedule_rejected: { label: 'Từ chối đổi lịch', color: '#f97316' }
};

const periodOptions = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'quarter', label: 'Quý này' },
  { key: 'custom', label: 'Tùy chọn' }
];

const taskMeta = {
  pending: {
    label: 'Lịch chờ xác nhận',
    description: 'Lịch mới cần xác nhận để đưa vào quy trình khám.',
    tone: 'warning',
    to: '/doctor/appointments?status=pending'
  },
  cancel_requested: {
    label: 'Yêu cầu hủy',
    description: 'Bệnh nhân đã gửi yêu cầu hủy lịch, cần phản hồi.',
    tone: 'danger',
    to: '/doctor/appointments?status=cancel_requested'
  },
  reschedule_requested: {
    label: 'Yêu cầu đổi lịch',
    description: 'Bệnh nhân muốn đổi ngày hoặc khung giờ khám.',
    tone: 'warning',
    to: '/doctor/appointments?status=reschedule_requested'
  },
  in_progress: {
    label: 'Đang khám cần nhập hồ sơ',
    description: 'Hoàn tất hồ sơ khám để kết thúc buổi khám.',
    tone: 'info',
    to: '/doctor/appointments'
  }
};

function doctorIdFromUser(user) {
  return user?.doctorId?._id || user?.doctorId || '';
}

function doctorNameFromUser(user) {
  return cleanDisplayText(user?.doctorId?.name || user?.name, 'Bác sĩ');
}

function patientName(appointment) {
  return cleanDisplayText(
    appointment?.patientInfo?.name || appointment?.patientId?.name,
    'Bệnh nhân'
  );
}

function shortReason(appointment) {
  return cleanDisplayText(appointment?.reason, '');
}

function reviewPatientName(review) {
  return cleanDisplayText(review?.patientId?.name || review?.patientName, 'Bệnh nhân');
}

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function toDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(value, amount) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(value) {
  const next = new Date(value);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function endOfWeek(value) {
  return addDays(startOfWeek(value), 6);
}

function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function startOfQuarter(value) {
  const firstMonth = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), firstMonth, 1);
}

function endOfQuarter(value) {
  const firstMonth = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), firstMonth + 3, 0);
}

function rangeLabel(from, to) {
  if (from === to) return formatDateVN(from);
  return `${formatDateVN(from)} - ${formatDateVN(to)}`;
}

function isDateInRange(date, from, to) {
  return date >= from && date <= to;
}

function buildPeriodRange(period, today, customFrom, customTo) {
  const todayDate = parseDateInput(today) || new Date();
  let fromDate = todayDate;
  let toDate = todayDate;

  if (period === 'yesterday') {
    fromDate = addDays(todayDate, -1);
    toDate = fromDate;
  } else if (period === 'week') {
    fromDate = startOfWeek(todayDate);
    toDate = endOfWeek(todayDate);
  } else if (period === 'month') {
    fromDate = startOfMonth(todayDate);
    toDate = endOfMonth(todayDate);
  } else if (period === 'quarter') {
    fromDate = startOfQuarter(todayDate);
    toDate = endOfQuarter(todayDate);
  } else if (period === 'custom') {
    fromDate = parseDateInput(customFrom) || todayDate;
    toDate = parseDateInput(customTo) || fromDate;
    if (fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }
  }

  const from = toDateInput(fromDate);
  const to = toDateInput(toDate);
  const focusDate = isDateInRange(today, from, to) ? today : to;

  return {
    from,
    to,
    focusDate,
    label: rangeLabel(from, to)
  };
}

function formatShortDate(value) {
  const date = parseDateInput(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

function daysBetween(from, to) {
  const fromDate = parseDateInput(from);
  const toDate = parseDateInput(to);
  if (!fromDate || !toDate) return 0;
  return Math.max(1, Math.round((toDate - fromDate) / 86400000) + 1);
}

function dateKeyFromAppointment(appointment) {
  return String(appointment?.date || '').slice(0, 10);
}

function buildTrendData(appointments, activeRange) {
  const totalDays = daysBetween(activeRange.from, activeRange.to);
  const shouldGroupByWeek = totalDays > 42;
  const start = parseDateInput(activeRange.from);
  const end = parseDateInput(activeRange.to);
  if (!start || !end) return [];

  const buckets = [];
  const current = new Date(start);
  let index = 1;

  while (current <= end) {
    const bucketStart = new Date(current);
    const bucketEnd = shouldGroupByWeek ? addDays(bucketStart, 6) : new Date(bucketStart);
    if (bucketEnd > end) bucketEnd.setTime(end.getTime());
    const from = toDateInput(bucketStart);
    const to = toDateInput(bucketEnd);
    buckets.push({
      key: shouldGroupByWeek ? `${from}-${to}` : from,
      from,
      to,
      label: shouldGroupByWeek ? `Tuần ${index}` : formatShortDate(from),
      detail: shouldGroupByWeek ? `${formatShortDate(from)} - ${formatShortDate(to)}` : formatDateVN(from),
      total: 0
    });
    current.setDate(current.getDate() + (shouldGroupByWeek ? 7 : 1));
    index += 1;
  }

  appointments.forEach((appointment) => {
    const date = dateKeyFromAppointment(appointment);
    const bucket = buckets.find((item) => date >= item.from && date <= item.to);
    if (bucket) bucket.total += 1;
  });

  return buckets;
}

function buildStatusData(appointments) {
  const counts = appointments.reduce((result, appointment) => {
    const status = appointment.status || 'pending';
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});

  return Object.entries(statusChartConfig)
    .map(([status, config]) => ({
      status,
      label: config.label,
      color: config.color,
      value: counts[status] || 0
    }))
    .filter((item) => item.value > 0);
}

function SectionError({ message, onRetry }) {
  return (
    <div className="doctor-dashboard-inline-state doctor-dashboard-inline-state-error" role="status">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

function SectionEmpty({ children }) {
  return (
    <div className="doctor-dashboard-inline-state">
      {children}
    </div>
  );
}

function ChartEmptyState({ children }) {
  return (
    <div className="doctor-dashboard-chart-empty">
      <strong>Chưa có dữ liệu</strong>
      <span>{children}</span>
    </div>
  );
}

function DoctorTrendChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  if (!total) {
    return <ChartEmptyState>Không có lịch hẹn trong khoảng đang xem.</ChartEmptyState>;
  }

  return (
    <div className="doctor-dashboard-chart-body doctor-dashboard-trend-chart">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ top: 14, right: 18, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id="doctorAppointmentsTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="8%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="92%" stopColor="#0ea5e9" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eaf2fb" vertical={false} />
          <XAxis
            dataKey="label"
            minTickGap={16}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax) => Math.max(4, dataMax + 1)]}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
            tickLine={false}
            width={32}
          />
          <Tooltip
            formatter={(value) => [value, 'Lịch khám']}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.detail || _label}
            contentStyle={{ borderRadius: 12, border: '1px solid #dbeafe', boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)', fontSize: '0.86rem' }}
          />
          <Area
            activeDot={{ r: 6, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 3 }}
            dataKey="total"
            dot={{ r: 3, fill: '#ffffff', stroke: '#0ea5e9', strokeWidth: 3 }}
            fill="url(#doctorAppointmentsTrendFill)"
            stroke="#0ea5e9"
            strokeLinecap="round"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DoctorStatusDonut({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return <ChartEmptyState>Chưa có trạng thái lịch hẹn để phân tích.</ChartEmptyState>;
  }

  return (
    <>
      <div className="doctor-dashboard-chart-body doctor-dashboard-status-donut">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              innerRadius={54}
              outerRadius={82}
              paddingAngle={4}
              stroke="#ffffff"
              strokeWidth={3}
            >
              {data.map((item) => <Cell fill={item.color} key={item.status} />)}
            </Pie>
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              formatter={(value, _name, props) => [value, props.payload.label]}
              contentStyle={{ borderRadius: 12, border: '1px solid #dbeafe', boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)', fontSize: '0.86rem' }}
              wrapperStyle={{ zIndex: 30, pointerEvents: 'none' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="doctor-dashboard-donut-center" aria-hidden="true">
          <strong>{total}</strong>
          <span>Tổng lịch</span>
        </div>
      </div>
      <div className="doctor-dashboard-chart-legend">
        {data.map((item) => (
          <span className="doctor-dashboard-chart-legend-item" key={item.status}>
            <i style={{ background: item.color }} />
            {item.label}: <strong>{item.value}</strong>
          </span>
        ))}
      </div>
    </>
  );
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const doctorId = doctorIdFromUser(user);
  const today = useMemo(() => getVietnamToday(), []);
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [coreLoading, setCoreLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [coreErrors, setCoreErrors] = useState({ appointments: '', queue: '' });
  const [reviewsError, setReviewsError] = useState('');
  const activeRange = useMemo(() => buildPeriodRange(period, today, customFrom, customTo), [period, today, customFrom, customTo]);

  async function loadCoreData() {
    if (!doctorId) {
      setCoreLoading(false);
      setCoreErrors({
        appointments: 'Tài khoản bác sĩ chưa liên kết hồ sơ bác sĩ.',
        queue: 'Tài khoản bác sĩ chưa liên kết hồ sơ bác sĩ.'
      });
      return;
    }

    setCoreLoading(true);
    const [appointmentsResult, queueResult] = await Promise.allSettled([
      api(`/doctors/${doctorId}/appointments`, { params: { fromDate: activeRange.from, toDate: activeRange.to } }),
      api('/doctor/queue/today', { params: { date: activeRange.focusDate } })
    ]);

    if (appointmentsResult.status === 'fulfilled') {
      setAppointments(appointmentsResult.value?.data || []);
    } else {
      setAppointments([]);
    }

    if (queueResult.status === 'fulfilled') {
      setQueue(queueResult.value?.data || []);
    } else {
      setQueue([]);
    }

    setCoreErrors({
      appointments: appointmentsResult.status === 'rejected'
        ? appointmentsResult.reason?.message || 'Không tải được lịch hẹn trong khoảng đã chọn.'
        : '',
      queue: queueResult.status === 'rejected'
        ? queueResult.reason?.message || 'Không tải được hàng đợi của ngày đang xem.'
        : ''
    });
    setCoreLoading(false);
  }

  async function loadReviews() {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const payload = await api('/doctor/reviews', {
        params: { page: 1, limit: 3, sort: 'newest' }
      });
      setReviews(payload?.data?.reviews || []);
    } catch (error) {
      setReviews([]);
      setReviewsError(error.message || 'Không tải được đánh giá gần đây.');
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      await loadCoreData();
      if (!active) return;
    }

    load();
    return () => {
      active = false;
    };
  }, [doctorId, activeRange.from, activeRange.to, activeRange.focusDate]);

  useEffect(() => {
    let active = true;

    async function load() {
      await loadReviews();
      if (!active) return;
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const waiting = appointments.filter((item) => item.status === 'confirmed').length;
    const inProgress = appointments.filter((item) => item.status === 'in_progress').length;
    const completed = appointments.filter((item) => item.status === 'completed').length;
    const needsAttention = appointments.filter((item) => ATTENTION_STATUSES.includes(item.status)).length;

    return {
      total: appointments.length,
      waiting,
      inProgress,
      completed,
      needsAttention
    };
  }, [appointments]);

  const kpis = [
    {
      key: 'total',
      label: 'Tổng lịch',
      value: summary.total,
      description: 'Tất cả lịch trong khoảng đang xem',
      to: `/doctor/appointments?fromDate=${activeRange.from}&toDate=${activeRange.to}`,
      tone: 'primary',
      unavailable: Boolean(coreErrors.appointments)
    },
    {
      key: 'waiting',
      label: 'Đã xác nhận',
      value: summary.waiting,
      description: 'Lịch đã sẵn sàng cho buổi khám',
      to: `/doctor/appointments?status=confirmed&fromDate=${activeRange.from}&toDate=${activeRange.to}`,
      tone: 'warning',
      unavailable: Boolean(coreErrors.appointments)
    },
    {
      key: 'in-progress',
      label: 'Đang khám',
      value: summary.inProgress,
      description: 'Ca khám đang được xử lý',
      to: `/doctor/appointments?status=in_progress&fromDate=${activeRange.from}&toDate=${activeRange.to}`,
      tone: 'info',
      unavailable: Boolean(coreErrors.appointments)
    },
    {
      key: 'completed',
      label: 'Hoàn thành',
      value: summary.completed,
      description: 'Buổi khám đã kết thúc',
      to: `/doctor/appointments?status=completed&fromDate=${activeRange.from}&toDate=${activeRange.to}`,
      tone: 'success',
      unavailable: Boolean(coreErrors.appointments)
    },
    {
      key: 'attention',
      label: 'Cần xử lý',
      value: summary.needsAttention,
      description: 'Xác nhận, hủy hoặc đổi lịch',
      to: `/doctor/appointments?fromDate=${activeRange.from}&toDate=${activeRange.to}`,
      tone: 'danger',
      unavailable: Boolean(coreErrors.appointments)
    }
  ];

  const nextPatients = useMemo(() => {
    const inProgress = queue.filter((item) => item.consultationStatus === 'in_progress');
    const waiting = queue.filter((item) => (item.consultationStatus || 'waiting') === 'waiting');
    return [...inProgress, ...waiting].slice(0, 5);
  }, [queue]);

  const tasks = useMemo(() => {
    const counts = {
      pending: appointments.filter((item) => item.status === 'pending').length,
      cancel_requested: appointments.filter((item) => item.status === 'cancel_requested').length,
      reschedule_requested: appointments.filter((item) => item.status === 'reschedule_requested').length,
      in_progress: appointments.filter((item) => item.status === 'in_progress').length
    };

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({ key, count, ...taskMeta[key] }));
  }, [appointments]);

  const trendData = useMemo(() => buildTrendData(appointments, activeRange), [appointments, activeRange]);
  const statusData = useMemo(() => buildStatusData(appointments), [appointments]);

  const periodLabel = activeRange.label;
  const queueDateLabel = formatDateVN(activeRange.focusDate);

  return (
    <div className="doctor-page doctor-dashboard-page">
      <section className="doctor-dashboard-header" aria-labelledby="doctor-dashboard-title">
        <div className="doctor-dashboard-header-copy">
          <p className="doctor-page-eyebrow">Khu vực bác sĩ</p>
          <h1 className="doctor-page-title" id="doctor-dashboard-title">Tổng quan lịch khám</h1>
          <p className="doctor-page-subtitle">
            Theo dõi lịch khám, hàng đợi và các việc cần xử lý theo ngày, tuần, tháng hoặc quý.
          </p>
        </div>
        <div className="doctor-dashboard-header-side">
          <div className="doctor-dashboard-period-filter" aria-label="Chọn khoảng thời gian tổng quan">
            <label>
              <span>Khoảng xem</span>
              <select className="form-select" value={period} onChange={(event) => setPeriod(event.target.value)}>
                {periodOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </label>
            {period === 'custom' && (
              <div className="doctor-dashboard-custom-range">
                <label>
                  <span>Từ ngày</span>
                  <input className="form-control" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
                </label>
                <label>
                  <span>Đến ngày</span>
                  <input className="form-control" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
                </label>
              </div>
            )}
          </div>
          <div className="doctor-dashboard-header-meta" aria-label={`Khoảng thời gian ${periodLabel}`}>
            <span>{periodOptions.find((option) => option.key === period)?.label || 'Khoảng xem'}</span>
            <strong>{periodLabel}</strong>
            <small>{doctorNameFromUser(user)}</small>
          </div>
        </div>
      </section>

      <section className="doctor-dashboard-kpis" aria-label={`Tóm tắt lịch khám ${periodLabel}`}>
        {coreLoading ? (
          Array.from({ length: 5 }, (_, index) => (
            <div className="doctor-dashboard-kpi doctor-dashboard-skeleton" key={index} aria-hidden="true" />
          ))
        ) : (
          kpis.map((item) => (
            <Link className={`doctor-dashboard-kpi doctor-dashboard-kpi-${item.tone}`} key={item.key} to={item.to}>
              <span>{item.label}</span>
              <strong>{item.unavailable ? '—' : item.value}</strong>
              <small>{item.unavailable ? 'Chưa tải được dữ liệu' : item.description}</small>
            </Link>
          ))
        )}
      </section>

      <section className="doctor-dashboard-analytics" aria-labelledby="doctor-dashboard-analytics-title">
        <div className="doctor-dashboard-section-header">
          <div>
            <p className="doctor-dashboard-section-eyebrow">Phân tích</p>
            <h2 id="doctor-dashboard-analytics-title">Hiệu suất lịch khám</h2>
          </div>
          <span className="doctor-dashboard-range-chip">{periodLabel}</span>
        </div>

        {coreErrors.appointments && <SectionError message={coreErrors.appointments} onRetry={loadCoreData} />}

        {coreLoading && (
          <div className="doctor-dashboard-analytics-grid" aria-hidden="true">
            <div className="doctor-dashboard-chart-card doctor-dashboard-chart-skeleton" />
            <div className="doctor-dashboard-chart-card doctor-dashboard-chart-skeleton compact" />
          </div>
        )}

        {!coreLoading && !coreErrors.appointments && (
          <div className="doctor-dashboard-analytics-grid">
            <article className="doctor-dashboard-chart-card doctor-dashboard-trend-card">
              <div className="doctor-dashboard-chart-head">
                <div>
                  <h3>Xu hướng số lịch</h3>
                  <p>Theo dõi lượng lịch phát sinh trong khoảng đang xem.</p>
                </div>
                <strong>{summary.total}</strong>
              </div>
              <DoctorTrendChart data={trendData} />
            </article>

            <article className="doctor-dashboard-chart-card doctor-dashboard-status-card">
              <div className="doctor-dashboard-chart-head">
                <div>
                  <h3>Phân bổ trạng thái</h3>
                  <p>Tỷ trọng các trạng thái lịch cần theo dõi.</p>
                </div>
              </div>
              <DoctorStatusDonut data={statusData} />
            </article>
          </div>
        )}
      </section>

      <div className="doctor-dashboard-main-grid">
        <section className="doctor-dashboard-panel doctor-dashboard-queue" aria-labelledby="doctor-dashboard-queue-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Hàng đợi {queueDateLabel}</p>
              <h2 id="doctor-dashboard-queue-title">Bệnh nhân tiếp theo</h2>
            </div>
            <Link to="/doctor/queue">Xem toàn bộ hàng đợi</Link>
          </div>

          {coreErrors.queue && <SectionError message={coreErrors.queue} onRetry={loadCoreData} />}

          {coreLoading && (
            <div className="doctor-dashboard-list-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}

          {!coreLoading && !coreErrors.queue && nextPatients.length === 0 && (
            <SectionEmpty>Chưa có bệnh nhân trong hàng đợi ngày {queueDateLabel}.</SectionEmpty>
          )}

          {!coreLoading && !coreErrors.queue && nextPatients.length > 0 && (
            <div className="doctor-dashboard-queue-list">
              {nextPatients.map((appointment) => {
                const consultation = getConsultationStatusPresentation(appointment.consultationStatus || 'waiting');
                const reason = shortReason(appointment);
                return (
                  <article className="doctor-dashboard-queue-row" key={appointment._id}>
                    <div className="doctor-dashboard-queue-number">
                      <span>STT</span>
                      <strong>{formatQueueNumber(appointment.queueNumber) || '--'}</strong>
                    </div>
                    <div className="doctor-dashboard-queue-info">
                      <div>
                        <h3>{patientName(appointment)}</h3>
                        <span className={consultation.badgeClass}>{consultation.label}</span>
                      </div>
                      <p>{formatTimeSlot(appointment.timeSlot)}{reason ? ` · ${reason}` : ''}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="doctor-dashboard-panel doctor-dashboard-task-center" aria-labelledby="doctor-dashboard-task-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Cần chú ý</p>
              <h2 id="doctor-dashboard-task-title">Task Center</h2>
            </div>
          </div>

          {coreErrors.appointments && <SectionError message={coreErrors.appointments} onRetry={loadCoreData} />}

          {coreLoading && (
            <div className="doctor-dashboard-list-skeleton compact" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}

          {!coreLoading && !coreErrors.appointments && tasks.length === 0 && (
            <SectionEmpty>Không có việc cần xử lý ngay.</SectionEmpty>
          )}

          {!coreLoading && !coreErrors.appointments && tasks.length > 0 && (
            <div className="doctor-dashboard-task-list">
              {tasks.map((task) => (
                <Link className={`doctor-dashboard-task doctor-dashboard-task-${task.tone}`} key={task.key} to={task.to}>
                  <div>
                    <span>{task.label}</span>
                    <p>{task.description}</p>
                  </div>
                  <strong>{task.count}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="doctor-dashboard-secondary-grid">
        <section className="doctor-dashboard-panel doctor-dashboard-reviews" aria-labelledby="doctor-dashboard-reviews-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Phản hồi bệnh nhân</p>
              <h2 id="doctor-dashboard-reviews-title">Đánh giá gần đây</h2>
            </div>
            <Link to="/doctor/reviews">Xem tất cả đánh giá</Link>
          </div>

          {reviewsLoading && (
            <div className="doctor-dashboard-list-skeleton compact" aria-hidden="true">
              <span />
              <span />
            </div>
          )}

          {!reviewsLoading && reviewsError && (
            <SectionError message="Tạm thời chưa tải được đánh giá gần đây." onRetry={loadReviews} />
          )}

          {!reviewsLoading && !reviewsError && reviews.length === 0 && (
            <SectionEmpty>Chưa có đánh giá mới.</SectionEmpty>
          )}

          {!reviewsLoading && !reviewsError && reviews.length > 0 && (
            <div className="doctor-dashboard-review-list">
              {reviews.map((review) => (
                <article className="doctor-dashboard-review" key={review._id}>
                  <div>
                    <strong>{'★'.repeat(Number(review.rating || 0)) || 'Chưa chấm điểm'}</strong>
                    <span>{reviewPatientName(review)} · {formatDateTime(review.createdAt)}</span>
                  </div>
                  {review.comment && <p>{cleanDisplayText(review.comment)}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="doctor-dashboard-panel doctor-dashboard-quick-actions" aria-labelledby="doctor-dashboard-actions-title">
          <div className="doctor-dashboard-section-header">
            <div>
              <p className="doctor-dashboard-section-eyebrow">Truy cập nhanh</p>
              <h2 id="doctor-dashboard-actions-title">Thao tác thường dùng</h2>
            </div>
          </div>

          <div className="doctor-dashboard-action-grid">
            <Link to="/doctor/queue">
              <span aria-hidden="true">01</span>
              <strong>Hàng đợi khám</strong>
              <small>Theo dõi bệnh nhân đang chờ và đang khám.</small>
            </Link>
            <Link to="/doctor/appointments">
              <span aria-hidden="true">02</span>
              <strong>Xử lý lịch hẹn</strong>
              <small>Xác nhận, hủy, đổi lịch và nhập hồ sơ.</small>
            </Link>
            <Link to="/doctor/schedules">
              <span aria-hidden="true">03</span>
              <strong>Lịch làm việc</strong>
              <small>Cập nhật lịch mặc định và ngoại lệ.</small>
            </Link>
            <Link to="/doctor/medical-records?followUpOnly=true">
              <span aria-hidden="true">04</span>
              <strong>Theo dõi tái khám</strong>
              <small>Xem các hồ sơ có kế hoạch tái khám.</small>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
