import { param } from 'express-validator';
import Notification from '../models/notificationModel.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificationIdRule = [param('id').isMongoId().withMessage('Notification id is invalid')];

function notificationScope(user) {
  if (user.role === 'admin') {
    return { $or: [{ role: 'admin' }, { userId: user._id }] };
  }

  if (user.role === 'doctor') {
    const scope = [{ userId: user._id }];
    if (user.doctorId) scope.push({ doctorId: user.doctorId });
    return { $or: scope };
  }

  return { userId: user._id };
}

export const myNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find(notificationScope(req.user))
    .populate({
      path: 'appointmentId',
      select: 'date timeSlot status clinicId specialtyId doctorId',
      populate: [
        { path: 'clinicId', select: 'name address' },
        { path: 'specialtyId', select: 'name' },
        { path: 'doctorId', select: 'name degree' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    success: true,
    message: 'Notifications fetched successfully',
    data: notifications
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...notificationScope(req.user) },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Không tìm thấy dữ liệu');
  }

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ ...notificationScope(req.user), isRead: false }, { isRead: true });

  res.json({
    success: true,
    message: 'All notifications marked as read',
    data: null
  });
});
