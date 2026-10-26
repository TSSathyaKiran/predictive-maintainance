import { Router } from 'express';
import ErrorLog from '../models/ErrorLog.js';
import pool from '../db/mysql.js';

const router = Router();

// GET /api/error-logs?machine_id=&error_code=&from=&to=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { machine_id, error_code, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const filter = {};
    if (machine_id) filter.machine_id = Number(machine_id);
    if (error_code) filter.error_code = error_code;
    if (from || to) {
      filter.error_datetime = {};
      if (from) filter.error_datetime.$gte = new Date(from);
      if (to) filter.error_datetime.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      ErrorLog.find(filter).sort({ error_datetime: -1 }).skip((page - 1) * limit).limit(limit),
      ErrorLog.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// Aggregated counts for the last `days` days, by error code and by machine
router.get('/summary', async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const since = new Date(Date.now() - days * 86400000);
    const [result] = await ErrorLog.aggregate([
      { $match: { error_datetime: { $gte: since } } },
      {
        $facet: {
          byCode: [{ $group: { _id: '$error_code', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
          byMachine: [{ $group: { _id: '$machine_id', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          total: [{ $count: 'count' }],
        },
      },
    ]);
    res.json({
      days,
      total: result.total[0]?.count || 0,
      byCode: result.byCode.map((r) => ({ error_code: r._id, count: r.count })),
      byMachine: result.byMachine.map((r) => ({ machine_id: r._id, count: r.count })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { machine_id, error_code, error_datetime } = req.body;
    // Cross-database referential check: machine must exist in MySQL
    const [[machine]] = await pool.query('SELECT machine_id FROM machine WHERE machine_id = ?', [machine_id]);
    if (!machine) return res.status(400).json({ error: `Machine ${machine_id} does not exist` });

    const log = await ErrorLog.create({ machine_id: Number(machine_id), error_code, error_datetime: error_datetime || undefined });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await ErrorLog.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
