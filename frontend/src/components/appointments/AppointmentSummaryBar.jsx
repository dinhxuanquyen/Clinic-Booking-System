const METRICS = [
  { key: 'upcoming', label: 'Lịch sắp tới', hint: 'Cần theo dõi thời gian khám', icon: 'calendar' },
  { key: 'pending', label: 'Chờ xác nhận', hint: 'Đang chờ phòng khám phản hồi', icon: 'pending' },
  { key: 'completed', label: 'Hoàn thành', hint: 'Đã có lịch sử thăm khám', icon: 'done' },
  { key: 'attention', label: 'Cần chú ý', hint: 'Yêu cầu hoặc trạng thái cần xem', icon: 'alert' }
];

export default function AppointmentSummaryBar({ metrics }) {
  return (
    <section className="pa-summary-bar" aria-label="Tổng quan lịch hẹn">
      {METRICS.map((item) => (
        <article className={`pa-summary-card ${item.key} ${metrics[item.key] > 0 ? 'has-value' : ''}`} key={item.key}>
          <span className={`pa-icon pa-icon-${item.icon}`} aria-hidden="true" />
          <div>
            <strong>{metrics[item.key] || 0}</strong>
            <span>{item.label}</span>
            <small>{item.hint}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
