# Predictive Maintenance of Industrial Machinery: A Hybrid Big Data-DBMS Architecture

A full-stack DBMS project that combines a **relational database (MySQL)** for transactional
maintenance data with a **NoSQL database (MongoDB)** for high-volume machine telemetry.

## Architecture

```
React (Vite) frontend  ──►  Express REST API  ──┬──►  MySQL    machines, components, technicians,
                                                │              spare parts, maintenance records,
                                                │              work orders, work order parts
                                                │
                                                └──►  MongoDB  error logs, risk scores
                                                               (append-heavy, time-series data)
```

**Why two databases?**

| Data | Store | Reason |
|------|-------|--------|
| Machines, components, technicians, spare parts | MySQL | Master data with strict referential integrity |
| Maintenance records, work orders, work order parts | MySQL | Multi-table writes need ACID transactions (e.g. stock is decremented atomically when a work order consumes parts) |
| Error logs | MongoDB | Very high write volume, schema-flexible, queried by time range |
| Risk scores | MongoDB | Output of batch analytics jobs, append-only history per machine |

## ER model → schema mapping

| Entity (ER diagram) | Implementation |
|---------------------|----------------|
| MACHINE, COMPONENT, TECHNICIAN, SPARE_PART | MySQL tables |
| MAINTENANCE_RECORD | MySQL table, FKs to `machine` and `component` |
| WORK_ORDER | MySQL table, FKs to `machine`, `component`, `technician` |
| WORK_ORDER_PART | MySQL associative table (composite PK) resolving the M:N between work orders and spare parts |
| ERROR_LOG | MongoDB collection `error_logs` |
| RISK_SCORE | MongoDB collection `risk_scores` |

See [backend/sql/schema.sql](backend/sql/schema.sql) for the full DDL.

## Team

| Member | Responsibilities |
|--------|------------------|
| TS Sathya Kiran | MySQL schema & seed data, Express API (master data CRUD, transactional work orders), frontend for operations & master data |
| Sushanth Babu | MongoDB models & seed data, error log / risk score APIs, risk scoring batch job, cross-database dashboard |

## Running locally

Prerequisites: Node.js 18+, MySQL 8+, MongoDB 6+.

```bash
# 1. Backend
cd backend
cp .env.example .env        # edit DB credentials if needed
npm install
npm run db:init             # creates + seeds the MySQL database (drops it first!)
npm run db:seed-mongo       # generates synthetic error logs in MongoDB
npm run risk:run            # runs the risk scoring batch job once
npm run dev                 # API on http://localhost:5001

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # UI on http://localhost:5173
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/machines` | List / create machines |
| GET/PUT/DELETE | `/api/machines/:id` | Read / update / delete a machine |
| GET | `/api/machines/:id/history` | Maintenance and work order history of a machine |
| CRUD | `/api/components`, `/api/technicians`, `/api/spare-parts`, `/api/maintenance-records` | Master data |
| GET/POST | `/api/work-orders` | List (optional `?status=`) / create with parts (transactional) |
| GET/PATCH/DELETE | `/api/work-orders/:id` | Details with parts / update status or technician / delete |
| GET/POST | `/api/error-logs` | Filter (`machine_id`, `error_code`, `from`, `to`, paging) / log an error (MongoDB) |
| GET | `/api/error-logs/summary?days=30` | Aggregated error counts by code and by machine |
| DELETE | `/api/error-logs/:id` | Delete an error log |
| GET | `/api/risk-scores` | Score history (optional `?machine_id=`) |
| GET | `/api/risk-scores/latest` | Latest score of every machine |
| POST | `/api/risk-scores/run` | Run the risk scoring batch job now |
| GET | `/api/dashboard` | Cross-database fleet overview (MySQL + MongoDB) |

## Risk scoring batch job

[backend/src/jobs/riskBatch.js](backend/src/jobs/riskBatch.js) combines features from both databases:

- **MongoDB**: error counts per machine over the last 7 and 30 days (aggregation pipeline)
- **MySQL**: machine age, failures in the last 90 days, days since last maintenance

and produces a logistic score in [0, 1]:

```
z    = -4.5 + 0.035·errors_30d + 0.02·errors_7d + 0.8·failures_90d + 0.08·age_years + 0.015·days_since_maintenance
risk = 1 / (1 + e^-z)
```

Each run appends one `risk_scores` document per machine (tagged with `source_batch_job`). When a
work order is created, the machine's latest score is copied into `work_order.risk_score_at_creation`
in MySQL, so the risk at the time of the decision is preserved. Set `RISK_BATCH_INTERVAL_MINUTES`
in `.env` to run the job periodically.
