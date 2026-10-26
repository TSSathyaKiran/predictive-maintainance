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
| _Teammate_ | MongoDB models & seed data, error log / risk score APIs, risk scoring batch job, cross-database dashboard |

## Running locally

Prerequisites: Node.js 18+, MySQL 8+.

```bash
# 1. Backend
cd backend
cp .env.example .env        # edit DB credentials if needed
npm install
npm run db:init             # creates + seeds the MySQL database (drops it first!)
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
