import { useContext, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, ShieldAlert, Clock, Trash2, Download } from 'lucide-react';
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
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
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

        {activeReport && (
          <div style={{ marginBottom: '4rem' }}>
            <h3 className="section-title">Scan Report: {activeReport.target}</h3>
            <div className="report-grid">
              {activeReport.issues.map((issue, idx) => (
                <ReportCard key={idx} issue={issue} />
              ))}
              {activeReport.issues.length === 0 && (
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
                    <span className={`badge badge-${scan.overallRisk.toLowerCase()}`}>
                      Risk: {scan.overallRisk}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(scan.createdAt).toLocaleString()}
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
