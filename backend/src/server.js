import app from './app.js';
import http from 'http';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import Appointment from './models/appointmentModel.js';
import WaitingList from './models/waitingListModel.js';
import { initSocket } from './services/socketService.js';
import { startWaitingListExpiryJob } from './services/waitingListService.js';
import { startAppointmentAttendanceJob } from './services/appointmentAttendanceService.js';
import { startFollowUpJob } from './services/followUpService.js';

async function bootstrap() {
  await connectDatabase();
  await Appointment.syncIndexes();
  await WaitingList.syncIndexes();
  const server = http.createServer(app);
  initSocket(server);
  startWaitingListExpiryJob();
  startAppointmentAttendanceJob();
  startFollowUpJob();
  server.listen(env.port, () => {
    console.log(`API server running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
