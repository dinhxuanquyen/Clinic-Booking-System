const NAV_ICON_CLASS = {
  overview: 'records',
  source: 'follow',
  journey: 'records',
  diagnosis: 'alert',
  vitals: 'year',
  prescription: 'records',
  attachments: 'records',
  doctor: 'done',
  'follow-up': 'follow'
};

export default function MedicalRecordSectionNav({ activeSection, mode = 'side', onSelect, sections }) {
  return (
    <nav className={mode === 'chips' ? 'phr-anchor-chips phr-modal-chips' : 'phr-detail-nav phr-modal-side-nav'} aria-label="Điều hướng hồ sơ">
      {sections.map((section) => (
        <button
          className={activeSection === section.id ? 'active' : ''}
          key={section.id}
          type="button"
          aria-current={activeSection === section.id ? 'true' : undefined}
          onClick={() => onSelect(section.id)}
        >
          <span className={`phr-icon phr-icon-${NAV_ICON_CLASS[section.id] || 'records'}`} aria-hidden="true" />
          <span>{section.label}</span>
        </button>
      ))}
    </nav>
  );
}
