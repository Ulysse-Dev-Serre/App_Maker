import React from 'react';
import './HistoryDisplay.css';

// Interfaces pour les entrées d'historique (doivent correspondre à celles de App.tsx)
interface HistoryEntry {
  type: 'user' | 'llm_response';
  content: string | { [key: string]: string }; // Le contenu peut être une chaîne ou un objet de fichiers
  timestamp: string;
}

// Interface pour la structure complète de l'historique
interface ProjectHistory {
  project_name: string;
  prompts: HistoryEntry[];
}

interface ProjectHistoryDisplayProps {
  projectHistory: ProjectHistory | null;
}

const ProjectHistoryDisplay: React.FC<ProjectHistoryDisplayProps> = ({ projectHistory }) => {
  if (!projectHistory || !projectHistory.prompts || projectHistory.prompts.length === 0) {
    return (
      <div className="history-section">
        <h3>Historique du Projet</h3>
        <p style={{ textAlign: 'center', color: '#aaa' }}>Aucun historique pour ce projet.</p>
      </div>
    );
  }

  return (
    <div className="history-section">
      <h3>Historique du Projet : {projectHistory.project_name}</h3>
      {projectHistory.prompts.map((entry, index) => (
        <div key={index} className={`history-entry ${entry.type === 'user' ? 'user-prompt' : 'llm-response'}`}>
          <p><strong>{entry.type === 'user' ? 'Votre Prompt :' : 'Réponse du LLM :'}</strong></p>
          {typeof entry.content === 'string' ? (
            <pre>{entry.content}</pre>
          ) : (
            // Si le contenu est un objet (réponse LLM avec des fichiers), l'afficher joliment
            <pre>
              {Object.entries(entry.content).map(([fileName, fileContent]) => (
                <div key={fileName} style={{ marginBottom: '5px' }}>
                  <em>{fileName}</em>:
                  <br />
                  <code>{fileContent}</code>
                </div>
              ))}
            </pre>
          )}
          <p className="timestamp">{new Date(entry.timestamp).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

export default ProjectHistoryDisplay;