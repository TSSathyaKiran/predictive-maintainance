import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './db/mysql.js';
import crudRouter from './routes/crudRouter.js';
import machines from './routes/machines.js';
import workOrders from './routes/workOrders.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const status = { mysql: 'down' };
  try {
    await pool.query('SELECT 1');
    status.mysql = 'up';
  } catch {
    // reported as down
  }
  res.json(status);
});

// ---- MySQL-backed resources ----
app.use('/api/machines', machines);
app.use('/api/components', crudRouter({ table: 'component', idColumn: 'component_id', columns: ['component_name'] }));
app.use(
  '/api/technicians',
  crudRouter({ table: 'technician', idColumn: 'technician_id', columns: ['name', 'specialization', 'contact_number'] })
);
app.use(
  '/api/spare-parts',
  crudRouter({ table: 'spare_part', idColumn: 'part_id', columns: ['part_name', 'quantity_in_stock', 'unit_cost'] })
);
app.use(
  '/api/maintenance-records',
  crudRouter({
    table: 'maintenance_record',
    idColumn: 'maintenance_id',
    columns: ['machine_id', 'component_id', 'maintenance_date', 'maintenance_type', 'is_failure'],
    orderBy: 'maintenance_date DESC',
  })
);
app.use('/api/work-orders', workOrders);

// Error handler: maps MySQL constraint errors to readable 4xx responses
app.use((err, req, res, next) => {
  const mysqlErrors = {
    ER_DUP_ENTRY: [409, 'Duplicate value'],
    ER_NO_REFERENCED_ROW_2: [400, 'Referenced record does not exist'],
    ER_ROW_IS_REFERENCED_2: [409, 'Record is referenced by other records'],
    ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Value violates a check constraint'],
  };
  const [status, message] = mysqlErrors[err.code] || [err.status || 500, err.message];
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
