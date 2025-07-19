import React from 'react';


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
    <div className="bg-red-900 text-red-100 p-4 rounded-lg shadow-xl mb-6 border border-red-700">
      <h3 className="text-xl font-bold mb-2 border-b border-red-700 pb-2">Problème détecté : {currentProblem.message}</h3>
      <p className="text-sm mb-1"><span className="font-semibold">Type :</span> {currentProblem.type}</p>
      {currentProblem.details && (
        <pre className="whitespace-pre-wrap break-words text-xs font-mono bg-red-950 p-2 rounded-md border border-red-800 mt-2">
          {currentProblem.details}
        </pre>
      )}
      <p className="text-right text-red-300 text-xs mt-2">
        Timestamp : {new Date(currentProblem.timestamp).toLocaleString()}
      </p>
    </div>
  );
};

export default ProblemDisplay;