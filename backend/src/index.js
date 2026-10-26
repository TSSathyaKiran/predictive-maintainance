import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './db/mysql.js';
import { connectMongo, isMongoUp } from './db/mongo.js';
import crudRouter from './routes/crudRouter.js';
import machines from './routes/machines.js';
import workOrders from './routes/workOrders.js';
import errorLogs from './routes/errorLogs.js';
import riskScores from './routes/riskScores.js';
import dashboard from './routes/dashboard.js';
import { runRiskBatch } from './jobs/riskBatch.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const status = { mysql: 'down', mongodb: isMongoUp() ? 'up' : 'down' };
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

// ---- MongoDB-backed resources ----
app.use('/api/error-logs', errorLogs);
app.use('/api/risk-scores', riskScores);

// ---- Cross-database ----
app.use('/api/dashboard', dashboard);

// Error handler: maps MySQL constraint errors and Mongoose validation errors to readable 4xx responses
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
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

const PORT = process.env.PORT || 5001;
connectMongo()
  .then(() => {
    // Optional periodic scoring, e.g. RISK_BATCH_INTERVAL_MINUTES=60
    const minutes = Number(process.env.RISK_BATCH_INTERVAL_MINUTES);
    if (minutes > 0) {
      setInterval(() => runRiskBatch().then((r) => console.log(`${r.jobId}: scored ${r.machinesScored} machines`)).catch(console.error), minutes * 60000);
      console.log(`Risk batch job scheduled every ${minutes} min`);
    }
  })
  .catch((err) => console.error('MongoDB connection failed:', err.message))
  .finally(() => app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`)));
