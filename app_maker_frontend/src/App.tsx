import { useState, FormEvent, useEffect, useRef, useCallback } from 'react';
import './App.css';
import ProjectSidebar from './components/ProjectSidebar';
import FileExplorer from './components/FileExplorer';

// Définir les interfaces pour les données LLM
interface LlmOptions {
  [provider: string]: string[]; // Ex: { "gemini": ["gemini-1.5-pro"], "openai": ["gpt-3.5-turbo"] }
}

// Interface pour les informations de base d'un projet (pour la sidebar)
interface ProjectInfo {
  project_id: string;
  name: string;
}

interface ProjectData {
  project_id: string;
  files: { [key: string]: string };
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

// Interface pour les données de problème (correspond à problem.json)
interface ProblemData {
  type: string;
  message: string;
  details?: string; // Peut contenir le traceback complet ou d'autres détails
  timestamp: string;
}

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(false);
  const pollingIntervalRef = useRef<number | null>(null);

  const [llmOptions, setLlmOptions] = useState<LlmOptions>({});
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro');
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // NOUVEAU : État pour le problème du projet actuel
  const [currentProblem, setCurrentProblem] = useState<ProblemData | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Fonctions de communication avec le Backend ---

  // Récupère les options de LLM (inchangé)
  useEffect(() => {
    const fetchLlmOptions = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/llm_options');
        if (response.ok) {
          const data: LlmOptions = await response.json();
          setLlmOptions(data);
          if (Object.keys(data).length > 0) {
            const defaultProvider = Object.keys(data)[0];
            setSelectedLlmProvider(defaultProvider);
            if (data[defaultProvider] && data[defaultProvider].length > 0) {
              setSelectedModel(data[defaultProvider][0]);
            }
          }
        } else {
          setError(`Erreur lors de la récupération des options LLM: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des options LLM:', error);
        setError(`Erreur réseau lors de la récupération des options LLM: ${error}`);
      }
    };
    fetchLlmOptions();
  }, []);

  // Met à jour le modèle sélectionné quand le fournisseur change (inchangé)
  useEffect(() => {
    if (llmOptions[selectedLlmProvider] && llmOptions[selectedLlmProvider].length > 0) {
      setSelectedModel(llmOptions[selectedLlmProvider][0]);
    } else {
      setSelectedModel('');
    }
  }, [selectedLlmProvider, llmOptions]);

  // Récupère la liste de tous les projets (inchangé)
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects/');
      if (response.ok) {
        const data: ProjectInfo[] = await response.json();
        setProjects(data);
      } else {
        setError(`Erreur lors de la récupération de la liste des projets: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      setError(`Erreur réseau lors de la récupération des projets: ${error}`);
    }
  }, []); // Aucune dépendance pour ne pas recréer la fonction inutilement

  // Charge les projets au montage du composant (inchangé)
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);


