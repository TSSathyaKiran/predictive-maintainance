-- Sample data modelled on the Azure Predictive Maintenance dataset
-- (machine models model1-model4, components comp1-comp4).
USE predictive_maintenance;

INSERT INTO machine (model, age_years) VALUES
  ('model3', 18), ('model4', 7), ('model3', 8), ('model3', 7), ('model3', 2),
  ('model3', 7), ('model4', 20), ('model3', 16), ('model4', 7), ('model4', 10),
  ('model2', 6), ('model3', 9), ('model1', 15), ('model3', 1), ('model2', 14);

INSERT INTO component (component_name) VALUES
  ('comp1'), ('comp2'), ('comp3'), ('comp4');

INSERT INTO technician (name, specialization, contact_number) VALUES
  ('Arjun Mehta',   'Electrical',   '9876500001'),
  ('Priya Nair',    'Mechanical',   '9876500002'),
  ('Rahul Verma',   'Hydraulics',   '9876500003'),
  ('Sneha Iyer',    'Electronics',  '9876500004'),
  ('Karthik Reddy', 'Mechanical',   '9876500005');

INSERT INTO spare_part (part_name, quantity_in_stock, unit_cost) VALUES
  ('Bearing assembly',    40, 1250.00),
  ('Drive belt',          65,  480.00),
  ('Hydraulic seal kit',  25, 2100.00),
  ('Control board',        8, 9800.00),
  ('Cooling fan',         30,  760.00),
  ('Pressure sensor',     18, 3400.00);

INSERT INTO maintenance_record (machine_id, component_id, maintenance_date, maintenance_type, is_failure) VALUES
  (1,  2, DATE_SUB(NOW(), INTERVAL 75 DAY), 'preventive', FALSE),
  (1,  4, DATE_SUB(NOW(), INTERVAL 20 DAY), 'corrective', TRUE),
  (1,  1, DATE_SUB(NOW(), INTERVAL  6 DAY), 'corrective', TRUE),
  (2,  1, DATE_SUB(NOW(), INTERVAL 40 DAY), 'preventive', FALSE),
  (3,  3, DATE_SUB(NOW(), INTERVAL 55 DAY), 'inspection', FALSE),
  (3,  2, DATE_SUB(NOW(), INTERVAL 12 DAY), 'preventive', FALSE),
  (4,  4, DATE_SUB(NOW(), INTERVAL 33 DAY), 'corrective', TRUE),
  (5,  1, DATE_SUB(NOW(), INTERVAL  9 DAY), 'inspection', FALSE),
  (6,  2, DATE_SUB(NOW(), INTERVAL 61 DAY), 'preventive', FALSE),
  (7,  3, DATE_SUB(NOW(), INTERVAL 48 DAY), 'corrective', TRUE),
  (7,  1, DATE_SUB(NOW(), INTERVAL 15 DAY), 'corrective', TRUE),
  (7,  2, DATE_SUB(NOW(), INTERVAL  3 DAY), 'inspection', FALSE),
  (8,  4, DATE_SUB(NOW(), INTERVAL 27 DAY), 'preventive', FALSE),
  (9,  2, DATE_SUB(NOW(), INTERVAL 70 DAY), 'preventive', FALSE),
  (10, 3, DATE_SUB(NOW(), INTERVAL 22 DAY), 'corrective', TRUE),
  (11, 1, DATE_SUB(NOW(), INTERVAL 18 DAY), 'inspection', FALSE),
  (12, 4, DATE_SUB(NOW(), INTERVAL 44 DAY), 'preventive', FALSE),
  (13, 2, DATE_SUB(NOW(), INTERVAL 10 DAY), 'corrective', TRUE),
  (13, 3, DATE_SUB(NOW(), INTERVAL 80 DAY), 'preventive', FALSE),
  (14, 1, DATE_SUB(NOW(), INTERVAL  5 DAY), 'inspection', FALSE),
  (15, 4, DATE_SUB(NOW(), INTERVAL 36 DAY), 'corrective', TRUE);

INSERT INTO work_order (machine_id, component_id, technician_id, created_date, status, cost) VALUES
  (1,  1, 2, DATE_SUB(NOW(), INTERVAL 6 DAY),  'completed',   2500.00),
  (7,  1, 5, DATE_SUB(NOW(), INTERVAL 15 DAY), 'completed',   1730.00),
  (13, 2, 1, DATE_SUB(NOW(), INTERVAL 2 DAY),  'in_progress',  960.00),
  (10, 3, 3, DATE_SUB(NOW(), INTERVAL 1 DAY),  'open',        2100.00);

INSERT INTO work_order_part (work_order_id, part_id, quantity_used) VALUES
  (1, 1, 2),
  (2, 1, 1), (2, 2, 1),
  (3, 2, 2),
  (4, 3, 1);
