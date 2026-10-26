import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, formatDate } from '../api.js';
import { RiskBar } from './Dashboard.jsx';

export default function RiskScores() {
  const [params, setParams] = useSearchParams();
  const machineId = params.get('machine') || '';
  const [machines, setMachines] = useState([]);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/machines').then(setMachines);
  }, []);

  useEffect(() => {
    api
      .get(machineId ? `/risk-scores?machine_id=${machineId}` : '/risk-scores/latest')
      .then(setScores)
      .catch((e) => setError(e.message));
  }, [machineId]);

  return (
    <section>
      <div className="page-header">
        <h2>Risk Scores</h2>
        <select value={machineId} onChange={(e) => setParams(e.target.value ? { machine: e.target.value } : {})}>
          <option value="">Latest score of every machine</option>
          {machines.map((m) => (
            <option key={m.machine_id} value={m.machine_id}>
              History of machine #{m.machine_id}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Machine</th>
              <th>Score date</th>
              <th>Risk</th>
              <th>Errors 7d / 30d</th>
              <th>Failures 90d</th>
              <th>Days since maint.</th>
              <th>Batch job</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.risk_id}>
                <td>#{s.machine_id}</td>
                <td>{formatDate(s.score_date)}</td>
                <td>
                  <RiskBar value={s.risk_value} />
                </td>
                <td>
                  {s.features?.errors_7d} / {s.features?.errors_30d}
                </td>
                <td>{s.features?.failures_90d}</td>
                <td>{s.features?.days_since_maintenance}</td>
                <td className="mono muted">{s.source_batch_job}</td>
              </tr>
            ))}
            {!scores.length && (
              <tr>
                <td colSpan={7} className="muted">
                  No scores yet. Run the risk batch job from the dashboard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
