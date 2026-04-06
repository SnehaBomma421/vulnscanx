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
      <div className="report-mitigation">
        <strong>Mitigation:</strong><br/>
        {mitigation}
      </div>
    </div>
  );
}
