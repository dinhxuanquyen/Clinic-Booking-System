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
  if (clinicConnections.has(key)) {
    return clinicConnections.get(key);
  }

  const centralUri = new URL(env.centralMongoUri);
  centralUri.pathname = `/${env.clinicDbPrefix}_${key}`;

  const connection = await mongoose.createConnection(centralUri.toString()).asPromise();
  clinicConnections.set(key, connection);
  return connection;
}
