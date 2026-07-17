import {
  canCancelRescheduleRequest,
  canDownloadBookingPdf,
  canDownloadQueueTicket,
  canRequestCancel,
  canRequestReschedule,
  canReviewDoctor,
  canViewMedicalRecord
} from '../../utils/appointmentView.js';

function actionKey(appointment, type) {
  return `${appointment?._id}:${type}`;
}

export default function AppointmentActions({
  appointment,
  downloadingPdfKey,
  medicalRecordLoadingId,
  onCancel,
  onCancelReschedule,
  onDetail,
  onDownloadPdf,
  onReschedule,
  onReviewDoctor,
  onViewMedicalRecord,
  onViewSourceRecord,
  sourceRecordId
}) {
  const isRecordLoading = medicalRecordLoadingId === appointment._id;
  const isSourceLoading = sourceRecordId && medicalRecordLoadingId === `follow-up:${sourceRecordId}`;
  const secondaryAction = canViewMedicalRecord(appointment)
    ? {
        key: 'record',
        label: isRecordLoading ? 'Đang mở...' : 'Xem hồ sơ',
        disabled: isRecordLoading,
        onClick: () => onViewMedicalRecord(appointment)
      }
    : canRequestReschedule(appointment)
      ? { key: 'reschedule', label: 'Đổi lịch', onClick: () => onReschedule(appointment) }
      : null;

  const overflowActions = [
    sourceRecordId && {
      key: 'source-record',
      label: isSourceLoading ? 'Đang mở hồ sơ gốc...' : 'Xem hồ sơ gốc',
      disabled: isSourceLoading,
      onClick: () => onViewSourceRecord(appointment)
    },
    canDownloadBookingPdf(appointment) && {
      key: 'appointment-pdf',
      label: 'Phiếu đặt lịch',
      disabled: downloadingPdfKey === actionKey(appointment, 'appointment'),
      onClick: () => onDownloadPdf(appointment, 'appointment')
    },
    canDownloadQueueTicket(appointment) && {
      key: 'queue-pdf',
      label: 'Phiếu khám',
      disabled: downloadingPdfKey === actionKey(appointment, 'queue'),
      onClick: () => onDownloadPdf(appointment, 'queue')
    },
    canViewMedicalRecord(appointment) && {
      key: 'record-pdf',
      label: 'Kết quả PDF',
      disabled: downloadingPdfKey === actionKey(appointment, 'record'),
      onClick: () => onDownloadPdf(appointment, 'record')
    },
    canReviewDoctor(appointment) && {
      key: 'review',
      label: appointment.doctorReview ? 'Đã đánh giá' : 'Đánh giá bác sĩ',
      onClick: () => onReviewDoctor(appointment)
    },
    canRequestCancel(appointment) && {
      key: 'cancel',
      label: appointment.status === 'confirmed' ? 'Yêu cầu hủy' : 'Hủy lịch',
      tone: 'danger',
      onClick: () => onCancel(appointment)
    },
    canCancelRescheduleRequest(appointment) && {
      key: 'cancel-reschedule',
      label: 'Hủy đổi lịch',
      onClick: () => onCancelReschedule(appointment)
    },
    canRequestReschedule(appointment) && secondaryAction?.key !== 'reschedule' && {
      key: 'reschedule-extra',
      label: 'Đổi lịch',
      onClick: () => onReschedule(appointment)
    }
  ].filter(Boolean);

  return (
    <div className="pa-actions">
      <button className="btn btn-primary btn-sm" type="button" onClick={() => onDetail(appointment)}>
        Xem chi tiết
      </button>
      {secondaryAction && (
        <button
          className="btn btn-outline-primary btn-sm"
          disabled={secondaryAction.disabled}
          type="button"
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </button>
      )}
      {overflowActions.length > 0 && (
        <details className="pa-more-actions">
          <summary>Thao tác khác</summary>
          <div>
            {overflowActions.map((action) => (
              <button
                className={action.tone === 'danger' ? 'danger' : ''}
                disabled={action.disabled}
                key={action.key}
                type="button"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
