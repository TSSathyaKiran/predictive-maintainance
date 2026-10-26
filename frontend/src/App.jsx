import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Components, Machines, MaintenanceRecords, SpareParts, Technicians } from './pages/MasterData.jsx';
import WorkOrders from './pages/WorkOrders.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ErrorLogs from './pages/ErrorLogs.jsx';
import RiskScores from './pages/RiskScores.jsx';

const NAV = [
  { section: 'Analytics (MongoDB)' },
  { to: '/dashboard', label: 'Risk Dashboard' },
  { to: '/risk-scores', label: 'Risk Scores' },
  { to: '/error-logs', label: 'Error Logs' },
  { section: 'Operations (MySQL)' },
  { to: '/work-orders', label: 'Work Orders' },
  { to: '/maintenance', label: 'Maintenance Records' },
  { section: 'Master Data (MySQL)' },
  { to: '/machines', label: 'Machines' },
  { to: '/components', label: 'Components' },
  { to: '/technicians', label: 'Technicians' },
  { to: '/spare-parts', label: 'Spare Parts' },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>
          PdM<span>Hybrid DBMS</span>
        </h1>
        <nav>
          {NAV.map((item) =>
            item.section ? (
              <div key={item.section} className="nav-section">
                {item.section}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/risk-scores" element={<RiskScores />} />
          <Route path="/error-logs" element={<ErrorLogs />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/maintenance" element={<MaintenanceRecords />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="/components" element={<Components />} />
          <Route path="/technicians" element={<Technicians />} />
          <Route path="/spare-parts" element={<SpareParts />} />
        </Routes>
      </main>
    </div>
  );
}
