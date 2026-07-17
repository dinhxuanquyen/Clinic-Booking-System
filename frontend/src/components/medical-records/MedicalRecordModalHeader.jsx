import {
  FaDownload,
  FaPrint
} from '../icons/FaIcons.jsx';
import {
  appointmentStatusLabel,
  appointmentTypeLabel,
  displayName,
  displayText,
  examDate,
  formatDateVN,
  formatSlot,
  recordCode
} from '../../utils/medicalRecordView.js';

export default function MedicalRecordModalHeader({ isDownloadingPdf, isPrintingPdf, onClose, onDownload, onPrint, record }) {
  const appointment = record?.appointmentId || {};
  const diagnosis = displayText(record?.diagnosis, 'Hồ sơ khám bệnh');
  const slot = appointment.timeSlot ? formatSlot(appointment.timeSlot) : '';

  return (
    <header className="phr-modal-header">
      <div className="phr-modal-title-block">
        <span className="phr-eyebrow">Hồ sơ khám bệnh</span>
        <h2 id="medical-record-detail-title">{diagnosis}</h2>
        <div className="phr-modal-code">{recordCode(record)}</div>
        <p>
          {formatDateVN(examDate(record))}
          {slot ? ` · ${slot}` : ''}
          {' · '}
          {appointmentTypeLabel(record)}
          {' · '}
          {appointmentStatusLabel(appointment.status || 'completed')}
        </p>
        <p className="phr-detail-doctor">
          {displayName(record?.doctorId)} · {displayName(record?.specialtyId)}
        </p>
      </div>

      <div className="phr-detail-header-actions">
        <button
          aria-busy={isDownloadingPdf}
          aria-label="Tải file PDF kết quả khám"
          className="btn btn-outline-primary btn-sm"
          disabled={isDownloadingPdf}
          type="button"
          onClick={onDownload}
        >
          <FaDownload size={13} />
          {isDownloadingPdf ? 'Đang chuẩn bị...' : 'Tải PDF'}
        </button>
        <button
          aria-busy={isPrintingPdf}
          aria-label="In phiếu kết quả khám"
          className="btn btn-outline-secondary btn-sm"
          disabled={isPrintingPdf}
          type="button"
          onClick={onPrint}
        >
          <FaPrint size={13} />
          {isPrintingPdf ? 'Đang chuẩn bị...' : 'In hồ sơ'}
        </button>
        <button className="phr-modal-close" data-autofocus type="button" aria-label="Đóng hồ sơ khám" onClick={onClose}>
          ×
        </button>
      </div>
    </header>
  );
}
