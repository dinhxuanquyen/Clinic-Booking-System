export default function MedicalRecordsLoadingState() {
  return (
    <div className="phr-loading-state" aria-label="Đang tải hồ sơ khám bệnh" aria-live="polite">
      <div className="phr-loading-hero">
        <span className="phr-skeleton-line short" />
        <span className="phr-skeleton-line title" />
        <span className="phr-skeleton-line medium" />
      </div>

      <div className="phr-loading-summary">
        {Array.from({ length: 4 }).map((_, index) => (
          <span className="phr-skeleton-card" key={index} />
        ))}
      </div>

      <div className="phr-loading-workspace">
        <span className="phr-skeleton-line medium" />
        {Array.from({ length: 3 }).map((_, index) => (
          <article className="phr-skeleton-record" key={index}>
            <span className="phr-skeleton-date" />
            <div>
              <span className="phr-skeleton-line medium" />
              <span className="phr-skeleton-line long" />
              <span className="phr-skeleton-line short" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
