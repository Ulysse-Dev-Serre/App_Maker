import React from 'react';
import ProjectHistoryDisplay from './ProjectHistoryDisplay';
import './PromptSection.css'; // Assurez-vous que cet import est présent

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
  currentProblem: any;
  currentProjectName: string | null;
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
  currentProjectName,
  projectHistory,
}) => {
  return (
    <div className="prompt-section">
      <h2>Ton Prompt</h2>
      {currentProjectName && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#3a3a3a', borderRadius: '5px', color: '#f0f0f0', textAlign: 'center' }}>
          Projet Actuel : <strong>{currentProjectName}</strong>
        </div>
      )}

      {/* Rendu de l'historique du projet ici, à l'intérieur de PromptSection */}
      {projectId && <ProjectHistoryDisplay projectHistory={projectHistory} />} {/* <--- RÉACTIVÉ ICI */}
      
      <form onSubmit={handleGenerateApp}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris l'application PySide6 que tu souhaites créer ici..."
          rows={10}
          cols={50}
        ></textarea>
        
        <div className="llm-selectors">
          <div>
            <label htmlFor="llmProvider">Choisir LLM : </label>
            <select
              id="llmProvider"
              value={selectedLlmProvider}
              onChange={(e) => setSelectedLlmProvider(e.target.value)}
            >
              {Object.keys(llmOptions).map(provider => (
                <option key={provider} value={provider}>{provider.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="llmModel">Modèle : </label>
            <select
              id="llmModel"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!llmOptions[selectedLlmProvider] || llmOptions[selectedLlmProvider].length === 0}
            >
              {llmOptions[selectedLlmProvider]?.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="button-group">
            <button type="submit" disabled={loading}>Générer Application PySide6</button>
            {projectId && (
                <button onClick={handleUpdateApp} disabled={loading}>
                Mettre à jour Application
                </button>
            )}
            {projectId && currentProblem && (
                <button onClick={handleFixProblem} disabled={loading} style={{ backgroundColor: '#ff6b6b', color: 'white' }}>
                Résoudre le Problème
                </button>
            )}
            {projectId && (
                <button onClick={handleRunApp} disabled={loading}>
                Lancer Application
                </button>
            )}
            {projectId && (
                <button onClick={handleStopApp} disabled={loading}>
                Arrêter Application
                </button>
            )}
        </div>
      </form>
    </div>
  );
};

export default PromptSection;