import mongoose from 'mongoose';
import { env } from './env.js';
import { connectDatabase } from './database.js';

const clinicConnections = new Map();

export async function connectCentralDb() {
  return connectDatabase();
}

export function getCentralConnection() {
  return mongoose.connection;
}

export async function getClinicConnection(clinicId) {
  if (!clinicId) {
    throw new Error('clinicId is required to resolve clinic database');
  }

  const key = String(clinicId);
  const existingConnection = clinicConnections.get(key);
  if (existingConnection?.readyState === 1) {
    return existingConnection;
  }

  if (existingConnection) {
    clinicConnections.delete(key);
    await existingConnection.close().catch(() => {});
  }

  const centralUri = new URL(env.centralMongoUri);
  centralUri.pathname = `/${env.clinicDbPrefix}_${key}`;

  const connection = await mongoose.createConnection(centralUri.toString(), {
    serverSelectionTimeoutMS: 10000
  }).asPromise();
  clinicConnections.set(key, connection);
  return connection;
}
