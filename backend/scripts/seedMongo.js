// Generates synthetic error logs (last 90 days) for every machine in MySQL.
// Older machines and machines with recent failures produce more errors,
// so the risk batch job has a realistic signal to work with.
// WARNING: clears the error_logs and risk_scores collections first.
import mongoose from 'mongoose';
import pool from '../src/db/mysql.js';
import { connectMongo } from '../src/db/mongo.js';
import ErrorLog from '../src/models/ErrorLog.js';
import RiskScore from '../src/models/RiskScore.js';

const DAYS = 90;
const ERROR_CODES = ['error1', 'error2', 'error3', 'error4', 'error5'];

// Small deterministic PRNG so every team member gets the same data
let seed = 42;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

await connectMongo();
try {
  const [machines] = await pool.query(
    `SELECT m.machine_id, m.age_years,
            SUM(mr.is_failure AND mr.maintenance_date >= NOW() - INTERVAL 30 DAY) AS recent_failures
       FROM machine m
       LEFT JOIN maintenance_record mr ON mr.machine_id = m.machine_id
      GROUP BY m.machine_id`
  );

  await Promise.all([ErrorLog.deleteMany({}), RiskScore.deleteMany({})]);

  const logs = [];
  const now = Date.now();
  for (const m of machines) {
    // Expected errors per day grows with age and recent failures
    const rate = 0.3 + m.age_years * 0.06 + Number(m.recent_failures || 0) * 0.8;
    for (let day = 0; day < DAYS; day++) {
      // Errors cluster closer to the present for failing machines
      const dayRate = rate * (day < 14 ? 1.5 : 1);
      const count = Math.floor(dayRate + random());
      for (let i = 0; i < count; i++) {
        logs.push({
          machine_id: m.machine_id,
          error_datetime: new Date(now - day * 86400000 - Math.floor(random() * 86400000)),
          error_code: ERROR_CODES[Math.floor(random() ** 1.5 * ERROR_CODES.length)],
        });
      }
    }
  }

  await ErrorLog.insertMany(logs);
  console.log(`Inserted ${logs.length} error logs for ${machines.length} machines.`);
} finally {
  await mongoose.disconnect();
  await pool.end();
}
