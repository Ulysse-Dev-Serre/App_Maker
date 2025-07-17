import React from 'react';

interface LlmOptions {
  [provider: string]: string[];
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
  currentProblem: any; // Utiliser l'interface ProblemData si importée
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
}) => {
  return (
    <div className="prompt-section">
      <h2>Ton Prompt</h2>
      <form onSubmit={handleGenerateApp}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris l'application PySide6 que tu souhaites créer ici..."
          rows={10}
          cols={50}
        ></textarea>
        
        <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
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

        <button type="submit" disabled={loading}>Générer Application PySide6</button>
      </form>
      {projectId && (
        <div style={{ marginTop: '10px' }}>
          <button onClick={handleUpdateApp} disabled={loading} style={{ marginRight: '10px' }}>
            Mettre à jour Application
          </button>
          {currentProblem && (
            <button onClick={handleFixProblem} disabled={loading} style={{ backgroundColor: '#ff6b6b', color: 'white' }}>
              Résoudre le Problème
            </button>
          )}
        </div>
      )}
      {projectId && (
        <div style={{ marginTop: '10px' }}>
          <button onClick={handleRunApp} disabled={loading} style={{ marginRight: '10px' }}>
            Lancer Application
          </button>
          <button onClick={handleStopApp} disabled={loading}>
            Arrêter Application
          </button>
        </div>
      )}
    </div>
  );
};

export default PromptSection;