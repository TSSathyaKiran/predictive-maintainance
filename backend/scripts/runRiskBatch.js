// Runs the risk scoring batch job once from the command line.
import mongoose from 'mongoose';
import pool from '../src/db/mysql.js';
import { connectMongo } from '../src/db/mongo.js';
import { runRiskBatch } from '../src/jobs/riskBatch.js';

await connectMongo();
try {
  const { jobId, machinesScored } = await runRiskBatch();
  console.log(`${jobId}: scored ${machinesScored} machines.`);
} finally {
  await mongoose.disconnect();
  await pool.end();
}