  // NOUVEAU : Récupère l'état du problème pour le projet sélectionné
  const fetchProblemStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/problem_status`);
      if (response.ok) {
        const data = await response.json();
        // Le backend renvoie un objet avec une clé 'problem' qui peut être null ou les données du problème
        setCurrentProblem(data.problem || null);
      } else {
        console.error(`Erreur lors de la récupération du statut du problème: ${response.statusText}`);
        setCurrentProblem(null); // En cas d'erreur, considérer qu'il n'y a pas de problème
      }
    } catch (error) {
      console.error('Erreur réseau lors de la récupération du statut du problème:', error);
      setCurrentProblem(null);
    }
  }, []);

  // Appelle fetchProblemStatus quand le projectId change
  useEffect(() => {
    if (projectId) {
      fetchProblemStatus(projectId);
    } else {
      setCurrentProblem(null); // Si aucun projet sélectionné, pas de problème
    }
  }, [projectId, fetchProblemStatus]);


  // Charge les fichiers d'un projet spécifique (inchangé)
  const loadProjectFiles = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/files`);
      if (response.ok) {
        const data: ProjectData = await response.json();
        setProjectFiles(data.files);
        // Sélectionne main.py par défaut si présent, sinon le premier fichier
        const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
        setSelectedFileName(defaultFile || null);
      } else {
        setError(`Erreur lors du chargement des fichiers du projet: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers du projet:', error);
      setError(`Erreur réseau lors du chargement des fichiers du projet: ${error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Gère la sélection d'un projet depuis la sidebar (inchangé)
  const handleProjectSelect = useCallback((id: string) => {
    setProjectId(id);
    loadProjectFiles(id);
  }, [loadProjectFiles]);

  // Renomme un projet (inchangé)
  const handleProjectRename = useCallback(async (id: string, newName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName }),
      });
      if (response.ok) {
        await fetchProjects(); // Rafraîchit la liste des projets
        setProjects(prevProjects => prevProjects.map(p => p.project_id === id ? { ...p, name: newName } : p));
      } else {
        const errorData = await response.json();
        setError(`Erreur lors du renommage du projet: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors du renommage du projet:', error);
      setError(`Erreur réseau lors du renommage du projet: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  // Supprime un projet (mise à jour pour currentProblem)
  const handleProjectDelete = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchProjects();
        if (projectId === id) {
          setProjectId(null);
          setProjectFiles({});
          setSelectedFileName(null);
          setCurrentProblem(null); // Effacer le problème si le projet est supprimé
        }
      } else {
        const errorData = await response.json();
        setError(`Erreur lors de la suppression du projet: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      setError(`Erreur réseau lors de la suppression du projet: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, projectId]);


  // --- Fonctions de génération/exécution/résolution d'application ---

  // Gère la génération d'une nouvelle application (mise à jour pour currentProblem)
  const handleGenerateApp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProjectFiles({});
    setProjectId(null);
    setSelectedFileName(null);
    setCurrentProblem(null); // Pas de problème pour un nouveau projet

    try {
      const generateResponse = await fetch('http://127.0.0.1:8000/api/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          llm_provider: selectedLlmProvider,
          model_name: selectedModel,
        }),
      });

      if (generateResponse.ok) {
        const data: ProjectData = await generateResponse.json();
        setProjectId(data.project_id);
        setProjectFiles(data.files);
        const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
        setSelectedFileName(defaultFile || null);
        await fetchProjects();
        // Après génération, vérifier s'il y a un problème (même si on s'attend à non)
        await fetchProblemStatus(data.project_id); 
      } else {
        const errorData = await generateResponse.json();
        setError(`Erreur lors de la génération de l'application: ${errorData.detail || generateResponse.statusText}`);
      }
    } catch (error) {
      console.error('Erreur réseau lors de la génération de l\'application:', error);
      setError(`Erreur réseau: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Gère la mise à jour d'une application existante (mise à jour pour currentProblem)
  const handleUpdateApp = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) {
      setError("Aucun projet sélectionné pour la mise à jour.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateResponse = await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          llm_provider: selectedLlmProvider,
          model_name: selectedModel,
        }),
      });

      if (updateResponse.ok) {
        const data: ProjectData = await updateResponse.json();
        setProjectFiles(data.files);
        if (!selectedFileName || !data.files[selectedFileName]) {
            const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
            setSelectedFileName(defaultFile || null);
        }
        // Après mise à jour, vérifier l'état du problème
        await fetchProblemStatus(projectId);
      } else {
        const errorData = await updateResponse.json();
        setError(`Erreur lors de la mise à jour de l'application: ${errorData.detail || updateResponse.statusText}`);
      }
    } catch (error) {
      console.error('Erreur réseau lors de la mise à jour de l\'application:', error);
      setError(`Erreur réseau: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Gère le lancement de l'application (mise à jour pour currentProblem)
  const handleRunApp = async () => {
    if (!projectId) {
      setError("Aucun projet sélectionné pour l'exécution.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/runner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (response.ok) {
        // Après avoir lancé l'application, on rafraîchit l'état du problème
        // pour voir si un nouveau problème est apparu.
        await fetchProblemStatus(projectId); 
      } else {
        const errorData = await response.json();
        setError(`Erreur lors du lancement de l'application: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur réseau lors du lancement de l\'application:', error);
      setError(`Erreur réseau: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Gère l'arrêt de l'application (inchangé)
  const handleStopApp = async () => {
    if (!projectId) {
      setError("Aucun projet sélectionné pour l'arrêt.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/runner/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setError(`Erreur lors de l'arrêt de l'application: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur réseau lors de l\'arrêt de l\'application:', error);
      setError(`Erreur réseau: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // NOUVEAU : Gère la résolution automatique du problème par le LLM
  const handleFixProblem = async () => {
    if (!projectId || !currentProblem) {
      setError("Aucun problème actif ou projet sélectionné pour la résolution.");
      return;
    }

    setLoading(true);
    setError(null);

    // Construire le prompt pour le LLM avec le code actuel et les logs d'erreur
    const fixPrompt = `L'application a rencontré un problème. Voici le code actuel de l'application et les logs d'erreur :\n\n` +
                     `--- CODE ACTUEL ---\n` +
                     Object.entries(projectFiles).map(([name, content]) => `## Fichier: ${name}\n\`\`\`python\n${content}\n\`\`\``).join('\n\n') +
                     `\n\n--- LOGS D'ERREUR ---\n` +
                     `Type de problème: ${currentProblem.type}\n` +
                     `Message: ${currentProblem.message}\n` +
                     `Détails: ${currentProblem.details || "Aucun détail supplémentaire."}\n\n` +
                     `Veuillez analyser ces informations et fournir les modifications nécessaires aux fichiers pour corriger le problème. ` +
                     `Retournez SEULEMENT les fichiers modifiés/créés/supprimés dans le format JSON spécifié.`;

    try {
      // Utiliser la même route de génération/mise à jour, mais avec le prompt de correction
      const fixResponse = await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fixPrompt, // Le prompt est maintenant la description du problème
          llm_provider: selectedLlmProvider,
          model_name: selectedModel,
        }),
      });

      if (fixResponse.ok) {
        const data: ProjectData = await fixResponse.json();
        setProjectFiles(data.files);
        // Resélectionner le fichier si nécessaire
        if (!selectedFileName || !data.files[selectedFileName]) {
            const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
            setSelectedFileName(defaultFile || null);
        }
        // Après la tentative de correction, vérifier l'état du problème.
        // Le backend devrait avoir effacé problem.json si la mise à jour a réussi.
        await fetchProblemStatus(projectId);
        alert("Tentative de résolution du problème effectuée. Veuillez relancer l'application pour vérifier.");
      } else {
        const errorData = await fixResponse.json();
        setError(`Erreur lors de la tentative de résolution: ${errorData.detail || fixResponse.statusText}`);
      }
    } catch (error) {
      console.error('Erreur réseau lors de la tentative de résolution:', error);
      setError(`Erreur réseau: ${error}`);
    } finally {
      setLoading(false);
    }
  };


  // --- Fonctions de gestion des logs (inchangées) ---
  const fetchLogs = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/get_logs');
      if (response.ok) {
        const data = await response.json();
        if (typeof data.logs === 'string') {
          const logLines = data.logs.split('\n').filter((line: string) => line.trim() !== '');
          const parsedLogs: LogEntry[] = logLines.map((line: string) => {
            let timestamp = "N/A";
            let level = "UNKNOWN";
            let message = line;
            const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARNING|ERROR|DEBUG|CRITICAL) - (.*)$/);
            if (match) {
              timestamp = match[1];
              level = match[2];
              message = match[3];
            } else {
              const partialLevelMatch = line.match(/(INFO|WARNING|ERROR|DEBUG|CRITICAL):?\s*(.*)$/);
              if (partialLevelMatch) {
                  level = partialLevelMatch[1];
                  message = partialLevelMatch[2];
              }
            }
            return { timestamp, level, message };
          });
          setLogs(parsedLogs);
        } else {
          console.warn("Les logs reçus ne sont pas une chaîne de caractères:", data.logs);
          setLogs([]);
        }
      } else {
        console.error(`Erreur lors de la récupération des logs: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur réseau lors de la récupération des logs:', error);
    }
  };

  useEffect(() => {
    if (isPollingEnabled) {
      pollingIntervalRef.current = window.setInterval(fetchLogs, 1000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPollingEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);


  // Fonction pour gérer le clic sur un fichier dans l'explorateur (inchangée)
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
          loading={loading}
        />

        <div className="center-panel">
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
                {/* NOUVEAU : Bouton "Résoudre le problème" */}
                {currentProblem && ( // Afficher le bouton seulement s'il y a un problème
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
          {loading && <p>Chargement...</p>}
          {error && <p className="error-message">Erreur: {error}</p>}
          {currentProblem && ( // Afficher le message du problème si présent
            <div className="error-message" style={{ marginTop: '15px', textAlign: 'left' }}>
              <h3>Problème détecté: {currentProblem.message}</h3>
              <p>Type: {currentProblem.type}</p>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8em' }}>
                {currentProblem.details || "Aucun détail supplémentaire."}
              </pre>
              <p>Timestamp: {new Date(currentProblem.timestamp).toLocaleString()}</p>
            </div>
          )}

          <div className="terminal-section">
            <h2>Logs du Backend</h2>
            <button
              onClick={() => setIsPollingEnabled(!isPollingEnabled)}
              style={{ marginBottom: '10px' }}
            >
              {isPollingEnabled ? 'Désactiver Polling des Logs' : 'Activer Polling des Logs'}
            </button>
            <div className="logs-output">
              {logs.map((log, index) => (
                <p key={index} className={`log-level-${log.level.toLowerCase()}`}>
                  [{log.timestamp}] {log.level}: {log.message}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
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