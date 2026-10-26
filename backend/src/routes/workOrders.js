import { Router } from 'express';
import pool from '../db/mysql.js';

const router = Router();
const STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    let sql = 'SELECT * FROM v_work_order_details';
    if (req.query.status) {
      sql += ' WHERE status = ?';
      params.push(req.query.status);
    }
    const [rows] = await pool.query(`${sql} ORDER BY created_date DESC`, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[order]] = await pool.query('SELECT * FROM v_work_order_details WHERE work_order_id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const [parts] = await pool.query(
      `SELECT wop.part_id, sp.part_name, wop.quantity_used, sp.unit_cost
         FROM work_order_part wop
         JOIN spare_part sp ON sp.part_id = wop.part_id
        WHERE wop.work_order_id = ?`,
      [req.params.id]
    );
    res.json({ ...order, parts });
  } catch (err) {
    next(err);
  }
});

// Creates a work order and consumes spare parts in a single transaction:
// if any part is out of stock, nothing is written.
router.post('/', async (req, res, next) => {
  const { machine_id, component_id, technician_id, status = 'open', labour_cost = 0, parts = [] } = req.body;
  if (!machine_id) return res.status(400).json({ error: 'machine_id is required' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const riskScore = req.body.risk_score_at_creation ?? null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let partsCost = 0;
    for (const { part_id, quantity_used } of parts) {
      const qty = Number(quantity_used);
      if (!part_id || !(qty > 0)) throw Object.assign(new Error('Each part needs part_id and quantity_used > 0'), { status: 400 });

      // Row lock prevents two concurrent orders from overdrawing the same part
      const [[part]] = await conn.query('SELECT * FROM spare_part WHERE part_id = ? FOR UPDATE', [part_id]);
      if (!part) throw Object.assign(new Error(`Spare part ${part_id} not found`), { status: 400 });
      if (part.quantity_in_stock < qty) {
        throw Object.assign(new Error(`Insufficient stock for ${part.part_name} (have ${part.quantity_in_stock}, need ${qty})`), { status: 409 });
      }
      await conn.query('UPDATE spare_part SET quantity_in_stock = quantity_in_stock - ? WHERE part_id = ?', [qty, part_id]);
      partsCost += part.unit_cost * qty;
    }

    const [result] = await conn.query(
      `INSERT INTO work_order (machine_id, component_id, technician_id, status, cost, risk_score_at_creation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [machine_id, component_id || null, technician_id || null, status, partsCost + Number(labour_cost), riskScore]
    );
    const workOrderId = result.insertId;

    for (const { part_id, quantity_used } of parts) {
      await conn.query('INSERT INTO work_order_part (work_order_id, part_id, quantity_used) VALUES (?, ?, ?)', [
        workOrderId,
        part_id,
        quantity_used,
      ]);
    }

    await conn.commit();
    const [[order]] = await pool.query('SELECT * FROM v_work_order_details WHERE work_order_id = ?', [workOrderId]);
    res.status(201).json(order);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const fields = {};
    if (req.body.status !== undefined) {
      if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
      fields.status = req.body.status;
    }
    if (req.body.technician_id !== undefined) fields.technician_id = req.body.technician_id || null;
    if (!Object.keys(fields).length) return res.status(400).json({ error: 'Nothing to update' });

    const [result] = await pool.query('UPDATE work_order SET ? WHERE work_order_id = ?', [fields, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    const [[order]] = await pool.query('SELECT * FROM v_work_order_details WHERE work_order_id = ?', [req.params.id]);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM work_order WHERE work_order_id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
