import { Router } from 'express';
import pool from '../db/mysql.js';
import crudRouter from './crudRouter.js';

const router = Router();

// Full maintenance + work order history for a single machine
router.get('/:id/history', async (req, res, next) => {
  try {
    const id = req.params.id;
    const [[machine]] = await pool.query('SELECT * FROM machine WHERE machine_id = ?', [id]);
    if (!machine) return res.status(404).json({ error: 'Not found' });

    const [maintenance] = await pool.query(
      `SELECT mr.*, c.component_name
         FROM maintenance_record mr
         LEFT JOIN component c ON c.component_id = mr.component_id
        WHERE mr.machine_id = ?
        ORDER BY mr.maintenance_date DESC`,
      [id]
    );
    const [workOrders] = await pool.query(
      'SELECT * FROM v_work_order_details WHERE machine_id = ? ORDER BY created_date DESC',
      [id]
    );
    res.json({ machine, maintenance, workOrders });
  } catch (err) {
    next(err);
  }
});

router.use(crudRouter({ table: 'machine', idColumn: 'machine_id', columns: ['model', 'age_years'] }));

export default router;
