import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, formatDate } from '../api.js';

const ERROR_CODES = ['error1', 'error2', 'error3', 'error4', 'error5'];

export default function ErrorLogs() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ machine_id: params.get('machine') || '', error_code: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 0 });
  const [summary, setSummary] = useState(null);
  const [machines, setMachines] = useState([]);
  const [newLog, setNewLog] = useState({ machine_id: '', error_code: 'error1' });
  const [error, setError] = useState('');

  const load = () => {
    const qs = new URLSearchParams({ page, limit: 25 });
    const { from, to, ...rest } = filters;
    Object.entries(rest).forEach(([k, v]) => v && qs.set(k, v));
    // Date inputs are whole days in local time
    if (from) qs.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) qs.set('to', new Date(`${to}T23:59:59.999`).toISOString());
    api.get(`/error-logs?${qs}`).then(setData).catch((e) => setError(e.message));
  };

  useEffect(() => {
    api.get('/machines').then(setMachines);
    api.get('/error-logs/summary?days=30').then(setSummary);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters({ ...filters, [key]: value });
  };

  const addLog = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/error-logs', newLog);
      load();
      api.get('/error-logs/summary?days=30').then(setSummary);
    } catch (err) {
      setError(err.message);
    }
  };

  const maxCount = summary ? Math.max(1, ...summary.byCode.map((c) => c.count)) : 1;

  return (
    <section>
      <div className="page-header">
        <h2>Error Logs</h2>
        <span className="muted">MongoDB · {data.total.toLocaleString()} matching records</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="two-col">
        {summary && (
          <div className="card">
            <h4>Errors by code (last 30 days, total {summary.total})</h4>
            {summary.byCode.map((c) => (
              <div key={c.error_code} className="hbar">
                <span>{c.error_code}</span>
                <div>
                  <div style={{ width: `${(c.count / maxCount) * 100}%` }} />
                </div>
                <strong>{c.count}</strong>
              </div>
            ))}
          </div>
        )}

        <form className="card" onSubmit={addLog}>
          <h4>Log a new error</h4>
          <div className="form-grid">
            <label>
              <span>Machine</span>
              <select required value={newLog.machine_id} onChange={(e) => setNewLog({ ...newLog, machine_id: e.target.value })}>
                <option value="">— select —</option>
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>
                    #{m.machine_id} ({m.model})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Error code</span>
              <select value={newLog.error_code} onChange={(e) => setNewLog({ ...newLog, error_code: e.target.value })}>
                {ERROR_CODES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit">Add error log</button>
          </div>
        </form>
      </div>

      <div className="card toolbar">
        <select value={filters.machine_id} onChange={(e) => setFilter('machine_id', e.target.value)}>
          <option value="">All machines</option>
          {machines.map((m) => (
            <option key={m.machine_id} value={m.machine_id}>
              Machine #{m.machine_id}
            </option>
          ))}
        </select>
        <select value={filters.error_code} onChange={(e) => setFilter('error_code', e.target.value)}>
          <option value="">All codes</option>
          {ERROR_CODES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="inline">
          From <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
        </label>
        <label className="inline">
          To <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
        </label>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Error ID</th>
              <th>Machine</th>
              <th>Date / time</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((log) => (
              <tr key={log.error_id}>
                <td className="mono">{log.error_id}</td>
                <td>#{log.machine_id}</td>
                <td>{formatDate(log.error_datetime)}</td>
                <td>
                  <span className="badge warn">{log.error_code}</span>
                </td>
              </tr>
            ))}
            {!data.items.length && (
              <tr>
                <td colSpan={4} className="muted">
                  No error logs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && (
        <div className="pager">
          <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Prev
          </button>
          <span>
            Page {page} of {data.pages}
          </span>
          <button className="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
