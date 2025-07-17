import React from 'react';
import './FileExplorer.css'; // Créez ce fichier CSS

interface FileExplorerProps {
  projectId: string | null;
  files: { [key: string]: string }; // Dictionnaire de tous les fichiers
  selectedFileName: string | null; // Nom du fichier actuellement sélectionné
  onFileSelect: (fileName: string) => void; // Callback quand un fichier est sélectionné
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  projectId,
  files,
  selectedFileName,
  onFileSelect,
}) => {
  if (!projectId) {
    return (
      <div className="file-explorer">
        <h2>Explorateur de Fichiers</h2>
        <p>Sélectionnez un projet pour voir ses fichiers.</p>
      </div>
    );
  }

  // Pour créer une structure arborescente à partir d'un dictionnaire de chemins plats
  const buildFileTree = (filePaths: string[]) => {
    const tree: any = {};

    filePaths.forEach(path => {
      const parts = path.split('/');
      let currentLevel = tree;

      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = { _is_file: false };
        }
        if (index === parts.length - 1) {
          currentLevel[part]._is_file = true;
          currentLevel[part]._full_path = path; // Stocke le chemin complet
        }
        currentLevel = currentLevel[part];
      });
    });
    return tree;
  };

  const fileTree = buildFileTree(Object.keys(files));

  const renderTree = (node: any, currentPath: string = '') => {
    return Object.keys(node)
      .sort((a, b) => { // Trier les dossiers avant les fichiers, puis par nom
        const isADir = !node[a]._is_file;
        const isBDir = !node[b]._is_file;
        if (isADir && !isBDir) return -1;
        if (!isADir && isBDir) return 1;
        return a.localeCompare(b);
      })
      .map(key => {
        if (key === '_is_file' || key === '_full_path') return null; // Ignorer les métadonnées

        const isFile = node[key]._is_file;
        const fullPath = node[key]._full_path || (currentPath ? `${currentPath}/${key}` : key);
        const isSelected = selectedFileName === fullPath;

        return (
          <div key={fullPath} className={`tree-item ${isFile ? 'file-item' : 'folder-item'}`}>
            <span
              className={`item-name ${isFile ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => isFile && onFileSelect(fullPath)}
            >
              {isFile ? '📄 ' : '📁 '}
              {key}
            </span>
            {!isFile && node[key] && (
              <div className="children">
                {renderTree(node[key], fullPath)}
              </div>
            )}
          </div>
        );
      });
  };

  return (
    <div className="file-explorer">
      <h2>Explorateur de Fichiers</h2>
      <div className="file-tree">
        {renderTree(fileTree)}
      </div>
    </div>
  );
};

export default FileExplorer;