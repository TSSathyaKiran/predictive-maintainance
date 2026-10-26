import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../api.js';
import { money } from './MasterData.jsx';

export const RiskBar = ({ value }) =>
  value == null ? (
    <span className="muted">not scored</span>
  ) : (
    <div className="risk-bar" title={value.toFixed(4)}>
      <div className={`risk-fill ${value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low'}`} style={{ width: `${value * 100}%` }} />
      <span>{(value * 100).toFixed(1)}%</span>
    </div>
  );

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/dashboard').then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const runBatch = async () => {
    setRunning(true);
    setError('');
    try {
      await api.post('/risk-scores/run');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (!data) return error ? <div className="error">{error}</div> : <p className="muted">Loading…</p>;
  const { summary, machines, lowStock } = data;

  return (
    <section>
      <div className="page-header">
        <h2>Fleet Risk Dashboard</h2>
        <div className="toolbar">
          <span className="muted">Last batch: {formatDate(summary.last_batch)}</span>
          <button onClick={runBatch} disabled={running}>
            {running ? 'Scoring…' : 'Run risk batch job'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats">
        <div className="stat card">
          <span>Machines</span>
          <strong>{summary.machines}</strong>
        </div>
        <div className="stat card">
          <span>High risk (≥ 70%)</span>
          <strong className="text-danger">{summary.high_risk}</strong>
        </div>
        <div className="stat card">
          <span>Open work orders</span>
          <strong>{summary.open_work_orders}</strong>
        </div>
        <div className="stat card">
          <span>Errors (7 days)</span>
          <strong>{summary.errors_7d}</strong>
        </div>
        <div className="stat card">
          <span>Maintenance cost (30 days)</span>
          <strong>{money(summary.cost_30d)}</strong>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="error warn-box">
          Low stock: {lowStock.map((p) => `${p.part_name} (${p.quantity_in_stock})`).join(', ')}
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Machine</th>
              <th>Model</th>
              <th>Age</th>
              <th>Failure risk</th>
              <th>Errors (7d)</th>
              <th>Failures (90d)</th>
              <th>Open WOs</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => (
              <tr key={m.machine_id}>
                <td>#{m.machine_id}</td>
                <td>{m.model}</td>
                <td>{m.age_years}y</td>
                <td>
                  <RiskBar value={m.risk_value} />
                </td>
                <td>{m.errors_7d ?? '—'}</td>
                <td>{m.failures_90d ?? '—'}</td>
                <td>{m.open_work_orders}</td>
                <td>
                  <Link to={`/risk-scores?machine=${m.machine_id}`}>History</Link>
                  {' · '}
                  <Link to={`/error-logs?machine=${m.machine_id}`}>Errors</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
