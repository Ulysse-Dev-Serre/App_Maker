// app_maker_frontend/src/App.tsx

import { useState, FormEvent, useEffect } from 'react';
import './App.css';

// Interface pour la structure de fichier/dossier que le backend nous renvoie
interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string; // Ce chemin est relatif au dossier du projet généré (ex: "main.py" ou "src/utils.py")
  children?: FileNode[]; // Pour les répertoires
}

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>('Le code généré par l\'IA apparaîtra ici...');
  const [consoleOutput, setConsoleOutput] = useState<string>('Attente des logs du backend...');
  const [projectPath, setProjectPath] = useState<string | null>(null); // Pour stocker le chemin ABSOLU du dossier du projet généré
  const [selectedFileContent, setSelectedFileContent] = useState<string>('Sélectionnez un fichier pour voir son contenu.');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [projectStructure, setProjectStructure] = useState<FileNode[]>([]);

  // Utilisation de useEffect pour le polling des logs (comme avant)
  useEffect(() => {
    // const fetchLogs = async () => {
    //   try {
    //     const response = await fetch('http://127.00.0.1:8000/api/get_logs');
    //     if (response.ok) {
    //       const data = await response.json();
    //       setConsoleOutput(data.logs.join('\n'));
    //     }
    //   } catch (error) {
    //     console.error('Erreur lors de la récupération des logs:', error);
    //   }
    // };

    //const intervalId = setInterval(fetchLogs, 1000); // Poll toutes les secondes
    //return () => clearInterval(intervalId); // Nettoyage à la suppression du composant
  }, []); // Dépendances vides pour n'exécuter qu'une seule fois

  const handleGenerateApp = async (event: FormEvent) => {
    event.preventDefault();
    setGeneratedCode('Génération en cours...');
    setConsoleOutput('Démarrage de la génération...');
    setProjectPath(null); // Réinitialiser le chemin du projet
    setProjectStructure([]);
    setSelectedFileContent('Sélectionnez un fichier pour voir son contenu.');
    setSelectedFilePath(null);

    try {
      const generateResponse = await fetch('http://127.0.0.1:8000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: prompt }),
      });

      if (!generateResponse.ok) {
        throw new Error(`Erreur HTTP: ${generateResponse.status}`);
      }

      const generateData = await generateResponse.json();
      console.log('Réponse génération:', generateData);
      setGeneratedCode(generateData.generated_code_preview || 'Code généré. Veuillez cliquer sur Aperçu ou recharger.');
      setProjectPath(generateData.project_path); // Mettre à jour l'état projectPath

      if (generateData.project_path) {
        console.log('Tentative de récupération de la structure du projet pour:', generateData.project_path);
        const listFilesResponse = await fetch('http://127.0.0.1:8000/api/list_project_files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: generateData.project_path }),
        });

        if (!listFilesResponse.ok) {
          throw new Error(`Erreur HTTP lors de la récupération des fichiers: ${listFilesResponse.status}`);
        }

        const listFilesData = await listFilesResponse.json();
        console.log('Structure du projet reçue:', listFilesData);
        setProjectStructure(listFilesData.project_structure);

        const mainPyNode = findFileNode(listFilesData.project_structure, 'main.py');
        if (mainPyNode) {
          // --- MODIFICATION ICI DANS handleGenerateApp ---
          // Passer generateData.project_path directement, car l'état projectPath pourrait ne pas être à jour.
          await fetchFileContent(mainPyNode.path, generateData.project_path); 
          // --- FIN MODIFICATION ---
        } else {
            console.warn("main.py non trouvé dans la structure initiale.");
        }

      } else {
        console.warn("Aucun project_path retourné par l'API /generate.");
      }

    } catch (error) {
      console.error('Erreur lors de la génération ou de la récupération des fichiers:', error);
      setGeneratedCode(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
      setConsoleOutput(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Fonction utilitaire pour trouver un fichier dans la structure (simple pour l'instant)
  const findFileNode = (nodes: FileNode[], fileName: string): FileNode | undefined => {
    for (const node of nodes) {
      if (node.type === 'file' && node.name === fileName) {
        return node;
      }
      if (node.type === 'directory' && node.children) {
        const found = findFileNode(node.children, fileName);
        if (found) return found;
      }
    }
    return undefined;
  };

  // --- DÉBUT DE LA MODIFICATION IMPORTANTE POUR TOUS LES FICHIERS CLIQUÉS ---
const fetchFileContent = async (relativePathFromProjectRoot: string, currentProjectPath: string | null = null) => {
    setSelectedFileContent('Chargement du contenu du fichier...');
    setSelectedFilePath(relativePathFromProjectRoot); 

    // Utilise le projectPath passé en argument en priorité, sinon l'état
    const actualProjectPath = currentProjectPath || projectPath;

    if (!actualProjectPath) {
      console.error("projectPath n'est pas défini. Impossible de récupérer le contenu du fichier.");
      setSelectedFileContent("Erreur: Chemin du projet non défini.");
      return;
    }

    const projectFolderName = actualProjectPath.split('/').pop();
    const fullPathForBackend = `${projectFolderName}/${relativePathFromProjectRoot}`;
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/get_file_content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: fullPathForBackend }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP lors de la récupération du contenu: ${response.status}`);
      }

      const data = await response.json();
      setSelectedFileContent(data.content);
    } catch (error) {
      console.error('Erreur lors de la récupération du contenu du fichier:', error);
      setSelectedFileContent(`Impossible de charger le fichier: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  // --- FIN DE LA MODIFICATION IMPORTANTE ---


  const handleRunApp = async () => {
    if (!projectPath) {
      alert('Veuillez d\'abord générer une application.');
      return;
    }
    try {
      const response = await fetch('http://127.00.0.1:8000/api/run_app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: projectPath }), // Utilise le chemin absolu du projet
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setConsoleOutput(prev => prev + '\n' + data.message);
    } catch (error) {
      console.error('Erreur lors du lancement de l\'application:', error);
      setConsoleOutput(prev => prev + `\nErreur lors du lancement: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>App Maker IA</h1>
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
              <button type="submit">Générer Application PySide6</button>
            </form>
          </div>
          <div className="terminal-section">
            <h2>Terminal (Sortie Backend)</h2>
            <pre className="console-output">{consoleOutput}</pre>
          </div>
        </div>

        <div className="right-panel">
          {/* Nouveau: Conteneur principal pour le mode IDE */}
          <div className="ide-container">
            <div className="file-explorer-pane">
              <h2>Explorateur de Fichiers</h2>
              {/* Ici, nous allons rendre l'explorateur de fichiers */}
              {projectStructure.length === 0 ? (
                <p>Aucun projet généré ou structure non disponible.</p>
              ) : (
                <FileList nodes={projectStructure} onFileClick={fetchFileContent} selectedFilePath={selectedFilePath} />
              )}
            </div>
            <div className="code-editor-pane">
              <h2>{selectedFilePath ? `Code de ${selectedFilePath.split('/').pop()}` : 'Code du Fichier'}</h2>
              <textarea
                className="code-display"
                value={selectedFileContent}
                readOnly
                rows={25}
                cols={80}
              ></textarea>
              <button onClick={handleRunApp} disabled={!projectPath}>Lancer l'Application</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant FileList pour afficher récursivement les fichiers et dossiers
// Tu devras créer ce fichier séparément : app_maker_frontend/src/components/FileList.tsx
interface FileListProps {
  nodes: FileNode[];
  onFileClick: (path: string) => void;
  selectedFilePath: string | null;
}

function FileList({ nodes, onFileClick, selectedFilePath }: FileListProps) {
  return (
    <ul className="file-list">
      {nodes.map((node) => (
        <li key={node.path} className={node.type === 'directory' ? 'folder-item' : 'file-item'}>
          <span
            className={`file-name ${node.type === 'file' ? 'clickable' : ''} ${selectedFilePath === node.path ? 'selected' : ''}`}
            onClick={() => node.type === 'file' && onFileClick(node.path)}
          >
            {node.type === 'directory' ? '📁 ' : '📄 '}
            {node.name}
          </span>
          {node.type === 'directory' && node.children && node.children.length > 0 && (
            <FileList nodes={node.children} onFileClick={onFileClick} selectedFilePath={selectedFilePath} />
          )}
        </li>
      ))}
    </ul>
  );
}


export default App;