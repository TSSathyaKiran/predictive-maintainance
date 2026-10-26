-- Relational schema for the Predictive Maintenance system (MySQL 8+)
-- Holds master data and transactional records that need ACID guarantees.
-- High-volume telemetry (error logs, risk scores) lives in MongoDB.

DROP DATABASE IF EXISTS predictive_maintenance;
CREATE DATABASE predictive_maintenance;
USE predictive_maintenance;

CREATE TABLE machine (
  machine_id   INT AUTO_INCREMENT PRIMARY KEY,
  model        VARCHAR(50) NOT NULL,
  age_years    INT NOT NULL,
  CONSTRAINT chk_machine_age CHECK (age_years >= 0)
);

CREATE TABLE component (
  component_id   INT AUTO_INCREMENT PRIMARY KEY,
  component_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE technician (
  technician_id  INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  specialization VARCHAR(100),
  contact_number VARCHAR(20)
);

CREATE TABLE spare_part (
  part_id           INT AUTO_INCREMENT PRIMARY KEY,
  part_name         VARCHAR(100) NOT NULL,
  quantity_in_stock INT NOT NULL DEFAULT 0,
  unit_cost         DECIMAL(10, 2) NOT NULL,
  CONSTRAINT chk_part_stock CHECK (quantity_in_stock >= 0),
  CONSTRAINT chk_part_cost  CHECK (unit_cost >= 0)
);

-- MACHINE 1 --undergoes-- M MAINTENANCE_RECORD
-- COMPONENT 1 --replaced in-- M MAINTENANCE_RECORD
CREATE TABLE maintenance_record (
  maintenance_id   INT AUTO_INCREMENT PRIMARY KEY,
  machine_id       INT NOT NULL,
  component_id     INT NULL,
  maintenance_date DATETIME NOT NULL,
  maintenance_type ENUM('preventive', 'corrective', 'inspection') NOT NULL,
  is_failure       BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_mr_machine   FOREIGN KEY (machine_id)   REFERENCES machine(machine_id)     ON DELETE CASCADE,
  CONSTRAINT fk_mr_component FOREIGN KEY (component_id) REFERENCES component(component_id) ON DELETE SET NULL,
  INDEX idx_mr_machine_date (machine_id, maintenance_date)
);

-- MACHINE 1 --has-- M WORK_ORDER
-- COMPONENT 1 --targeted by-- M WORK_ORDER
-- TECHNICIAN 1 --assigned to-- M WORK_ORDER
CREATE TABLE work_order (
  work_order_id          INT AUTO_INCREMENT PRIMARY KEY,
  machine_id             INT NOT NULL,
  component_id           INT NULL,
  technician_id          INT NULL,
  created_date           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status                 ENUM('open', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'open',
  cost                   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  risk_score_at_creation DECIMAL(5, 4) NULL,
  CONSTRAINT fk_wo_machine    FOREIGN KEY (machine_id)    REFERENCES machine(machine_id)       ON DELETE CASCADE,
  CONSTRAINT fk_wo_component  FOREIGN KEY (component_id)  REFERENCES component(component_id)   ON DELETE SET NULL,
  CONSTRAINT fk_wo_technician FOREIGN KEY (technician_id) REFERENCES technician(technician_id) ON DELETE SET NULL,
  INDEX idx_wo_status (status)
);

-- Associative entity: WORK_ORDER M --consumes/uses-- N SPARE_PART
CREATE TABLE work_order_part (
  work_order_id INT NOT NULL,
  part_id       INT NOT NULL,
  quantity_used INT NOT NULL,
  PRIMARY KEY (work_order_id, part_id),
  CONSTRAINT fk_wop_wo   FOREIGN KEY (work_order_id) REFERENCES work_order(work_order_id) ON DELETE CASCADE,
  CONSTRAINT fk_wop_part FOREIGN KEY (part_id)       REFERENCES spare_part(part_id)       ON DELETE RESTRICT,
  CONSTRAINT chk_wop_qty CHECK (quantity_used > 0)
);

-- Convenience view used by the work order list
CREATE VIEW v_work_order_details AS
SELECT wo.work_order_id, wo.machine_id, m.model AS machine_model,
       wo.component_id, c.component_name,
       wo.technician_id, t.name AS technician_name,
       wo.created_date, wo.status, wo.cost, wo.risk_score_at_creation
FROM work_order wo
JOIN machine m         ON m.machine_id = wo.machine_id
LEFT JOIN component c  ON c.component_id = wo.component_id
LEFT JOIN technician t ON t.technician_id = wo.technician_id;
