import { useState } from 'react';
import BaseModal from './BaseModal.jsx';

function getDoctorName(appointment) {
  const doctor = appointment?.doctorId;
  if (!doctor) return 'bác sĩ';
  return typeof doctor === 'object' ? doctor.name : 'bác sĩ';
}

export default function ReviewDoctorModal({ appointment, existingReview, onClose, onSubmit }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const readOnly = Boolean(existingReview);

  if (!appointment) return null;

  async function submit(event) {
    event.preventDefault();
    if (readOnly || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ rating, comment });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BaseModal
      backdropClassName="review-doctor-overlay"
      className="review-doctor-dialog"
      disableClose={submitting}
      onClose={onClose}
      size="md"
    >
      <div className="review-modal-header">
        <div>
          <span className="eyebrow">Đánh giá sau khám</span>
          <h2>{readOnly ? 'Đánh giá của bạn' : 'Đánh giá bác sĩ'}</h2>
          <p>{getDoctorName(appointment)} · {appointment.date} · {appointment.timeSlot}</p>
        </div>
        <button className="btn btn-sm btn-outline-secondary" disabled={submitting} type="button" onClick={onClose}>
          Đóng
        </button>
      </div>

      <form className="review-modal-form" onSubmit={submit}>
        <div className="review-modal-body">
          <div className="review-star-picker" aria-label="Chọn số sao đánh giá">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                aria-label={`${star} sao`}
                className={star <= rating ? 'active' : ''}
                disabled={readOnly || submitting}
                key={star}
                type="button"
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
          </div>

          {!readOnly && (
            <p className="review-helper">
              Chia sẻ trải nghiệm của bạn để giúp bác sĩ và phòng khám cải thiện dịch vụ.
            </p>
          )}

          <label className="form-label">Nhận xét</label>
          <textarea
            className="form-control"
            disabled={readOnly || submitting}
            maxLength={1000}
            rows="5"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Bác sĩ tư vấn thế nào? Quy trình khám có thuận tiện không?"
          />
          <div className="review-counter">{comment.length}/1000</div>
        </div>

        <div className="review-modal-footer">
          <button className="btn btn-outline-secondary" disabled={submitting} type="button" onClick={onClose}>
            {readOnly ? 'Đóng' : 'Hủy'}
          </button>
          {!readOnly && (
            <button className="btn btn-primary" disabled={submitting || !rating || comment.length > 1000} type="submit">
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          )}
        </div>
      </form>
    </BaseModal>
  );
}
