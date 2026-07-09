import Notification from '../models/notificationModel.js';
import Appointment from '../models/appointmentModel.js';
import User from '../models/central/User.js';
import WaitingList from '../models/waitingListModel.js';
import { sendWaitingListOffer } from './emailService.js';
import { emitNotification, emitToUser } from './socketService.js';

const OFFER_DURATION_MS = 10 * 60 * 1000;
const SLOT_HOLDING_STATUSES = ['pending', 'confirmed', 'in_progress', 'cancel_requested', 'reschedule_requested', 'completed'];

async function isSlotAvailable({ doctorId, date, timeSlot }) {
  const occupied = await Appointment.exists({
    doctorId,
    date,
    timeSlot,
    status: { $in: SLOT_HOLDING_STATUSES }
  });
  return !occupied;
}

export async function offerNextWaitingPatient({ doctorId, date, timeSlot }) {
  if (!(await isSlotAvailable({ doctorId, date, timeSlot }))) return null;

  const activeOffer = await WaitingList.exists({
    doctorId,
    date,
    timeSlot,
    status: 'offered',
    offerExpiresAt: { $gt: new Date() }
  });
  if (activeOffer) return null;

  for (;;) {
    const offeredAt = new Date();
    const offerExpiresAt = new Date(offeredAt.getTime() + OFFER_DURATION_MS);
    const waitingEntry = await WaitingList.findOneAndUpdate(
      { doctorId, date, timeSlot, status: 'waiting' },
      { $set: { status: 'offered', offeredAt, offerExpiresAt } },
      { new: true, sort: { position: 1 } }
    ).populate({ path: 'doctorId', select: 'name' });

    if (!waitingEntry) return null;

    const patient = await User.findById(waitingEntry.patientId).select('name email isActive');
    if (!patient || patient.isActive === false) {
      await WaitingList.updateOne(
        { _id: waitingEntry._id, status: 'offered' },
        { $set: { status: 'expired', expiredAt: new Date() } }
      );
      console.warn(`Waiting list patient ${waitingEntry.patientId} is unavailable for offer ${waitingEntry._id}`);
      continue;
    }

    const startTime = String(timeSlot).split('-')[0];
    const title = 'Có lịch khám trống';
    const message = `Có lịch khám trống lúc ${startTime}. Bạn có 10 phút để xác nhận.`;
    let notification;
    try {
      notification = await Notification.create({
        userId: patient._id,
        role: 'patient',
        waitingListId: waitingEntry._id,
        title,
        message,
        type: 'waitinglist_offered',
        isRead: false
      });
    } catch (error) {
      await WaitingList.updateOne(
        { _id: waitingEntry._id, status: 'offered' },
        { $set: { status: 'waiting' }, $unset: { offeredAt: '', offerExpiresAt: '' } }
      );
      throw error;
    }

    emitNotification(notification.toObject());
    emitToUser(patient._id, 'waitinglist:offered', {
      waitingListId: waitingEntry._id,
      doctorId: waitingEntry.doctorId?._id || waitingEntry.doctorId,
      date,
      timeSlot,
      position: waitingEntry.position,
      status: waitingEntry.status,
      offeredAt,
      offerExpiresAt,
      title,
      message
    });

    try {
      await sendWaitingListOffer({
        to: patient.email,
        patientName: patient.name,
        doctorName: waitingEntry.doctorId?.name || 'bác sĩ',
        date,
        timeSlot,
        expiresInMinutes: 10
      });
    } catch (error) {
      console.error('Send waiting list offer email failed:', error);
    }

    return waitingEntry;
  }
}

export async function safelyOfferNextWaitingPatient(slot) {
  try {
    return await offerNextWaitingPatient(slot);
  } catch (error) {
    console.error('Offer next waiting list patient failed:', error);
    return null;
  }
}

export async function processExpiredWaitingListOffers() {
  for (;;) {
    const now = new Date();
    const expiredEntry = await WaitingList.findOneAndUpdate(
      { status: 'offered', offerExpiresAt: { $lte: now } },
      { $set: { status: 'expired', expiredAt: now } },
      { new: true, sort: { offerExpiresAt: 1 } }
    );

    if (!expiredEntry) return;

    await safelyOfferNextWaitingPatient({
      doctorId: expiredEntry.doctorId,
      date: expiredEntry.date,
      timeSlot: expiredEntry.timeSlot
    });
  }
}

export function startWaitingListExpiryJob(intervalMs = 60_000) {
  processExpiredWaitingListOffers().catch((error) => {
    console.error('Initial waiting list expiry job failed:', error);
  });

  const timer = setInterval(() => {
    processExpiredWaitingListOffers().catch((error) => {
      console.error('Waiting list expiry job failed:', error);
    });
  }, intervalMs);

  timer.unref?.();
  return timer;
}
