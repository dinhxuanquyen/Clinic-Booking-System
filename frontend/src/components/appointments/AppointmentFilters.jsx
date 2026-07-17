const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
  { key: 'no_show', label: 'Không đến khám' }
];

export default function AppointmentFilters({
  counts,
  filterActive,
  onReset,
  onSearchChange,
  onSortChange,
  onStatusChange,
  onYearChange,
  search,
  sortOrder,
  statusFilter,
  year,
  years
}) {
  return (
    <section className="pa-filter-panel" aria-label="Bộ lọc lịch hẹn">
      <div className="pa-status-filters" role="tablist" aria-label="Lọc trạng thái lịch hẹn">
        {STATUS_FILTERS.map((item) => (
          <button
            aria-selected={statusFilter === item.key}
            className={statusFilter === item.key ? 'active' : ''}
            key={item.key}
            role="tab"
            type="button"
            onClick={() => onStatusChange(item.key)}
          >
            <span>{item.label}</span>
            <strong>{counts[item.key] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="pa-filter-grid">
        <label>
          <span>Tìm kiếm</span>
          <input
            className="form-control"
            placeholder="Bác sĩ, chuyên khoa, cơ sở..."
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <label>
          <span>Năm</span>
          <select className="form-select" value={year} onChange={(event) => onYearChange(event.target.value)}>
            <option value="all">Tất cả năm</option>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Sắp xếp</span>
          <select className="form-select" value={sortOrder} onChange={(event) => onSortChange(event.target.value)}>
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </select>
        </label>
        {filterActive && (
          <button className="btn btn-ghost pa-reset-filter" type="button" onClick={onReset}>
            Xóa bộ lọc
          </button>
        )}
      </div>
    </section>
  );
}
