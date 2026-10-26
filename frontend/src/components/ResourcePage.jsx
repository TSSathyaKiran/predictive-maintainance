import { useEffect, useState } from 'react';
import { api, toLocalInput } from '../api.js';

// Generic list + create/edit/delete page for a REST resource.
//   fields:  [{ name, label, type, required, options, optionsFrom: { url, value, label } }]
//   columns: [{ key, label, render(row) }]
export default function ResourcePage({ title, endpoint, idField, fields, columns }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [lookups, setLookups] = useState({});
  const [error, setError] = useState('');

  const emptyForm = () => Object.fromEntries(fields.map((f) => [f.name, f.type === 'checkbox' ? false : '']));

  const load = () => api.get(endpoint).then(setRows).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    fields
      .filter((f) => f.optionsFrom)
      .forEach((f) =>
        api.get(f.optionsFrom.url).then((data) =>
          setLookups((prev) => ({
            ...prev,
            [f.name]: data.map((d) => ({ value: d[f.optionsFrom.value], label: f.optionsFrom.label(d) })),
          }))
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (row) => {
    setEditingId(row[idField]);
    setForm(
      Object.fromEntries(
        fields.map((f) => [f.name, f.type === 'datetime' ? toLocalInput(row[f.name]) : f.type === 'checkbox' ? !!row[f.name] : row[f.name] ?? ''])
      )
    );
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) await api.put(`${endpoint}/${editingId}`, form);
      else await api.post(endpoint, form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete ${title.replace(/s$/, '').toLowerCase()} #${row[idField]}?`)) return;
    setError('');
    try {
      await api.del(`${endpoint}/${row[idField]}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const renderInput = (f) => {
    const value = form[f.name];
    const onChange = (e) => setForm({ ...form, [f.name]: f.type === 'checkbox' ? e.target.checked : e.target.value });
    if (f.type === 'checkbox') return <input type="checkbox" checked={value} onChange={onChange} />;
    const options = f.options || lookups[f.name];
    if (options) {
      return (
        <select value={value} onChange={onChange} required={f.required}>
          <option value="">— select —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    const type = f.type === 'datetime' ? 'datetime-local' : f.type || 'text';
    return <input type={type} value={value} onChange={onChange} required={f.required} step={f.step} min={f.min} />;
  };

  return (
    <section>
      <div className="page-header">
        <h2>{title}</h2>
        <button onClick={startCreate}>+ Add</button>
      </div>

      {error && <div className="error">{error}</div>}

      {form && (
        <form className="card form-grid" onSubmit={save}>
          {fields.map((f) => (
            <label key={f.name}>
              <span>{f.label}</span>
              {renderInput(f)}
            </label>
          ))}
          <div className="form-actions">
            <button type="submit">{editingId ? 'Update' : 'Create'}</button>
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
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[idField]}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
                <td className="row-actions">
                  <button className="link" onClick={() => startEdit(row)}>
                    Edit
                  </button>
                  <button className="link danger" onClick={() => remove(row)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length + 1} className="muted">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
