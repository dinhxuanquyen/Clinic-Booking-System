export default function PageSkeleton({ label = 'Đang tải dữ liệu...', minHeight = '560px' }) {
  return (
    <div className="page-skeleton" style={{ minHeight }} aria-busy="true" aria-live="polite">
      <div className="page-skeleton-panel">
        <span className="page-skeleton-spinner" />
        <p>{label}</p>
        <div className="page-skeleton-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
