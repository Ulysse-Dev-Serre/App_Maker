import React from 'react';
import './ProblemDisplay.css';

interface ProblemData {
  type: string;
  message: string;
  details?: string;
  timestamp: string;
}

interface ProblemDisplayProps {
  currentProblem: ProblemData | null;
}

const ProblemDisplay: React.FC<ProblemDisplayProps> = ({ currentProblem }) => {
  if (!currentProblem) {
    return null; // Ne rien afficher s'il n'y a pas de problème
  }

  return (
    <div className="error-message" style={{ marginTop: '15px', textAlign: 'left' }}>
      <h3>Problème détecté: {currentProblem.message}</h3>
      <p>Type: {currentProblem.type}</p>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8em' }}>
        {currentProblem.details || "Aucun détail supplémentaire."}
      </pre>
      <p>Timestamp: {new Date(currentProblem.timestamp).toLocaleString()}</p>
    </div>
  );
};

export default ProblemDisplay;