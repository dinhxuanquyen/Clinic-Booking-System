export function SkeletonLine({ width = '100%', height = 14, mb = 0 }) {
  return (
    <div
      className="skeleton-line"
      style={{ width, height: `${height}px`, marginBottom: mb ? `${mb}px` : undefined }}
    />
  );
}

export function SkeletonAvatar({ size = 56 }) {
  return (
    <div
      className="skeleton-line skeleton-circle"
      style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0, borderRadius: '50%' }}
    />
  );
}

export function SkeletonDoctorCard() {
  return (
    <article className="skeleton-doctor-card">
      <div className="skeleton-line" style={{ width: '100%', height: '180px', borderRadius: '16px 16px 0 0' }} />
      <div className="skeleton-doctor-body">
        <SkeletonLine width="70%" height={18} mb={8} />
        <SkeletonLine width="50%" height={13} mb={12} />
        <SkeletonLine width="85%" height={12} mb={6} />
        <SkeletonLine width="60%" height={12} mb={16} />
        <SkeletonLine width="100%" height={36} />
      </div>
    </article>
  );
}

export function SkeletonAppointmentCard() {
  return (
    <div className="skeleton-appointment-card">
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <SkeletonAvatar size={44} />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="55%" height={16} mb={8} />
          <SkeletonLine width="40%" height={12} mb={6} />
          <SkeletonLine width="70%" height={12} mb={0} />
        </div>
        <SkeletonLine width={72} height={24} />
      </div>
      <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
        <SkeletonLine width={80} height={32} />
        <SkeletonLine width={80} height={32} />
      </div>
    </div>
  );
}

export function SkeletonReviewCard() {
  return (
    <div className="skeleton-review-card">
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
        <SkeletonAvatar size={40} />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="40%" height={14} mb={6} />
          <SkeletonLine width="60%" height={12} />
        </div>
      </div>
      <SkeletonLine width="100%" height={12} mb={6} />
      <SkeletonLine width="80%" height={12} />
    </div>
  );
}

export function SkeletonList({ count = 5, height = 64 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-list-row" key={index}>
          <SkeletonLine width="100%" height={height} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="skeleton-stat-card">
      <SkeletonLine width={44} height={44} />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="50%" height={26} mb={8} />
        <SkeletonLine width="70%" height={12} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 4, minWidth = '220px' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`, gap: '16px' }}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonDoctorCard key={index} />
      ))}
    </div>
  );
}
