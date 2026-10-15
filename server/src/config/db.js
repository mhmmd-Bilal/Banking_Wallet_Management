import mongoose from 'mongoose';
import { env } from './env.js';
import { initModels } from '../models/index.js';

export async function connectDB(uri = env.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  // MongoDB transactions need a replica set (or Atlas / mongos). Fail fast otherwise.
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    throw new Error(
      'MongoDB is running standalone. Transactions require a replica set or MongoDB Atlas. See README.'
    );
  }
  await initModels();
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
