import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/central/User.js';

let ioInstance = null;

function userRoom(userId) {
  return `user:${userId}`;
}

function roleRoom(role) {
  return `role:${String(role || '').toLowerCase()}`;
}

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: env.appUrl,
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  ioInstance.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const header = socket.handshake.headers?.authorization || '';
      const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : '';
      const token = authToken || bearerToken;

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.id).select('-password');

      if (!user || !user.isActive) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('Invalid authentication token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(userRoom(user._id));
    socket.join(roleRoom(user.role));
    console.log(`Socket connected user:${user._id} role:${user.role}`);

    function joinUserRoom(userId) {
      const requestedUserId = String(userId || '');
      if (!requestedUserId || requestedUserId !== String(user._id)) return;
      socket.join(userRoom(requestedUserId));
      console.log(`User joined room user:${requestedUserId}`);
    }

    function leaveUserRoom(userId) {
      const requestedUserId = String(userId || '');
      if (!requestedUserId || requestedUserId !== String(user._id)) return;
      socket.leave(userRoom(requestedUserId));
      console.log(`User left room user:${requestedUserId}`);
    }

    socket.on('join', joinUserRoom);
    socket.on('joinUser', joinUserRoom);
    socket.on('registerUser', joinUserRoom);
    socket.on('leave', leaveUserRoom);
  });

  return ioInstance;
}

export function getIo() {
  return ioInstance;
}

export function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  try {
    ioInstance.to(userRoom(userId)).emit(event, payload);
  } catch (error) {
    console.warn(`Socket emit ${event} to user:${userId} failed:`, error.stack || error);
  }
}

export function emitToRole(role, event, payload) {
  if (!ioInstance || !role) return;
  try {
    ioInstance.to(roleRoom(role)).emit(event, payload);
  } catch (error) {
    console.warn(`Socket emit ${event} to role:${role} failed:`, error.stack || error);
  }
}

export function emitNotification(notification) {
  if (!notification) return;
  const payload = { notification };

  try {
    if (notification.userId) {
      console.log(`Emit notification:new to user:${notification.userId}`);
      emitToUser(notification.userId, 'notification:new', payload);
      return;
    }

    if (notification.role === 'admin') {
      console.log('Emit notification:new to role:admin');
      emitToRole('admin', 'notification:new', payload);
      return;
    }

    if (notification.role === 'doctor' && notification.doctorId) {
      console.warn(`Doctor notification ${notification._id || ''} has doctorId but no userId; realtime direct emit skipped`);
    }
  } catch (error) {
    console.warn('Socket notification emit failed:', error.stack || error);
    return;
  }
}
