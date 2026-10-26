import { Router } from 'express';
import RiskScore from '../models/RiskScore.js';
import { runRiskBatch } from '../jobs/riskBatch.js';

const router = Router();

// History of scores, optionally for one machine: GET /api/risk-scores?machine_id=3
router.get('/', async (req, res, next) => {
  try {
    const filter = req.query.machine_id ? { machine_id: Number(req.query.machine_id) } : {};
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    res.json(await RiskScore.find(filter).sort({ score_date: -1 }).limit(limit));
  } catch (err) {
    next(err);
  }
});

// Most recent score of every machine
router.get('/latest', async (req, res, next) => {
  try {
    const latest = await RiskScore.aggregate([
      { $sort: { score_date: -1 } },
      { $group: { _id: '$machine_id', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { risk_value: -1 } },
    ]);
    res.json(latest.map(({ _id, ...rest }) => ({ risk_id: _id, ...rest })));
  } catch (err) {
    next(err);
  }
});

// Trigger the batch job on demand
router.post('/run', async (req, res, next) => {
  try {
    res.status(201).json(await runRiskBatch());
  } catch (err) {
    next(err);
  }
});

export default router;
