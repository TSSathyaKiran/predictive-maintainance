import ResourcePage from '../components/ResourcePage.jsx';
import { formatDate } from '../api.js';

const money = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function Machines() {
  return (
    <ResourcePage
      title="Machines"
      endpoint="/machines"
      idField="machine_id"
      fields={[
        { name: 'model', label: 'Model', required: true },
        { name: 'age_years', label: 'Age (years)', type: 'number', min: 0, required: true },
      ]}
      columns={[
        { key: 'machine_id', label: 'ID' },
        { key: 'model', label: 'Model' },
        { key: 'age_years', label: 'Age (years)' },
      ]}
    />
  );
}

export function Components() {
  return (
    <ResourcePage
      title="Components"
      endpoint="/components"
      idField="component_id"
      fields={[{ name: 'component_name', label: 'Component name', required: true }]}
      columns={[
        { key: 'component_id', label: 'ID' },
        { key: 'component_name', label: 'Name' },
      ]}
    />
  );
}

export function Technicians() {
  return (
    <ResourcePage
      title="Technicians"
      endpoint="/technicians"
      idField="technician_id"
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'specialization', label: 'Specialization' },
        { name: 'contact_number', label: 'Contact number' },
      ]}
      columns={[
        { key: 'technician_id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'specialization', label: 'Specialization' },
        { key: 'contact_number', label: 'Contact' },
      ]}
    />
  );
}

export function SpareParts() {
  return (
    <ResourcePage
      title="Spare Parts"
      endpoint="/spare-parts"
      idField="part_id"
      fields={[
        { name: 'part_name', label: 'Part name', required: true },
        { name: 'quantity_in_stock', label: 'Quantity in stock', type: 'number', min: 0, required: true },
        { name: 'unit_cost', label: 'Unit cost (₹)', type: 'number', step: '0.01', min: 0, required: true },
      ]}
      columns={[
        { key: 'part_id', label: 'ID' },
        { key: 'part_name', label: 'Name' },
        {
          key: 'quantity_in_stock',
          label: 'In stock',
          render: (r) => <span className={r.quantity_in_stock < 10 ? 'badge warn' : ''}>{r.quantity_in_stock}</span>,
        },
        { key: 'unit_cost', label: 'Unit cost', render: (r) => money(r.unit_cost) },
      ]}
    />
  );
}

export function MaintenanceRecords() {
  return (
    <ResourcePage
      title="Maintenance Records"
      endpoint="/maintenance-records"
      idField="maintenance_id"
      fields={[
        {
          name: 'machine_id',
          label: 'Machine',
          required: true,
          optionsFrom: { url: '/machines', value: 'machine_id', label: (m) => `#${m.machine_id} (${m.model})` },
        },
        {
          name: 'component_id',
          label: 'Component',
          optionsFrom: { url: '/components', value: 'component_id', label: (c) => c.component_name },
        },
        { name: 'maintenance_date', label: 'Date', type: 'datetime', required: true },
        {
          name: 'maintenance_type',
          label: 'Type',
          required: true,
          options: ['preventive', 'corrective', 'inspection'].map((t) => ({ value: t, label: t })),
        },
        { name: 'is_failure', label: 'Was a failure?', type: 'checkbox' },
      ]}
      columns={[
        { key: 'maintenance_id', label: 'ID' },
        { key: 'machine_id', label: 'Machine' },
        { key: 'component_id', label: 'Component' },
        { key: 'maintenance_date', label: 'Date', render: (r) => formatDate(r.maintenance_date) },
        { key: 'maintenance_type', label: 'Type' },
        { key: 'is_failure', label: 'Failure', render: (r) => (r.is_failure ? <span className="badge danger">Yes</span> : 'No') },
      ]}
    />
  );
}

export { money };
