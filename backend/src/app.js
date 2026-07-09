import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import clinicRoutes from './routes/clinicRoutes.js';
import doctorRoutes, { clinicDoctorRouter, specialtyDoctorRouter } from './routes/doctorRoutes.js';
import doctorProfileRoutes from './routes/doctorProfileRoutes.js';
import specialtyRoutes, { clinicSpecialtyRouter } from './routes/specialtyRoutes.js';
import scheduleRoutes, { doctorAvailableSlotRouter, doctorScheduleRouter } from './routes/scheduleRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import appointmentRoutes, { doctorAppointmentRouter, doctorQueueRouter } from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import waitingListRoutes from './routes/waitingListRoutes.js';
import medicalRecordRoutes, { appointmentMedicalRecordRouter, doctorMedicalRecordRouter } from './routes/medicalRecordRoutes.js';
import doctorReviewRoutes, { adminReviewRouter, appointmentReviewRouter, doctorOwnReviewRouter, doctorReviewRouter } from './routes/doctorReviewRoutes.js';
import servicePackageRoutes, { adminServicePackageRouter, doctorServicePackageRouter } from './routes/servicePackageRoutes.js';
import articleRoutes, { adminArticleRouter, doctorArticleRouter } from './routes/articleRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/clinics/:clinicId/specialties', clinicSpecialtyRouter);
app.use('/api/clinics/:clinicId/doctors', clinicDoctorRouter);
app.use('/api/clinics', clinicRoutes);
app.use('/api/doctors/:doctorId/available-slots', doctorAvailableSlotRouter);
app.use('/api/doctors/:doctorId/appointments', doctorAppointmentRouter);
app.use('/api/doctors/:doctorId/reviews', doctorReviewRouter);
app.use('/api/doctor', doctorScheduleRouter);
app.use('/api/doctor/queue', doctorQueueRouter);
app.use('/api/doctor', doctorMedicalRecordRouter);
app.use('/api/doctor', doctorOwnReviewRouter);
app.use('/api/doctor', doctorProfileRoutes);
app.use('/api/doctor/service-packages', doctorServicePackageRouter);
app.use('/api/doctor/articles', doctorArticleRouter);
app.use('/api/specialties/:specialtyId/doctors', specialtyDoctorRouter);
app.use('/api/specialties', specialtyRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api', publicRoutes);
app.use('/api/appointments/:appointmentId', appointmentMedicalRecordRouter);
app.use('/api/appointments/:appointmentId/review', appointmentReviewRouter);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/reviews', doctorReviewRoutes);
app.use('/api/service-packages', servicePackageRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/admin/reviews', adminReviewRouter);
app.use('/api/admin/service-packages', adminServicePackageRouter);
app.use('/api/admin/articles', adminArticleRouter);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
