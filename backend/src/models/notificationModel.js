import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    role: {
      type: String,
      enum: ['patient', 'admin', 'doctor'],
      default: 'patient',
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      index: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true
    },
    waitingListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WaitingList',
      index: true
    },
    targetUrl: { type: String, trim: true },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_completed',
        'appointment_no_show',
        'cancel_request_approved',
        'cancel_request_rejected',
        'reschedule_request_approved',
        'reschedule_request_rejected',
        'consultation_called',
        'consultation_completed',
        'new_appointment',
        'cancel_request',
        'reschedule_request',
        'waitinglist_offered',
        'doctor_new_appointment',
        'doctor_cancel_request',
        'doctor_reschedule_request',
        'doctor_appointment_cancelled',
        'doctor_appointment_rescheduled',
        'doctor_waiting_list_accepted',
        'doctor_appointment_action',
        'schedule_exception_affected',
        'medical_record_created',
        'medical_record_updated',
        'follow_up_recommended',
        'follow_up_due_soon',
        'follow_up_overdue',
        'doctor_review_available'
      ],
      required: true,
      index: true
    },
    isRead: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
