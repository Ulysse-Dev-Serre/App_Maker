import { useState, useCallback, useEffect } from 'react';

// Import des hooks personnalisés
import { useLlmOptions } from './hooks/useLlmOptions';
import { useProjects } from './hooks/useProjects';
import { useProblemStatus } from './hooks/useProblemStatus';
import { useLogs } from './hooks/useLogs';
import { useAppActions } from './hooks/useAppActions';

// Import des composants UI (assurez-vous que ces imports correspondent à vos exports par défaut)
import ProjectSidebar from './components/ProjectSidebar';
import FileExplorer from './components/FileExplorer'; // Assurez-vous que FileExplorer.tsx exporte par défaut
import PromptSection from './components/PromptSection';
import TerminalSection from './components/TerminalSection'; // Assurez-vous que TerminalSection.tsx exporte par défaut
import ProblemDisplay from './components/ProblemDisplay';
import CodeEditor from './components/CodeEditor'; // Assurez-vous que CodeEditor.tsx exporte par défaut
// import ProjectHistoryDisplay from './components/ProjectHistoryDisplay'; // Toujours commenté car rendu DANS PromptSection

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
    console.log(`[App.tsx] Début du chargement des fichiers pour le projet: ${id}`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/files`);
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG APP] Fichiers du projet chargés:', data.files); // LOG 1
        setProjectFiles(data.files);
        const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
        console.log('[DEBUG APP] Contenu de main.py après chargement:', data.files['main.py']); // LOG 2
        setSelectedFileName(defaultFile || null);
        return true;
      } else {
        console.error(`[App.tsx] Erreur lors du chargement des fichiers du projet: ${response.statusText}`);
        return false;
      }
    } catch (err) {
      console.error('[App.tsx] Erreur réseau lors du chargement des fichiers du projet:', err);
      return false;
    }
  }, []);

  // Fonction pour récupérer l'historique du projet
  const fetchProjectHistory = useCallback(async (id: string) => {
    console.log(`[App.tsx] Début du chargement de l'historique pour le projet: ${id}`);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/history`);
      if (response.ok) {
        const data = await response.json();
        console.log("[App.tsx] Historique du projet reçu:", data.history);
        setProjectHistory(data.history || null);
      } else {
        console.error(`[App.tsx] Erreur lors de la récupération de l'historique du projet: ${response.statusText}`);
        setProjectHistory(null);
      }
    } catch (err) {
      console.error('Erreur réseau lors de la récupération de l\'historique du projet:', err);
      setProjectHistory(null);
    }
  }, []);

  // Gère la sélection d'un projet depuis la sidebar
  const handleProjectSelect = useCallback((id: string) => {
    console.log(`[App.tsx] Projet sélectionné: ${id}`);
    setProjectId(id);
    // loadProjectFiles et fetchProjectHistory sont appelés dans l'useEffect qui écoute projectId
    setShowSidebar(false);
    localStorage.setItem('lastSelectedProjectId', id);
  }, []); // Dépendances supprimées car loadProjectFiles et fetchProjectHistory sont appelés via useEffect projectId

  // Effet pour charger le dernier projet sélectionné au démarrage
  useEffect(() => {
    const initializeApp = async () => {
      if (initialLoadAttempted) return;

      setInitialLoadAttempted(true);
      console.log("[App.tsx] Initialisation de l'application...");
      const fetchedProjects = await fetchProjects();
      console.log("[App.tsx] Projets récupérés:", fetchedProjects);
      
      const lastProjectId = localStorage.getItem('lastSelectedProjectId');
      if (lastProjectId) {
        const projectExists = fetchedProjects.some(p => p.project_id === lastProjectId);
        if (projectExists) {
          console.log(`[App.tsx] Chargement du dernier projet sélectionné: ${lastProjectId}`);
          setProjectId(lastProjectId);
        } else {
          console.log("[App.tsx] Le dernier projet sélectionné n'existe plus. Réinitialisation.");
          localStorage.removeItem('lastSelectedProjectId');
          setProjectId(null);
        }
      } else {
        console.log("[App.tsx] Aucun dernier projet sélectionné trouvé.");
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
      console.log(`[App.tsx] projectId a changé: ${projectId}. Déclenchement des chargements liés.`);
      // Assurez-vous que loadProjectFiles et fetchProjectHistory sont des callbacks stables
      loadProjectFiles(projectId);
      fetchProjectHistory(projectId);
      fetchProblemStatus(projectId);
    } else {
      console.log("[App.tsx] projectId est null. Réinitialisation des fichiers et de l'historique.");
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
    console.log(`[DEBUG APP] Fichier sélectionné par l'utilisateur: ${fileName}`); // LOG 3
    console.log(`[DEBUG APP] Contenu du fichier sélectionné dans projectFiles (avant setState):`, projectFiles[fileName]); // LOG 4
    setSelectedFileName(fileName);
  }, [projectFiles]); // Ajout de projectFiles comme dépendance pour que le log soit à jour

  // Dériver le nom du projet actuel
  const currentProjectName = projectId
    ? projects.find(p => p.project_id === projectId)?.name || `Projet ${projectId.substring(0, 8)}...`
    : null;

  console.log('[DEBUG APP] Props passées à CodeEditor (au rendu):', { // LOG 5
    value: selectedFileName ? (projectFiles[selectedFileName] || '') : '',
    selectedFileName: selectedFileName,
    readOnly: true
  });

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800 shadow-lg z-10">
        <button
          className="p-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          ☰ Projets
        </button>
        <h1 className="text-3xl font-bold text-teal-400">App Maker PySide6</h1>
        <div className="w-24"></div> {/* Placeholder to balance the header */}
      </header>

      {/* Project Sidebar (conditionally rendered) */}
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

      {/* Main Layout - Centered content area */}
      <div className="flex flex-1 overflow-hidden py-4 px-2">
        {/* Inner container: flex-col sur petit écran, flex-row sur medium+ */}
        {/* Supprime la limitation de largeur maximale pour permettre l'expansion */}
        <div className="flex flex-col md:flex-row w-full mx-auto gap-4">
          {/* Left Panel (Prompt, Problem, Loading) */}
          {/* Pleine largeur sur mobile, largeur fixe sur medium+ */}
          <div className="flex flex-col w-full md:w-[450px] lg:w-[500px] overflow-y-auto custom-scrollbar flex-shrink-0 min-w-0">
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
              // currentProjectName a été retiré de PromptSection, donc ne le passez plus ici
              projectHistory={projectHistory}
            />

            {/* Affichage des messages de chargement et d'erreur généraux */}
            {overallLoading && (
              <p className="text-center text-teal-400 text-lg mt-4 animate-pulse">Chargement...</p>
            )}
            {overallError && (
              <p className="error-message bg-red-800 text-white p-3 rounded-md text-center mt-4 shadow-md">
                Erreur: {overallError}
              </p>
            )}
            
            {/* Affichage des problèmes spécifiques au projet */}
            <ProblemDisplay currentProblem={currentProblem} />

            {/* Message de "chargement" initial si aucun projet n'est encore chargé */}
            {(!initialLoadAttempted || projectsLoading) && !overallLoading && (
               <p className="text-center text-teal-400 text-xl mt-10 p-4 bg-gray-800 rounded-lg shadow-inner">
                 Chargement initial des projets...
               </p>
            )}

          </div>

          {/* Right Panel (IDE: File Explorer, Code Editor, Terminal) - Takes remaining width */}
          <div className="flex flex-col flex-1 overflow-hidden bg-gray-950 rounded-lg shadow-xl min-w-0">
            {/* File Explorer and Code Editor Container (side-by-side) */}
            <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-w-0">
              {/* File Explorer */}
              {/* Caché sur très petit écran, largeur adaptée sur sm/md */}
              <div className="hidden sm:block w-full sm:w-48 md:w-64 flex-shrink-0 border-r border-gray-800 overflow-y-auto">
                <FileExplorer
                  projectId={projectId}
                  files={projectFiles}
                  selectedFileName={selectedFileName}
                  onFileSelect={handleFileSelect}
                  currentProjectName={currentProjectName} 
                />
              </div>

              {/* Code Editor */}
              <div className="flex flex-col flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-teal-400 p-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
                  {selectedFileName ? `Code de ${selectedFileName}` : 'Sélectionnez un fichier'}
                </h2>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    value={selectedFileName ? (projectFiles[selectedFileName] || '') : ''}
                    selectedFileName={selectedFileName} // Passez le nom du fichier à l'éditeur
                    readOnly={true}
                  />
                </div>
              </div>
            </div>
            
            {/* Terminal Section (at the bottom of the IDE panel) */}
            {/* Hauteur adaptée selon la taille de l'écran */}
            <div className="flex-shrink-0 border-t border-gray-800 h-48 sm:h-64 md:h-72">
              <TerminalSection
                logs={logs}
                isPollingEnabled={isPollingEnabled}
                setIsPollingEnabled={setIsPollingEnabled}
                logsEndRef={logsEndRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;