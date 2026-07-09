export function notFound(req, res, next) {
  next(Object.assign(new Error(`Route not found: ${req.originalUrl}`), { statusCode: 404 }));
}

export function errorHandler(err, req, res, next) {
  const duplicateAppointment =
    err?.code === 11000 &&
    ['clinicId', 'doctorId', 'date', 'timeSlot'].every((key) => Object.hasOwn(err.keyPattern || {}, key));
  const isClinicRoute = req.originalUrl?.startsWith('/api/clinics');
  const duplicateClinicName = err?.code === 11000 && isClinicRoute && Object.hasOwn(err.keyPattern || {}, 'name');
  const duplicateClinicCode = err?.code === 11000 && isClinicRoute && Object.hasOwn(err.keyPattern || {}, 'clinicCode');
  const duplicateClinicEmail = err?.code === 11000 && isClinicRoute && Object.hasOwn(err.keyPattern || {}, 'email');
  const duplicateClinicPhone = err?.code === 11000 && isClinicRoute && Object.hasOwn(err.keyPattern || {}, 'phone');
  const duplicateEmail = err?.code === 11000 && Object.hasOwn(err.keyPattern || {}, 'email');
  const duplicatePhone = err?.code === 11000 && Object.hasOwn(err.keyPattern || {}, 'phone');
  const validationError = err?.name === 'ValidationError';
  const castError = err?.name === 'CastError';
  const jwtError = err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError';

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (duplicateAppointment) {
    statusCode = 409;
    message = 'Khung giờ này đã được đặt.';
  } else if (duplicateClinicName) {
    statusCode = 409;
    message = 'Tên cơ sở đã tồn tại';
  } else if (duplicateClinicCode) {
    statusCode = 409;
    message = 'Mã cơ sở đã tồn tại';
  } else if (duplicateClinicEmail) {
    statusCode = 409;
    message = 'Email cơ sở đã tồn tại';
  } else if (duplicateClinicPhone) {
    statusCode = 409;
    message = 'Số điện thoại cơ sở đã tồn tại';
  } else if (duplicateEmail) {
    statusCode = 409;
    message = 'Email này đã được sử dụng';
  } else if (duplicatePhone) {
    statusCode = 409;
    message = 'Số điện thoại này đã được sử dụng';
  } else if (err?.code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
  } else if (validationError) {
    statusCode = 422;
    message = 'Validation failed';
    details = Object.values(err.errors).map((item) => ({ field: item.path, message: item.message }));
  } else if (castError) {
    statusCode = 400;
    message = 'Invalid resource identifier';
  } else if (jwtError) {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  console.error(err.stack || err);

  res.status(statusCode).json({
    success: false,
    message,
    data: null
  });
}

