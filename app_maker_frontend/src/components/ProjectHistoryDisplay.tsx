import React from 'react';

// Interfaces pour les entrées d'historique (doivent correspondre à celles de App.tsx)
interface HistoryEntry {
  type: 'user' | 'llm_response';
  content: string | { [key: string]: string } | null; // Le contenu peut être une chaîne, un objet ou null
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
      // Utilisation de max-h-128 pour une hauteur fixe plus grande que max-h-96
      <div className="bg-gray-900 p-4 rounded-lg shadow-inner mb-4 max-h-128 overflow-y-auto custom-scrollbar">
        {/* Le titre "Historique du Projet" a été supprimé */}
        <p className="text-center text-gray-500 text-sm">Aucun historique pour ce projet.</p>
      </div>
    );
  }

  return (
    // Utilisation de max-h-128 pour une hauteur fixe plus grande que max-h-96
    <div className="bg-gray-900 p-4 rounded-lg shadow-inner mb-4 max-h-128 overflow-y-auto custom-scrollbar">
      {/* La balise h3 qui affichait "Historique du Projet" et le nom du projet a été supprimée */}

      {projectHistory.prompts.map((entry, index) => (
        <div
          key={index}
          className={`mb-4 p-3 rounded-md shadow-sm
            ${entry.type === 'user' ? 'bg-gray-700 text-gray-100' : 'bg-gray-700 text-teal-200'}
          `}
        >
          <p className="font-semibold mb-1">
            {entry.type === 'user' ? 'Votre Prompt :' : 'Réponse du LLM :'}
          </p>
          {typeof entry.content === 'string' ? (
            <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-gray-800 p-2 rounded-sm border border-gray-600">
              {entry.content}
            </pre>
          ) : (
            // Si le contenu est un objet (réponse LLM avec des fichiers), l'afficher joliment
            (entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content)) ? (
              <div className="space-y-2">
                {Object.entries(entry.content).map(([fileName, fileContent]) => (
                  <div key={fileName} className="bg-gray-800 p-2 rounded-sm border border-gray-600">
                    <em className="text-teal-300 text-xs font-mono">{fileName}</em>:
                    <pre className="whitespace-pre-wrap break-words text-xs font-mono mt-1 text-gray-200">
                      <code>{fileContent}</code>
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-xs font-mono bg-gray-800 p-1.5 rounded-sm border border-gray-600 text-gray-400">
                {/* Message si le contenu n'est pas une chaîne et n'est pas un objet valide de fichiers */}
                Contenu non disponible ou format inattendu.
              </pre>
            )
          )}
          <p className="text-right text-gray-400 text-xs mt-1">
            {new Date(entry.timestamp).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default ProjectHistoryDisplay;