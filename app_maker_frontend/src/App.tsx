import { useState, FormEvent, useEffect, useRef } from 'react';
import './App.css'; // Assurez-vous que votre fichier CSS est correctement importé
import FileList from './FileList'; // Assurez-vous que FileList est dans le même dossier ou le chemin correct

// Définir les interfaces pour les données LLM
interface LlmOptions {
  [provider: string]: string[]; // Ex: { "gemini": ["gemini-1.5-pro"], "openai": ["gpt-3.5-turbo"] }
}

interface ProjectFile {
  fileName: string;
  content: string;
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

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // Polling des logs désactivé par défaut. Activez-le via le bouton si nécessaire.
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(false); 
  const pollingIntervalRef = useRef<number | null>(null);

  // Nouveaux états pour la sélection du LLM
  const [llmOptions, setLlmOptions] = useState<LlmOptions>({});
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('gemini'); // Défaut initial
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro'); // Défaut initial pour le modèle

  const logsEndRef = useRef<HTMLDivElement>(null); // Pour faire défiler les logs

  // Fonction pour faire défiler les logs vers le bas
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effet pour récupérer les options LLM au chargement du composant
  useEffect(() => {
    const fetchLlmOptions = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/llm_options');
        if (response.ok) {
          const data: LlmOptions = await response.json();
          setLlmOptions(data);

          // Initialiser les sélections par défaut si des options sont disponibles
          if (Object.keys(data).length > 0) {
            const defaultProvider = Object.keys(data)[0]; // Premier fournisseur disponible
            setSelectedLlmProvider(defaultProvider);
            if (data[defaultProvider] && data[defaultProvider].length > 0) {
              setSelectedModel(data[defaultProvider][0]); // Premier modèle de ce fournisseur
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
  }, []); // Exécuter une seule fois au montage du composant

  // Effet pour mettre à jour le modèle sélectionné quand le fournisseur change
  useEffect(() => {
    if (llmOptions[selectedLlmProvider] && llmOptions[selectedLlmProvider].length > 0) {
      setSelectedModel(llmOptions[selectedLlmProvider][0]); // Sélectionne le premier modèle du nouveau fournisseur
    } else {
      setSelectedModel(''); // Réinitialise si aucun modèle pour ce fournisseur
    }
  }, [selectedLlmProvider, llmOptions]);


  // Effet pour le polling des logs (contrôlé par isPollingEnabled)
  useEffect(() => {
    if (isPollingEnabled) {
      pollingIntervalRef.current = window.setInterval(fetchLogs, 1000); // Poll toutes les 1 seconde
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Nettoyage à la désactivation du polling ou au démontage du composant
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPollingEnabled]); // Dépend de l'état du polling

  // Effet pour faire défiler les logs quand ils changent
  useEffect(() => {
    scrollToBottom();
  }, [logs]);


  const fetchLogs = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/get_logs');
      if (response.ok) {
        const data = await response.json();
        // data.logs est une seule chaîne de caractères contenant tout le contenu du fichier de log.
        // Nous allons la diviser en lignes et tenter de parser chaque ligne.
        if (typeof data.logs === 'string') {
          const logLines = data.logs.split('\n').filter((line: string) => line.trim() !== '');
          const parsedLogs: LogEntry[] = logLines.map((line: string) => {
            let timestamp = "N/A";
            let level = "UNKNOWN";
            let message = line;

            // Regex pour extraire le timestamp et le niveau (ex: "2025-07-17 11:46:33,581 - INFO - ")
            const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARNING|ERROR|DEBUG|CRITICAL) - (.*)$/);

            if (match) {
              timestamp = match[1];
              level = match[2];
              message = match[3];
            } else {
              // Si le format ne correspond pas, la ligne entière est le message.
              // On peut tenter de trouver un niveau même sans timestamp si le format est partiel.
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
          setLogs([]); // Réinitialiser ou gérer l'erreur
        }
      } else {
        console.error(`Erreur lors de la récupération des logs: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur réseau lors de la récupération des logs:', error);
    }
  };

  const handleGenerateApp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProjectFiles({}); // Réinitialiser les fichiers du projet
    setProjectId(null); // Réinitialiser l'ID du projet

    try {
      const generateResponse = await fetch('http://127.0.0.1:8000/api/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          llm_provider: selectedLlmProvider, // Envoyer le fournisseur choisi
          model_name: selectedModel,       // Envoyer le modèle choisi
        }),
      });

      if (generateResponse.ok) {
        const data: ProjectData = await generateResponse.json();
        setProjectId(data.project_id);
        setProjectFiles(data.files);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          llm_provider: selectedLlmProvider, // Envoyer le fournisseur choisi
          model_name: selectedModel,       // Envoyer le modèle choisi
        }),
      });

      if (updateResponse.ok) {
        const data: ProjectData = await updateResponse.json();
        setProjectFiles(data.files);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!response.ok) {
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
        headers: {
          'Content-Type': 'application/json',
        },
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>App Maker PySide6</h1>
      </header>
      <div className="main-layout">
        <div className="left-panel">
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
              
              {/* Nouveaux sélecteurs pour le LLM */}
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
                    // Désactiver si aucun modèle n'est disponible pour le fournisseur sélectionné
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
              <button onClick={handleUpdateApp} disabled={loading} style={{ marginTop: '10px' }}>
                Mettre à jour Application
              </button>
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
              <div ref={logsEndRef} /> {/* Élément pour le défilement */}
            </div>
          </div>
        </div>

        <div className="right-panel">
          {projectId && <FileList projectId={projectId} files={projectFiles} />}
        </div>
      </div>
    </div>
  );
}

export default App;