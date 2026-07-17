import { displayText, formatDateVN } from '../../utils/medicalRecordView.js';

export default function HealthRecordPageHeader({ patientName, latestDate }) {
  const hasLatestDate = Boolean(latestDate);

  return (
    <header className="phr-page-header phr-premium-header">
      <div className="phr-header-copy">
        <span className="phr-eyebrow">Hồ sơ sức khỏe cá nhân</span>
        <h1>Hồ sơ khám bệnh</h1>
        <p>Theo dõi lịch sử thăm khám, điều trị và kế hoạch tái khám của bạn.</p>
        {patientName && (
          <span className="phr-patient-context">
            Hồ sơ sức khỏe của {displayText(patientName)}
          </span>
        )}
      </div>
      <div className="phr-header-insight" aria-label="Cập nhật hồ sơ">
        <span>Cập nhật gần nhất</span>
        <strong>{hasLatestDate ? formatDateVN(latestDate) : 'Chưa có hồ sơ'}</strong>
      </div>
    </header>
  );
}
