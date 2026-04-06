import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to register');
      }

      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Shield size={48} color="var(--neon-green)" />
        </div>
        <h1 className="card-title">Initiate Setup</h1>
        <p className="card-subtitle">Create a secure operative account</p>

        {error && <div className="error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Mail size={14} style={{ marginRight: '4px', display: 'inline' }} />
              EMAIL ADDRESS
            </label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="agent@cyber.sec"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <Lock size={14} style={{ marginRight: '4px', display: 'inline' }} />
              PASSWORD
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: 'var(--neon-green)' }}>
            {loading ? 'PROCESSING...' : 'AUTHORIZE'}
          </button>
        </form>

        <Link to="/login" className="link-text">
          Existing operative? Login here -&gt;
        </Link>
      </div>
    </div>
  );
}
