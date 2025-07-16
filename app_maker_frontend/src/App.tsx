// app_maker_frontend/src/App.tsx

import { useState, useEffect, useRef, useCallback } from 'react'; // <-- Ajout de useCallback
import './App.css';

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [llmResponse, setLlmResponse] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [mainPyRelativePath, setMainPyRelativePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'code' | 'preview'>('code');
  const [codeViewContent, setCodeViewContent] = useState<string>('');
  const terminalRef = useRef<HTMLTextAreaElement>(null); // Ref pour le scroll auto du terminal

  // NOUVEL ÉTAT POUR CONTRÔLER LE POLLING DES LOGS
  const [isPollingLogs, setIsPollingLogs] = useState<boolean>(false);

  const backendUrl = 'http://127.0.0.1:8000'; // L'URL de ton backend FastAPI

  // Scroll automatique du terminal pour toujours afficher les dernières lignes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Fonction de récupération des logs, encapsulée avec useCallback
  const fetchLogs = useCallback(async () => {
    try {
      const logsResponse = await fetch(`${backendUrl}/api/get_logs`);
      if (!logsResponse.ok) throw new Error(`Erreur HTTP lors de la récupération des logs: ${logsResponse.status}`);
      const logsData = await logsResponse.json();
      setTerminalOutput(logsData.logs.join('\n')); // Affiche tous les logs
    } catch (logError) {
      console.error('Erreur lors de la récupération des logs:', logError);
      setTerminalOutput(prev => prev + `\n[Erreur Polling Logs] ${logError instanceof Error ? logError.message : String(logError)}`);
      setIsPollingLogs(false); // Arrête le polling en cas d'erreur
    }
  }, [backendUrl]); // Dépendance: backendUrl

  // NOUVEAU useEffect pour gérer le polling des logs de manière conditionnelle
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isPollingLogs) {
      // Exécute fetchLogs immédiatement lors du démarrage du polling
      fetchLogs();
      // Puis toutes les 500ms
      intervalId = setInterval(fetchLogs, 500);
    }

    // Fonction de nettoyage: s'exécute quand le composant est démonté
    // ou quand isPollingLogs passe à false
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPollingLogs, fetchLogs]); // Dépendances: isPollingLogs et fetchLogs

  const handleGenerateApp = async () => {
    setIsLoading(true);
    setLlmResponse('Génération de l\'application en cours...');
    setTerminalOutput(''); // Réinitialise le terminal au début d'une nouvelle génération
    setProjectPath(null);
    setMainPyRelativePath(null);
    setCodeViewContent('');

    setIsPollingLogs(true); // COMMENCE LE POLLING DES LOGS

    try {
      const response = await fetch(`${backendUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: prompt }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setLlmResponse(data.message);
      setProjectPath(data.project_path);
      setMainPyRelativePath(data.main_py_relative_path);
      setTerminalOutput(prev => prev + `\n[Frontend] Début de la génération...\n${data.message}`);

      if (data.main_py_relative_path) {
        const fileContentResponse = await fetch(`${backendUrl}/api/get_file_content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: data.main_py_relative_path }),
        });
        const fileContentData = await fileContentResponse.json();
        if (fileContentResponse.ok) {
          setCodeViewContent(fileContentData.content);
          setTerminalOutput(prev => prev + `\n[Frontend] Fichier ${data.main_py_relative_path} lu avec succès.`);
        } else {
          setCodeViewContent(`Erreur lors de la lecture du fichier : ${fileContentData.detail || 'Inconnu'}`);
          setTerminalOutput(prev => prev + `\n[Erreur] Impossible de lire le fichier main.py.`);
        }
      }

      setActiveView('code');

    } catch (error) {
      console.error('Erreur lors de la génération de l\'application:', error);
      setLlmResponse(`Erreur lors de la génération: ${error instanceof Error ? error.message : String(error)}`);
      setTerminalOutput(prev => prev + `\n[Erreur] ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      setIsPollingLogs(false); // ARRÊTE LE POLLING QUAND LA GÉNÉRATION EST TERMINÉE (réussie ou non)
    }
  };

  const handleRunApp = async () => {
    if (!projectPath) {
      setLlmResponse('Veuillez d\'abord générer une application.');
      return;
    }

    setIsLoading(true);
    setLlmResponse('Lancement de l\'application PySide6...');
    setTerminalOutput(prev => prev + '\n[Frontend] Lancement en cours...');

    setIsPollingLogs(true); // COMMENCE LE POLLING DES LOGS

    try {
      const runResponse = await fetch(`${backendUrl}/api/run_app`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: projectPath }),
      });

      if (!runResponse.ok) {
        throw new Error(`Erreur HTTP: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      setLlmResponse(runData.message);
      setTerminalOutput(prev => prev + `\n[Frontend] ${runData.message}`);

      setActiveView('preview');

    } catch (error) {
      console.error('Erreur lors du lancement de l\'application:', error);
      setLlmResponse(`Erreur lors du lancement: ${error instanceof Error ? error.message : String(error)}`);
      setTerminalOutput(prev => prev + `\n[Erreur] ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      // Important: Le polling s'arrête ici car l'application est lancée en processus séparé.
      // Le backend a terminé sa tâche, plus besoin de poller ses logs pour cette action.
      setIsPollingLogs(false); // ARRÊTE LE POLLING QUAND LE LANCEMENT EST TERMINÉ
    }
  };

  return (
    <div className="App">
      <h1>app_maker: Générateur d'applications PySide6</h1>

      <div className="main-content">
        {/* Colonne de Gauche */}
        <div className="left-panel">
          {/* Section Réponse LLM & Aperçu Code (3/5 hauteur) */}
          <div className="llm-response-section">
            <h2>Réponse LLM & Aperçu du Code</h2>
            <textarea
              readOnly
              value={llmResponse}
              placeholder="La réponse du LLM et l'aperçu du code généré apparaîtront ici."
            />
          </div>

          {/* Section Prompt (2/5 hauteur) */}
          <div className="prompt-section">
            <h2>Ton Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décris l'application PySide6 que tu souhaites créer (ex: 'Une application avec un bouton qui affiche un message')..."
              disabled={isLoading}
            />
            <button onClick={handleGenerateApp} disabled={isLoading}>
              {isLoading ? 'Génération...' : 'Générer Application PySide6'}
            </button>
          </div>
        </div>

        {/* Colonne de Droite - Conteneur pour Code/Preview/Terminal */}
        <div className="right-panel">
          <div className="view-selector">
            <button
              onClick={() => setActiveView('code')}
              className={activeView === 'code' ? 'active' : ''}
            >
              Code
            </button>
            <button
              onClick={handleRunApp} // Le bouton Preview va aussi lancer l'app
              className={activeView === 'preview' ? 'active' : ''}
              disabled={isLoading || !projectPath}
            >
              Preview
            </button>
          </div>

          {/* Affichage conditionnel basé sur activeView */}
          {activeView === 'code' && (
            <div className="code-view">
              <h2>Code Généré (main.py)</h2>
              <textarea
                readOnly
                value={codeViewContent}
                placeholder="Le code de main.py s'affichera ici."
              />
              <p className="note">Note: Ce panneau affichera le contenu complet de `main.py` et d'autres fichiers plus tard.</p>
            </div>
          )}

          {activeView === 'preview' && (
            <div className="preview-view">
              <h2>Aperçu de l'Application PySide6</h2>
              <div className="preview-placeholder">
                <p>L'application PySide6 sera lancée en local et s'affichera dans une fenêtre séparée.</p>
                <p>Pour voir l'aperçu, assurez-vous d'avoir généré une application et cliquez sur "Preview". L'application devrait apparaître sur votre bureau.</p>
              </div>
            </div>
          )}

          {/* Le terminal toujours visible en bas du panneau droit */}
          <div className="terminal-section">
            <h2>Terminal (Sortie Backend)</h2>
            <textarea
              readOnly
              value={terminalOutput}
              placeholder="Les logs du backend (création d'environnement, installation, exécution) apparaîtront ici."
              ref={terminalRef}
            />
          </div>
        </div>
      </div>

      <p className="footer">
        Développé avec React, Vite, FastAPI et Python.
      </p>
    </div>
  );
}

export default App;