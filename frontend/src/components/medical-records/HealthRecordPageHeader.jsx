import { displayText, formatDateVN } from '../../utils/medicalRecordView.js';

export default function HealthRecordPageHeader({ patientName, latestDate, followUpMode = false }) {
  const hasLatestDate = Boolean(latestDate);

  return (
    <header className="phr-page-header phr-premium-header">
      <div className="phr-header-copy">
        <span className="phr-eyebrow">
          {followUpMode ? 'Theo dõi sức khỏe' : 'Hồ sơ sức khỏe cá nhân'}
        </span>
        <h1>{followUpMode ? 'Lịch tái khám' : 'Hồ sơ khám bệnh'}</h1>
        <p>
          {followUpMode
            ? 'Theo dõi các chỉ định tái khám, thời hạn và tình trạng hoàn thành của bạn.'
            : 'Theo dõi lịch sử thăm khám, điều trị và kế hoạch tái khám của bạn.'}
        </p>
        {patientName && (
          <span className="phr-patient-context">
            {followUpMode ? 'Kế hoạch tái khám' : 'Hồ sơ sức khỏe'} của {displayText(patientName)}
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
