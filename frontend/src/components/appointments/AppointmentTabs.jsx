export default function AppointmentTabs({ activeView, appointmentCount, onChange, waitingCount }) {
  const tabs = [
    { key: 'appointments', label: 'Lịch hẹn', count: appointmentCount },
    { key: 'waiting-list', label: 'Danh sách chờ', count: waitingCount }
  ];

  return (
    <div className="pa-tabs" role="tablist" aria-label="Quản lý lịch khám">
      {tabs.map((tab) => (
        <button
          aria-selected={activeView === tab.key}
          className={activeView === tab.key ? 'active' : ''}
          key={tab.key}
          role="tab"
          type="button"
          onClick={() => onChange(tab.key)}
        >
          <span>{tab.label}</span>
          <strong>{tab.count}</strong>
        </button>
      ))}
    </div>
  );
}
