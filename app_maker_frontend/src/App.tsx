import { useState, useCallback, useEffect } from 'react';
import './App.css'; // Importe les styles de layout globaux

// Import des hooks personnalisés
import { useLlmOptions } from './hooks/useLlmOptions';
import { useProjects } from './hooks/useProjects';
import { useProblemStatus } from './hooks/useProblemStatus';
import { useLogs } from './hooks/useLogs';
import { useAppActions } from './hooks/useAppActions';

// Import des composants UI
import ProjectSidebar from './components/ProjectSidebar';
import FileExplorer from './components/FileExplorer';
import PromptSection from './components/PromptSection';
import TerminalSection from './components/TerminalSection';
import ProblemDisplay from './components/ProblemDisplay';
import CodeEditor from './components/CodeEditor';
import ProjectHistoryDisplay from './components/ProjectHistoryDisplay'; // L'import reste nécessaire pour PromptSection

// Interface pour les entrées d'historique
interface HistoryEntry {
  type: 'user' | 'llm_response';
  content: string | { [key: string]: string };
  timestamp: string;
}

// Interface pour la structure complète de l'historique
interface ProjectHistory {
  project_name: string;
  prompts: HistoryEntry[];
}

function App() {
  // États locaux de App
  const [prompt, setPrompt] = useState<string>('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<{ [key: string]: string }>({});
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [projectHistory, setProjectHistory] = useState<ProjectHistory | null>(null);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState<boolean>(false);

  // Utilisation des hooks personnalisés
  const { llmOptions, selectedLlmProvider, setSelectedLlmProvider, selectedModel, setSelectedModel, error: llmError } = useLlmOptions();
  const { projects, fetchProjects, handleProjectRename, handleProjectDelete, loading: projectsLoading, error: projectsError } = useProjects();
  const { currentProblem, fetchProblemStatus, error: problemError } = useProblemStatus();
  const { logs, isPollingEnabled, setIsPollingEnabled, scrollToBottom, logsEndRef, error: logsError } = useLogs();

  // Combinaison des erreurs des différents hooks
  const combinedError = llmError || projectsError || problemError || logsError;

  // Fonction pour charger les fichiers d'un projet spécifique
  const loadProjectFiles = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/files`);
      if (response.ok) {
        const data = await response.json();
        setProjectFiles(data.files);
        const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
        setSelectedFileName(defaultFile || null);
        return true;
      } else {
        console.error(`Erreur lors du chargement des fichiers du projet: ${response.statusText}`);
        return false;
      }
    } catch (err) {
      console.error('Erreur réseau lors du chargement des fichiers du projet:', err);
      return false;
    }
  }, []);

  // Fonction pour récupérer l'historique du projet
  const fetchProjectHistory = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/history`);
      if (response.ok) {
        const data = await response.json();
        setProjectHistory(data.history || null);
      } else {
        console.error(`Erreur lors de la récupération de l'historique du projet: ${response.statusText}`);
        setProjectHistory(null);
      }
    } catch (err) {
      console.error('Erreur réseau lors de la récupération de l\'historique du projet:', err);
      setProjectHistory(null);
    }
  }, []);

  // Gère la sélection d'un projet depuis la sidebar
  const handleProjectSelect = useCallback((id: string) => {
    setProjectId(id);
    loadProjectFiles(id);
    fetchProjectHistory(id);
    setShowSidebar(false);
    localStorage.setItem('lastSelectedProjectId', id);
  }, [loadProjectFiles, fetchProjectHistory]);

  // Effet pour charger le dernier projet sélectionné au démarrage
  useEffect(() => {
    const initializeApp = async () => {
      if (initialLoadAttempted) return;

      setInitialLoadAttempted(true);

      const fetchedProjects = await fetchProjects();
      
      const lastProjectId = localStorage.getItem('lastSelectedProjectId');
      if (lastProjectId) {
        const projectExists = fetchedProjects.some(p => p.project_id === lastProjectId);
        if (projectExists) {
          setProjectId(lastProjectId);
        } else {
          localStorage.removeItem('lastSelectedProjectId');
          setProjectId(null);
        }
      } else {
        setProjectId(null);
      }
    };

    if (!projectsLoading && !initialLoadAttempted) {
      initializeApp();
    }
  }, [projectsLoading, initialLoadAttempted, projects, fetchProjects, setProjectId]);

  // Effet pour déclencher les fetchs liés au projet une fois que projectId est défini
  useEffect(() => {
    if (projectId) {
      loadProjectFiles(projectId);
      fetchProjectHistory(projectId);
      fetchProblemStatus(projectId);
    } else {
      setProjectFiles({});
      setProjectHistory(null);
      setSelectedFileName(null);
    }
  }, [projectId, loadProjectFiles, fetchProjectHistory, fetchProblemStatus]);


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

  // Dériver le nom du projet actuel
  const currentProjectName = projectId
    ? projects.find(p => p.project_id === projectId)?.name || `Projet ${projectId.substring(0, 8)}...`
    : null;

  return (
    <div className="App">
      <header className="App-header">
        <button className="sidebar-toggle-button" onClick={() => setShowSidebar(!showSidebar)}>
          ☰ Projets
        </button>
        <h1>App Maker PySide6</h1>
      </header>

      <ProjectSidebar
        projects={projects}
        selectedProjectId={projectId}
        onProjectSelect={handleProjectSelect}
        onProjectRename={handleProjectRename}
        onProjectDelete={handleProjectDelete}
        loading={overallLoading}
        isVisible={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      <div className="main-layout">
        <div className="center-panel">
          {/* Section de prompt et boutons */}
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
            currentProjectName={currentProjectName}
            projectHistory={projectHistory}
          />

          {/* Affichage des messages de chargement et d'erreur généraux */}
          {overallLoading && <p>Chargement...</p>}
          {overallError && <p className="error-message">Erreur: {overallError}</p>}
          
          {/* Affichage des problèmes spécifiques au projet */}
          <ProblemDisplay currentProblem={currentProblem} />

          {/* L'historique du projet est maintenant rendu DANS PromptSection.tsx */}
          {/* {projectId && <ProjectHistoryDisplay projectHistory={projectHistory} />} */} {/* <--- SUPPRIMER CETTE LIGNE */}

          {/* Section des logs du backend */}
          <TerminalSection
            logs={logs}
            isPollingEnabled={isPollingEnabled}
            setIsPollingEnabled={setIsPollingEnabled}
            logsEndRef={logsEndRef}
          />

          {/* Message de "chargement" initial si aucun projet n'est encore chargé */}
          {(!initialLoadAttempted || projectsLoading) && (
             <p style={{ textAlign: 'center', color: '#f0f0f0', fontSize: '1.2em', marginTop: '50px' }}>Chargement...</p>
          )}

        </div>

        {/* Le panneau IDE n'est affiché que si un projet est sélectionné */}
        {projectId && (
          <div className="ide-panel">
            <FileExplorer
              projectId={projectId}
              files={projectFiles}
              selectedFileName={selectedFileName}
              onFileSelect={handleFileSelect}
            />
            <div className="code-editor-pane">
              <h2>{selectedFileName ? `Code de ${selectedFileName}` : 'Sélectionnez un fichier'}</h2>
              {selectedFileName ? (
                <CodeEditor
                  value={projectFiles[selectedFileName] || ''}
                  readOnly={true}
                />
              ) : (
                <div className="code-display" style={{ padding: '20px', color: '#888', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Sélectionnez un fichier pour voir son contenu.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

