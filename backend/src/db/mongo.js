import mongoose from 'mongoose';
import 'dotenv/config';

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/predictive_maintenance';

export async function connectMongo() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
}

export const isMongoUp = () => mongoose.connection.readyState === 1;
