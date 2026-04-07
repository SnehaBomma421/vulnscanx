import { useContext, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, ShieldAlert, Clock, Trash2, Download, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ScanForm from '../components/ScanForm';
import ReportCard from '../components/ReportCard';

export default function Dashboard() {
  const { user, logout, loading } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      fetchHistory();
    }
  }, [user, loading]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/scan/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(Array.isArray(data) ? data : []);
      } else {
        throw new Error(data.message || 'Failed to fetch scan history');
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
      // Ensure we have an empty array if failure occurs to avoid map errors
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const handleDeleteScan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scan?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/scan/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setHistory(history.filter(s => s._id !== id));
        if (activeReport && activeReport._id === id) {
          setActiveReport(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server returned ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to delete scan:', err);
      alert('Error: Could not delete scan. ' + err.message);
    }
  };
  
  const handleDownload = async (scanId, target, reportFile) => {
    try {
      console.log(`[Frontend] Initiating download for scan: ${scanId}`);
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/scans/${scanId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Download failed');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const isPDF = reportFile && reportFile.endsWith('.pdf');
      a.download = `report_${target.replace(/[^a-z0-9]/gi, '_')}.${isPDF ? 'pdf' : 'json'}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      console.log('[Frontend] Download Successful');
    } catch (err) {
      console.error('[Frontend] Download error:', err);
      alert('Error: Could not download report. ' + err.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleScanComplete = (report) => {
    setActiveReport(report);
    // Refresh history
    fetchHistory();
  };

  // --- Analytics Data Processing ---
  const totalScans = history.length;
  const highRisk = history.filter(s => s.overallRisk === 'High').length;
  const mediumRisk = history.filter(s => s.overallRisk === 'Medium').length;
  const lowRisk = history.filter(s => s.overallRisk === 'Low' || s.overallRisk === 'Safe' || !s.overallRisk).length;

  const pieData = [
    { name: 'High Risk', value: highRisk, color: 'var(--neon-red)' },
    { name: 'Medium Risk', value: mediumRisk, color: 'var(--neon-yellow)' },
    { name: 'Low/Safe', value: lowRisk, color: 'var(--neon-green)' },
  ].filter(item => item.value > 0);

  // Group by date for line chart (reverse to chronological)
  const trendMap = {};
  [...history].reverse().forEach(scan => {
    if (!scan.createdAt) return;
    const date = new Date(scan.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
    trendMap[date] = (trendMap[date] || 0) + 1;
  });
  
  const trendData = Object.keys(trendMap).map(date => ({
    date,
    scans: trendMap[date]
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--neon-blue)', padding: '10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0, 212, 255, 0.2)' }}>
          <p style={{ color: '#fff', margin: 0, fontFamily: 'Fira Code', fontSize: '0.9rem' }}>
            {`${label || payload[0].name}: `}<span style={{ color: payload[0].payload.color || 'var(--neon-blue)' }}>{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="auth-container">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="container">
      <nav className="navbar">
        <div className="nav-brand">
          <ShieldAlert color="var(--neon-green)" />
          VulnScan<span>X</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'Fira Code', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            OPERATIVE: {user.email}
          </span>
          <button className="btn-logout" onClick={handleLogout} title="Disconnect">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main>
        <div className="main-scan-area">
          <div className="typing-container">
            <h2 className="typing-text">System Ready. Awaiting Target Coordinates...</h2>
          </div>
          
          <ScanForm onScanComplete={handleScanComplete} />
        </div>

        {/* Analytics Section */}
        {history.length > 0 && (
          <div style={{ marginBottom: '4rem' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={20} color="var(--neon-green)" /> Security Posture Analytics
            </h3>
            
            <div className="analytics-grid">
              <div className="summary-card total">
                <div className="summary-value" style={{ color: 'var(--neon-blue)' }}>{totalScans}</div>
                <div className="summary-label">Total Scans</div>
              </div>
              <div className="summary-card high">
                <div className="summary-value" style={{ color: 'var(--neon-red)' }}>{highRisk}</div>
                <div className="summary-label">High Risk</div>
              </div>
              <div className="summary-card medium">
                <div className="summary-value" style={{ color: 'var(--neon-yellow)' }}>{mediumRisk}</div>
                <div className="summary-label">Medium Risk</div>
              </div>
              <div className="summary-card low">
                <div className="summary-value" style={{ color: 'var(--neon-green)' }}>{lowRisk}</div>
                <div className="summary-label">Low/Safe</div>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-box">
                <h4 className="chart-title">Risk Distribution</h4>
                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-box">
                <h4 className="chart-title">Scan Activity Trend</h4>
                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="scans" 
                        stroke="var(--neon-blue)" 
                        strokeWidth={2} 
                        dot={{ fill: 'var(--bg-card)', stroke: 'var(--neon-blue)', strokeWidth: 2, r: 4 }} 
                        activeDot={{ r: 6, fill: 'var(--neon-green)', stroke: 'none' }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReport && (
          <div style={{ marginBottom: '4rem' }}>
            <h3 className="section-title">Scan Report: {activeReport.target}</h3>
            <div className="report-grid">
              {(activeReport.issues || []).map((issue, idx) => (
                <ReportCard key={idx} issue={issue} />
              ))}
              {(!activeReport.issues || activeReport.issues.length === 0) && (
                <div style={{ color: 'var(--neon-green)', fontFamily: 'Fira Code' }}>
                  [+] No vulnerabilities detected. Target appears secure.
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="var(--neon-blue)" /> Scan History
          </h3>
          
          <div className="history-list">
            {isLoadingHistory ? (
              <div style={{ color: 'var(--text-muted)' }}>Accessing databanks...</div>
            ) : history.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No historical data found.</div>
            ) : (
              history.map((scan) => (
                <div className="history-item" key={scan._id}>
                  <div className="target">Target: {scan.target}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`badge badge-${(scan.overallRisk || 'safe').toLowerCase()}`}>
                      Risk: {scan.overallRisk || 'Safe'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {scan.createdAt ? new Date(scan.createdAt).toLocaleString() : 'N/A'}
                    </span>
                    <button 
                      className="btn" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--neon-blue)', color: 'var(--neon-blue)', width: 'auto' }}
                      onClick={() => {
                        setActiveReport(scan);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      View Report
                    </button>
                    {scan.reportFile && (
                      <button 
                        className="btn" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--neon-green)', color: 'var(--neon-green)', width: 'auto' }}
                        onClick={() => handleDownload(scan._id, scan.target, scan.reportFile)}
                        title="Download Report"
                      >
                        <Download size={14} /> Download Report
                      </button>
                    )}
                    <button 
                      className="btn" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', width: 'auto' }}
                      onClick={() => handleDeleteScan(scan._id)}
                      title="Delete Scan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
