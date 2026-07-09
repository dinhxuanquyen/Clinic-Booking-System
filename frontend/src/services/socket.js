import { io } from 'socket.io-client';
import { API_BASE_URL } from '../api/client.js';

let socket = null;
let joinedUserId = '';

function normalizeUserId(userId) {
  return String(userId?._id || userId?.id || userId || '');
}

function emitJoin() {
  if (!socket || !joinedUserId) return;
  socket.emit('join', joinedUserId);
  console.log(`Joined room user:${joinedUserId}`);
}

export function connectSocket(token) {
  if (!token) return null;

  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    emitJoin();
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connect error:', error.message || error);
  });

  return socket;
}

export function joinSocketRoom(userId) {
  joinedUserId = normalizeUserId(userId);
  emitJoin();
}

export function leaveSocketRoom(userId = joinedUserId) {
  const nextUserId = normalizeUserId(userId);
  if (socket && nextUserId) {
    socket.emit('leave', nextUserId);
  }
  if (!userId || nextUserId === joinedUserId) {
    joinedUserId = '';
  }
}

export function disconnectSocket() {
  if (socket) {
    leaveSocketRoom();
    socket.disconnect();
    socket = null;
  }
  joinedUserId = '';
}

export function getSocket() {
  return socket;
}
