const SUMMARY_META = {
  total: {
    icon: 'records',
    label: 'Tổng hồ sơ',
    helper: 'Lịch sử khám đã lưu'
  },
  thisYear: {
    icon: 'year',
    label: 'Hồ sơ trong năm',
    helper: 'Các lần khám năm hiện tại'
  },
  needsFollowUp: {
    icon: 'follow',
    label: 'Cần tái khám',
    helper: 'Có hành động cần xử lý'
  },
  completedFollowUp: {
    icon: 'done',
    label: 'Đã hoàn thành',
    helper: 'Tái khám đã hoàn tất'
  }
};

function MetricCard({ itemKey, value }) {
  const meta = SUMMARY_META[itemKey];

  return (
    <article className={`phr-summary-card ${itemKey}`}>
      <span className={`phr-icon phr-icon-${meta.icon}`} aria-hidden="true" />
      <div>
        <strong>{value}</strong>
        <span>{meta.label}</span>
        <small>{meta.helper}</small>
      </div>
    </article>
  );
}

export default function HealthSummaryBar({ metrics }) {
  return (
    <section className="phr-summary-bar phr-premium-summary" aria-label="Tổng quan hồ sơ khám">
      <MetricCard itemKey="total" value={metrics.total} />
      <MetricCard itemKey="thisYear" value={metrics.thisYear} />
      <MetricCard itemKey="needsFollowUp" value={metrics.needsFollowUp} />
      <MetricCard itemKey="completedFollowUp" value={metrics.completedFollowUp} />
    </section>
  );
}
