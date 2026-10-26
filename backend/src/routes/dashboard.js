import { Router } from 'express';
import pool from '../db/mysql.js';
import RiskScore from '../models/RiskScore.js';

const router = Router();

export const riskLevel = (r) => (r == null ? 'unknown' : r >= 0.7 ? 'high' : r >= 0.4 ? 'medium' : 'low');

// Cross-database view: machine master data + open work orders (MySQL)
// joined in the API with the latest risk score of each machine (MongoDB).
router.get('/', async (req, res, next) => {
  try {
    const [[machines], [[stats]], [lowStock], latestRisk] = await Promise.all([
      pool.query(
        `SELECT m.machine_id, m.model, m.age_years,
                COUNT(wo.work_order_id) AS open_work_orders
           FROM machine m
           LEFT JOIN work_order wo ON wo.machine_id = m.machine_id AND wo.status IN ('open', 'in_progress')
          GROUP BY m.machine_id`
      ),
      pool.query(
        `SELECT (SELECT COUNT(*) FROM work_order WHERE status IN ('open', 'in_progress')) AS open_work_orders,
                (SELECT COALESCE(SUM(cost), 0) FROM work_order WHERE created_date >= NOW() - INTERVAL 30 DAY) AS cost_30d`
      ),
      pool.query('SELECT part_id, part_name, quantity_in_stock FROM spare_part WHERE quantity_in_stock < 10 ORDER BY quantity_in_stock'),
      RiskScore.aggregate([
        { $sort: { score_date: -1 } },
        { $group: { _id: '$machine_id', doc: { $first: '$$ROOT' } } },
      ]),
    ]);

    const riskByMachine = new Map(latestRisk.map((r) => [r._id, r.doc]));
    const rows = machines
      .map((m) => {
        const risk = riskByMachine.get(m.machine_id);
        return {
          ...m,
          risk_value: risk?.risk_value ?? null,
          risk_level: riskLevel(risk?.risk_value),
          score_date: risk?.score_date ?? null,
          errors_7d: risk?.features?.errors_7d ?? null,
          failures_90d: risk?.features?.failures_90d ?? null,
        };
      })
      .sort((a, b) => (b.risk_value ?? -1) - (a.risk_value ?? -1));

    res.json({
      summary: {
        machines: rows.length,
        high_risk: rows.filter((r) => r.risk_level === 'high').length,
        open_work_orders: stats.open_work_orders,
        cost_30d: stats.cost_30d,
        errors_7d: rows.reduce((s, r) => s + (r.errors_7d || 0), 0),
        last_batch: latestRisk.length ? new Date(Math.max(...latestRisk.map((r) => r.doc.score_date))) : null,
      },
      machines: rows,
      lowStock,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
