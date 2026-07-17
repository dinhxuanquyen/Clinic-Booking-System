export default function AppointmentTabs({ activeView, appointmentCount, onChange, waitingCount }) {
  const tabs = [
    { key: 'appointments', label: 'Lịch hẹn', count: appointmentCount, panelId: 'appointment-results' },
    { key: 'waiting-list', label: 'Danh sách chờ', count: waitingCount, panelId: 'waiting-list-panel' }
  ];

  return (
    <div className="pa-tabs" role="tablist" aria-label="Quản lý lịch khám">
      {tabs.map((tab) => (
        <button
          aria-controls={tab.panelId}
          aria-selected={activeView === tab.key}
          className={activeView === tab.key ? 'active' : ''}
          id={`appointment-tab-${tab.key}`}
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
