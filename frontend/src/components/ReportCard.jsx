import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function ReportCard({ issue }) {
  const { title, risk, description, mitigation } = issue;

  const getRiskIcon = () => {
    switch(risk) {
      case 'High': return <AlertTriangle color="var(--neon-red)" size={20} />;
      case 'Medium': return <AlertCircle color="var(--neon-yellow)" size={20} />;
      case 'Low': return <Info color="var(--neon-green)" size={20} />;
      default: return <Info color="var(--neon-blue)" size={20} />;
    }
  };

  const getRiskClass = () => {
    switch(risk) {
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
      default: return 'badge-info';
    }
  };

  return (
    <div className="report-card">
      <div className="report-header">
        <div className="report-title">
          {getRiskIcon()}
          {title}
        </div>
        <span className={`badge ${getRiskClass()}`}>{risk} RISK</span>
      </div>
      <div className="report-desc">
        {description}
      </div>
      
      {issue.technicalDetails && (
        <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#aaaaaa', borderLeft: '2px solid var(--border-muted)', paddingLeft: '0.5rem' }}>
          <strong>Technical Details:</strong><br/>
          {issue.technicalDetails}
        </div>
      )}

      {issue.cwe && (
        <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--neon-purple)', fontFamily: 'Fira Code' }}>
          [{issue.cwe}]
        </div>
      )}

      <div className="report-mitigation">
        <strong>Mitigation:</strong><br/>
        {mitigation}
      </div>
    </div>
  );
}
