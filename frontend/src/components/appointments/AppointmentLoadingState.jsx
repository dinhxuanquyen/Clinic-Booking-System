export default function AppointmentLoadingState() {
  return (
    <div className="pa-loading-state" aria-busy="true" aria-label="Đang tải lịch hẹn">
      <div className="pa-loading-hero">
        <span className="pa-skeleton-line short" />
        <span className="pa-skeleton-line title" />
        <span className="pa-skeleton-line medium" />
      </div>
      <div className="pa-loading-summary">
        {Array.from({ length: 4 }).map((_, index) => <span className="pa-skeleton-card" key={index} />)}
      </div>
      <div className="pa-loading-list">
        {Array.from({ length: 3 }).map((_, index) => (
          <article className="pa-skeleton-appointment" key={index}>
            <span className="pa-skeleton-date" />
            <div>
              <span className="pa-skeleton-line medium" />
              <span className="pa-skeleton-line long" />
              <span className="pa-skeleton-line short" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
