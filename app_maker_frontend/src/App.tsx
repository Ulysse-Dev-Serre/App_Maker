import { useState, useCallback } from 'react';
import './App.css';

// Import des hooks personnalisés
import { useLlmOptions } from './hooks/useLlmOptions';
import { useProjects } from './hooks/useProjects';
import { useProblemStatus } from './hooks/useProblemStatus';
import { useLogs } from './hooks/useLogs';
import { useAppActions } from './hooks/useAppActions';

// Import des composants UI
import ProjectSidebar from './components/ProjectSidebar'; // Assurez-vous que ce fichier existe et est correct
import FileExplorer from './components/FileExplorer';   // Assurez-vous que ce fichier existe et est correct
import PromptSection from './components/PromptSection';
import TerminalSection from './components/TerminalSection';
import ProblemDisplay from './components/ProblemDisplay';

function App() {
  // États locaux de App
  const [prompt, setPrompt] = useState<string>('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<{ [key: string]: string }>({});
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Utilisation des hooks personnalisés
  const { llmOptions, selectedLlmProvider, setSelectedLlmProvider, selectedModel, setSelectedModel, error: llmError } = useLlmOptions();
  const { projects, fetchProjects, handleProjectRename, handleProjectDelete, loading: projectsLoading, error: projectsError } = useProjects();
  const { currentProblem, fetchProblemStatus, error: problemError } = useProblemStatus();
  const { logs, isPollingEnabled, setIsPollingEnabled, scrollToBottom, logsEndRef, error: logsError } = useLogs();

  // Combinaison des erreurs des différents hooks
  const combinedError = llmError || projectsError || problemError || logsError;

  // Fonction pour charger les fichiers d'un projet spécifique (appelée par ProjectSidebar)
  const loadProjectFiles = useCallback(async (id: string) => {
    // Le chargement est géré par useAppActions, mais nous avons besoin de cette fonction ici
    // pour mettre à jour projectFiles et selectedFileName.
    // Pour éviter la duplication de logique de chargement/erreur, nous allons simplement
    // faire un fetch direct ici, car c'est la responsabilité de App de gérer ces états.
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/files`);
      if (response.ok) {
        const data = await response.json();
        setProjectFiles(data.files);
        const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
        setSelectedFileName(defaultFile || null);
      } else {
        console.error(`Erreur lors du chargement des fichiers du projet: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur réseau lors du chargement des fichiers du projet:', err);
    }
  }, []);

  // Gère la sélection d'un projet depuis la sidebar
  const handleProjectSelect = useCallback((id: string) => {
    setProjectId(id);
    loadProjectFiles(id);
  }, [loadProjectFiles]);

  // Utilisation du hook pour les actions de l'application
  const {
    loading: appActionsLoading,
    error: appActionsError,
    handleGenerateApp,
    handleUpdateApp,
    handleRunApp,
    handleStopApp,
    handleFixProblem,
  } = useAppActions({
    projectId,
    setProjectId,
    projectFiles,
    setProjectFiles,
    setSelectedFileName,
    prompt,
    currentProblem,
    fetchProblemStatus,
    fetchProjects,
    selectedLlmProvider,
    selectedModel,
  });

  const overallLoading = projectsLoading || appActionsLoading;
  const overallError = combinedError || appActionsError;

  // Fonction pour gérer le clic sur un fichier dans l'explorateur
  const handleFileSelect = useCallback((fileName: string) => {
    setSelectedFileName(fileName);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>App Maker PySide6</h1>
      </header>
      <div className="main-layout">
        {/* Sidebar pour la gestion des projets */}
        <ProjectSidebar
          projects={projects}
          selectedProjectId={projectId}
          onProjectSelect={handleProjectSelect}
          onProjectRename={handleProjectRename}
          onProjectDelete={handleProjectDelete}
          loading={overallLoading}
        />

        <div className="center-panel">
          <PromptSection
            prompt={prompt}
            setPrompt={setPrompt}
            llmOptions={llmOptions}
            selectedLlmProvider={selectedLlmProvider}
            setSelectedLlmProvider={setSelectedLlmProvider}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            projectId={projectId}
            loading={overallLoading}
            handleGenerateApp={handleGenerateApp}
            handleUpdateApp={handleUpdateApp}
            handleRunApp={handleRunApp}
            handleStopApp={handleStopApp}
            handleFixProblem={handleFixProblem}
            currentProblem={currentProblem}
          />

          {overallLoading && <p>Chargement...</p>}
          {overallError && <p className="error-message">Erreur: {overallError}</p>}
          
          <ProblemDisplay currentProblem={currentProblem} />

          <TerminalSection
            logs={logs}
            isPollingEnabled={isPollingEnabled}
            setIsPollingEnabled={setIsPollingEnabled}
            logsEndRef={logsEndRef}
          />
        </div>

        <div className="ide-panel">
          <FileExplorer
            projectId={projectId}
            files={projectFiles}
            selectedFileName={selectedFileName}
            onFileSelect={handleFileSelect}
          />
          <div className="code-editor-pane">
            <h2>{selectedFileName ? `Code de ${selectedFileName}` : 'Sélectionnez un fichier'}</h2>
            <textarea
              className="code-display"
              value={selectedFileName ? projectFiles[selectedFileName] || '' : 'Sélectionnez un fichier pour voir son contenu.'}
              readOnly
              rows={25}
              cols={80}
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;