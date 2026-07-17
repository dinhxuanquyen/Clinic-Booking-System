const TAB_ICONS = {
  all: 'records',
  needs_follow_up: 'follow',
  completed_follow_up: 'done',
  overdue: 'alert'
};

export default function MedicalRecordFilters({
  activeTab,
  filterActive,
  onReset,
  onSearchChange,
  onSortChange,
  onSpecialtyChange,
  onTabChange,
  onYearChange,
  search,
  sortOrder,
  specialties,
  tabs,
  tabCounts,
  year,
  years,
  specialty
}) {
  function handleTabKeyDown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = index === 0 ? tabs.length - 1 : index - 1;
    if (event.key === 'ArrowRight') nextIndex = index === tabs.length - 1 ? 0 : index + 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    onTabChange(tabs[nextIndex].key);
    window.requestAnimationFrame(() => {
      event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
    });
  }

  return (
    <>
      <div className="phr-tabs phr-premium-tabs" role="tablist" aria-label="Lọc hồ sơ khám">
        {tabs.map((tab, index) => (
          <button
            className={activeTab === tab.key ? 'active' : ''}
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            tabIndex={activeTab === tab.key ? 0 : -1}
            onClick={() => onTabChange(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span className={`phr-icon phr-icon-${TAB_ICONS[tab.key] || 'records'}`} aria-hidden="true" />
            <span>{tab.label}</span>
            <strong>{tabCounts[tab.key] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="phr-filter-panel phr-premium-filters">
        <label>
          <span>Tìm kiếm</span>
          <input
            className="form-control"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm chẩn đoán, bác sĩ hoặc chuyên khoa..."
          />
        </label>
        <label>
          <span>Chuyên khoa</span>
          <select className="form-select" value={specialty} onChange={(event) => onSpecialtyChange(event.target.value)}>
            <option value="all">Tất cả chuyên khoa</option>
            {specialties.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
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
          <button className="btn btn-ghost phr-reset-filters" type="button" onClick={onReset}>
            Xóa bộ lọc
          </button>
        )}
      </div>
    </>
  );
}
