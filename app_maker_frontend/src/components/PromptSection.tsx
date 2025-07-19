import React from 'react';
import ProjectHistoryDisplay from './ProjectHistoryDisplay';

// Interfaces pour les données (répétées ici pour la clarté du hook, mais idéalement importées d'un fichier de types global)
interface LlmOptions {
  [provider: string]: string[];
}

interface HistoryEntry {
  type: 'user' | 'llm_response';
  content: string | { [key: string]: string };
  timestamp: string;
}

interface ProjectHistory {
  project_name: string;
  prompts: HistoryEntry[];
}

interface PromptSectionProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  llmOptions: LlmOptions;
  selectedLlmProvider: string;
  setSelectedLlmProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  projectId: string | null;
  loading: boolean;
  handleGenerateApp: (event: React.FormEvent) => Promise<void>;
  handleUpdateApp: (event: React.FormEvent) => Promise<void>;
  handleRunApp: () => Promise<void>;
  handleStopApp: () => Promise<void>;
  handleFixProblem: () => Promise<void>;
  currentProblem: any; // Utiliser l'interface ProblemData si elle est importée
  projectHistory: ProjectHistory | null;
}

const PromptSection: React.FC<PromptSectionProps> = ({
  prompt,
  setPrompt,
  llmOptions,
  selectedLlmProvider,
  setSelectedLlmProvider,
  selectedModel,
  setSelectedModel,
  projectId,
  loading,
  handleGenerateApp,
  handleUpdateApp,
  handleRunApp,
  handleStopApp,
  handleFixProblem,
  currentProblem,
  projectHistory,
}) => {
  return (
    <div className="flex flex-col bg-gray-800 p-4 rounded-lg shadow-xl mb-6"> 
     
      
      {/* Rendu de l'historique du projet ici */}
      {projectId && <ProjectHistoryDisplay projectHistory={projectHistory} />}
      
      <form onSubmit={handleGenerateApp} className="flex flex-col space-y-3"> 
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris l'application PySide6 que tu souhaites créer ici..."
          rows={7} 
          className="w-full p-2 rounded-md bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y custom-scrollbar"
        ></textarea>
        
        <div className="flex flex-col md:flex-row md:space-x-3 space-y-3 md:space-y-0 items-center justify-between"> {/* Ajuste l'espacement */}
          <div className="flex items-center space-x-2">
            <label htmlFor="llmProvider" className="text-gray-300 text-sm">Choisir LLM :</label> {/* Taille du texte réduite */}
            <select
              id="llmProvider"
              value={selectedLlmProvider}
              onChange={(e) => setSelectedLlmProvider(e.target.value)}
              className="p-1.5 rounded-md bg-gray-700 border border-gray-600 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" 
            >
              {Object.keys(llmOptions).map(provider => (
                <option key={provider} value={provider}>{provider.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="llmModel" className="text-gray-300 text-sm">Modèle :</label> {/* Taille du texte réduite */}
            <select
              id="llmModel"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!llmOptions[selectedLlmProvider] || llmOptions[selectedLlmProvider].length === 0 || loading}
              className="p-1.5 rounded-md bg-gray-700 border border-gray-600 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed" 
            >
              {llmOptions[selectedLlmProvider]?.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-3"> {/* Réduit le gap entre les boutons et le margin-top */}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
            >
              Générer Application
            </button>
            {projectId && (
                <button
                  onClick={handleUpdateApp}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                >
                Mettre à jour
                </button>
            )}
            {projectId && currentProblem && (
                <button
                  onClick={handleFixProblem}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                >
                Résoudre Problème
                </button>
            )}
            {projectId && (
                <button
                  onClick={handleRunApp}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                >
                Lancer Application
                </button>
            )}
            {projectId && (
                <button
                  onClick={handleStopApp}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-md bg-yellow-600 hover:bg-yellow-700 text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-75 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                >
                Arrêter Application
                </button>
            )}
        </div>
      </form>
    </div>
  );
};

export default PromptSection;