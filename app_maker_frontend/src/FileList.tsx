// app_maker_frontend/src/FileList.tsx
import React, { useState } from 'react';
import './FileList.css'; // Vous pouvez créer ce fichier CSS pour le style

interface FileListProps {
  projectId: string | null;
  files: { [key: string]: string };
}

const FileList: React.FC<FileListProps> = ({ projectId, files }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  if (!projectId || Object.keys(files).length === 0) {
    return (
      <div className="file-list-container">
        <h2>Fichiers du Projet</h2>
        <p>Aucun fichier de projet à afficher pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      <h2>Fichiers du Projet: {projectId}</h2>
      <div className="file-names-list">
        {Object.keys(files).map((fileName) => (
          <button
            key={fileName}
            className={`file-name-button ${selectedFile === fileName ? 'active' : ''}`}
            onClick={() => setSelectedFile(fileName)}
          >
            {fileName}
          </button>
        ))}
      </div>
      {selectedFile && files[selectedFile] !== null && (
        <div className="file-content-display">
          <h3>Contenu de {selectedFile}</h3>
          <pre><code>{files[selectedFile]}</code></pre>
        </div>
      )}
       {selectedFile && files[selectedFile] === null && (
        <div className="file-content-display">
          <h3>Contenu de {selectedFile}</h3>
          <p>Ce fichier a été marqué pour suppression.</p>
        </div>
      )}
    </div>
  );
};

export default FileList;