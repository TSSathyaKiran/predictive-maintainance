// Risk scoring batch job: combines telemetry from MongoDB (error logs) with
// maintenance history from MySQL to produce a failure-risk score per machine.
//
//   z    = -4.5 + 0.035*errors_30d + 0.02*errors_7d + 0.8*failures_90d
//          + 0.08*age_years + 0.015*days_since_maintenance
//   risk = 1 / (1 + e^-z)          (logistic, always in [0, 1])
import pool from '../db/mysql.js';
import ErrorLog from '../models/ErrorLog.js';
import RiskScore from '../models/RiskScore.js';

const DAY = 86400000;

const logistic = (z) => 1 / (1 + Math.exp(-z));

export function computeRisk(f) {
  const z =
    -4.5 +
    0.035 * f.errors_30d +
    0.02 * f.errors_7d +
    0.8 * f.failures_90d +
    0.08 * f.age_years +
    0.015 * f.days_since_maintenance;
  return Number(logistic(z).toFixed(4));
}

export async function runRiskBatch() {
  const jobId = `risk-batch-${new Date().toISOString()}`;
  const now = Date.now();

  // 1. Relational features from MySQL
  const [machines] = await pool.query(
    `SELECT m.machine_id, m.age_years,
            COALESCE(SUM(mr.is_failure AND mr.maintenance_date >= NOW() - INTERVAL 90 DAY), 0) AS failures_90d,
            MAX(mr.maintenance_date) AS last_maintenance
       FROM machine m
       LEFT JOIN maintenance_record mr ON mr.machine_id = m.machine_id
      GROUP BY m.machine_id`
  );

  // 2. Telemetry features from MongoDB (single aggregation over the last 30 days)
  const errorCounts = await ErrorLog.aggregate([
    { $match: { error_datetime: { $gte: new Date(now - 30 * DAY) } } },
    {
      $group: {
        _id: '$machine_id',
        errors_30d: { $sum: 1 },
        errors_7d: { $sum: { $cond: [{ $gte: ['$error_datetime', new Date(now - 7 * DAY)] }, 1, 0] } },
      },
    },
  ]);
  const errorsByMachine = new Map(errorCounts.map((e) => [e._id, e]));

  // 3. Score and persist
  const scores = machines.map((m) => {
    const errors = errorsByMachine.get(m.machine_id) || { errors_30d: 0, errors_7d: 0 };
    const features = {
      errors_7d: errors.errors_7d,
      errors_30d: errors.errors_30d,
      failures_90d: Number(m.failures_90d),
      days_since_maintenance: m.last_maintenance ? Math.floor((now - new Date(m.last_maintenance)) / DAY) : 365,
      age_years: m.age_years,
    };
    return {
      machine_id: m.machine_id,
      score_date: new Date(now),
      risk_value: computeRisk(features),
      source_batch_job: jobId,
      features,
    };
  });

  await RiskScore.insertMany(scores);
  return { jobId, machinesScored: scores.length };
}

// Latest risk score for one machine, or null if it has never been scored
export async function latestRiskFor(machineId) {
  const doc = await RiskScore.findOne({ machine_id: Number(machineId) }).sort({ score_date: -1 });
  return doc ? doc.risk_value : null;
}
