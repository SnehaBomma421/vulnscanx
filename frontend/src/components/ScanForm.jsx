import { useState } from 'react';
import { Search } from 'lucide-react';

export default function ScanForm({ onScanComplete }) {
  const [target, setTarget] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const initiateScan = async (e) => {
    e.preventDefault();
    if (!target) return;
    
    setError('');
    setScanning(true);
    setProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return 90; // hold at 90 until fetch finishes
        return p + 10;
      });
    }, 300);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/scan/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ target })
      });

      const data = await res.json();
      clearInterval(progressInterval);
      setProgress(100);
      
      if (!res.ok) {
        throw new Error(data.message || 'Scan failed');
      }

      // Small delay so user sees 100%
      setTimeout(() => {
        setScanning(false);
        setTarget('');
        onScanComplete(data.report);
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      setScanning(false);
      setError(err.message);
    }
  };

  return (
    <div>
      <form onSubmit={initiateScan} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Enter IP Address or URL (e.g., scanme.nmap.org)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={scanning}
          style={{ fontFamily: 'Fira Code', fontSize: '1.1rem' }}
        />
        <button 
          type="submit" 
          className="btn btn-scan" 
          disabled={scanning || !target}
          style={{ width: '150px' }}
        >
          {scanning ? 'SCANNING...' : <><Search size={18} /> INITIATE</>}
        </button>
      </form>

      {error && <div className="error-text" style={{ marginTop: '1rem', textAlign: 'left' }}>[!] ERROR: {error}</div>}

      {scanning && (
        <div className="loader-container">
          <div className="animate-scan"></div>
          <div style={{ fontFamily: 'Fira Code', letterSpacing: '2px' }}>
            ANALYZING TARGET VECTORS: {progress}%
          </div>
          <div className="scan-progress">
            <div className="scan-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
