import app from './app.js';
import http from 'http';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import Appointment from './models/appointmentModel.js';
import ClinicSyncOutbox from './models/clinicSyncOutboxModel.js';
import WaitingList from './models/waitingListModel.js';
import { initSocket } from './services/socketService.js';
import { startWaitingListExpiryJob } from './services/waitingListService.js';
import { startAppointmentAttendanceJob } from './services/appointmentAttendanceService.js';
import { startFollowUpJob } from './services/followUpService.js';
import { startClinicSyncOutboxJob } from './services/clinicSyncOutboxService.js';

async function bootstrap() {
  await connectDatabase();
  await Promise.all([
    Appointment.syncIndexes(),
    ClinicSyncOutbox.syncIndexes(),
    WaitingList.syncIndexes()
  ]);
  const server = http.createServer(app);
  initSocket(server);
  startWaitingListExpiryJob();
  startAppointmentAttendanceJob();
  startFollowUpJob();
  startClinicSyncOutboxJob();
  server.listen(env.port, () => {
    console.log(`API server running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
