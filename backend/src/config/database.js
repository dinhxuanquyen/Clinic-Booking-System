import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log(`MongoDB Connected: ${connection.connection.host}`);
    return connection.connection;
  } catch (error) {
    console.error('MongoDB Error:', error.message);
    throw error;
  }
}

mongoose.connection.on('error', (error) => {
  console.error('MongoDB Error:', error.message);
});

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('MongoDB disconnected');
  }
});
