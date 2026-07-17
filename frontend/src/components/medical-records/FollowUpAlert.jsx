import {
  canBookFollowUp,
  displayText,
  examDate,
  followUpStatusInfo,
  formatDateVN
} from '../../utils/medicalRecordView.js';

export default function FollowUpAlert({ records, onViewAll, onBook, onOpenRecord }) {
  const actionableRecords = records.filter((record) => canBookFollowUp(record) || record.followUpStatus === 'overdue');

  if (!actionableRecords.length) {
    return (
      <section className="phr-follow-up-alert neutral">
        <span className="phr-icon phr-icon-done" aria-hidden="true" />
        <div>
          <span className="phr-alert-kicker">Theo dõi tái khám</span>
          <strong>Bạn không có lịch tái khám cần xử lý.</strong>
        </div>
      </section>
    );
  }

  const sorted = [...actionableRecords].sort((a, b) => new Date(a.followUpDate || examDate(a)) - new Date(b.followUpDate || examDate(b)));
  const nearest = sorted[0];
  const status = followUpStatusInfo(nearest);
  const isBookable = canBookFollowUp(nearest);

  return (
    <section className={`phr-follow-up-alert ${status.tone}`}>
      <span className="phr-icon phr-icon-follow" aria-hidden="true" />
      <div className="phr-alert-main">
        <span className="phr-alert-kicker">Tái khám cần xử lý</span>
        <h2>{actionableRecords.length} hồ sơ cần theo dõi tái khám</h2>
        <p>
          Gần nhất: <strong>{nearest.followUpDate ? formatDateVN(nearest.followUpDate) : 'Chưa có ngày cụ thể'}</strong>
          <span aria-hidden="true"> · </span>
          {displayText(nearest.diagnosis, 'Hồ sơ chưa có chẩn đoán')}
        </p>
      </div>
      <div className="phr-banner-actions">
        {isBookable && (
          <button className="btn btn-primary" type="button" onClick={() => onBook(nearest)}>
            Đặt lịch tái khám
          </button>
        )}
        <button className="btn btn-outline-primary" type="button" onClick={() => onOpenRecord(nearest)}>
          Xem hồ sơ gần nhất
        </button>
        <button className="btn btn-ghost" type="button" onClick={onViewAll}>
          Xem tất cả
        </button>
      </div>
    </section>
  );
}
