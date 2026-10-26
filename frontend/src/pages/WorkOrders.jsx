import { useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';
import { money } from './MasterData.jsx';

const STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];
const emptyForm = { machine_id: '', component_id: '', technician_id: '', labour_cost: 0, parts: [] };

export default function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [lookups, setLookups] = useState({ machines: [], components: [], technicians: [], parts: [] });
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api
      .get(`/work-orders${statusFilter ? `?status=${statusFilter}` : ''}`)
      .then(setOrders)
      .catch((e) => setError(e.message));

  const loadLookups = () =>
    Promise.all(['/machines', '/components', '/technicians', '/spare-parts'].map(api.get)).then(
      ([machines, components, technicians, parts]) => setLookups({ machines, components, technicians, parts })
    );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    loadLookups();
  }, []);

  const updatePart = (i, key, value) =>
    setForm({ ...form, parts: form.parts.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)) });

  const estimatedCost =
    Number(form?.labour_cost || 0) +
    (form?.parts || []).reduce((sum, p) => {
      const part = lookups.parts.find((sp) => sp.part_id === Number(p.part_id));
      return sum + (part ? part.unit_cost * Number(p.quantity_used || 0) : 0);
    }, 0);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/work-orders', {
        ...form,
        parts: form.parts.filter((p) => p.part_id).map((p) => ({ part_id: Number(p.part_id), quantity_used: Number(p.quantity_used) })),
      });
      setForm(null);
      load();
      loadLookups(); // stock levels changed
    } catch (err) {
      setError(err.message);
    }
  };

  const changeStatus = async (order, status) => {
    setError('');
    try {
      await api.patch(`/work-orders/${order.work_order_id}`, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (order) => {
    if (!confirm(`Delete work order #${order.work_order_id}?`)) return;
    try {
      await api.del(`/work-orders/${order.work_order_id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <div className="page-header">
        <h2>Work Orders</h2>
        <div className="toolbar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setForm(emptyForm)}>+ New work order</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {form && (
        <form className="card" onSubmit={create}>
          <div className="form-grid">
            <label>
              <span>Machine</span>
              <select required value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })}>
                <option value="">— select —</option>
                {lookups.machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>
                    #{m.machine_id} ({m.model}, {m.age_years}y)
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Component</span>
              <select value={form.component_id} onChange={(e) => setForm({ ...form, component_id: e.target.value })}>
                <option value="">— none —</option>
                {lookups.components.map((c) => (
                  <option key={c.component_id} value={c.component_id}>
                    {c.component_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Technician</span>
              <select value={form.technician_id} onChange={(e) => setForm({ ...form, technician_id: e.target.value })}>
                <option value="">— unassigned —</option>
                {lookups.technicians.map((t) => (
                  <option key={t.technician_id} value={t.technician_id}>
                    {t.name} ({t.specialization})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Labour cost (₹)</span>
              <input type="number" min="0" step="0.01" value={form.labour_cost} onChange={(e) => setForm({ ...form, labour_cost: e.target.value })} />
            </label>
          </div>

          <h4>Spare parts used</h4>
          {form.parts.map((p, i) => (
            <div className="part-row" key={i}>
              <select value={p.part_id} onChange={(e) => updatePart(i, 'part_id', e.target.value)}>
                <option value="">— part —</option>
                {lookups.parts.map((sp) => (
                  <option key={sp.part_id} value={sp.part_id}>
                    {sp.part_name} ({sp.quantity_in_stock} in stock, {money(sp.unit_cost)})
                  </option>
                ))}
              </select>
              <input type="number" min="1" value={p.quantity_used} onChange={(e) => updatePart(i, 'quantity_used', e.target.value)} />
              <button type="button" className="link danger" onClick={() => setForm({ ...form, parts: form.parts.filter((_, idx) => idx !== i) })}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setForm({ ...form, parts: [...form.parts, { part_id: '', quantity_used: 1 }] })}>
            + Add part
          </button>

          <div className="form-actions">
            <strong>Estimated cost: {money(estimatedCost)}</strong>
            <button type="submit">Create</button>
            <button type="button" className="secondary" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Machine</th>
              <th>Component</th>
              <th>Technician</th>
              <th>Created</th>
              <th>Cost</th>
              <th>Risk at creation</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.work_order_id}>
                <td>{o.work_order_id}</td>
                <td>
                  #{o.machine_id} ({o.machine_model})
                </td>
                <td>{o.component_name || '—'}</td>
                <td>{o.technician_name || '—'}</td>
                <td>{formatDate(o.created_date)}</td>
                <td>{money(o.cost)}</td>
                <td>{o.risk_score_at_creation != null ? o.risk_score_at_creation.toFixed(3) : '—'}</td>
                <td>
                  <select className={`status ${o.status}`} value={o.status} onChange={(e) => changeStatus(o, e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="link danger" onClick={() => remove(o)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={9} className="muted">
                  No work orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
