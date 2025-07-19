// src/components/FileExplorer.tsx
import React, { memo, useCallback, useMemo } from 'react';

// Types d'interface pour les fichiers du projet (correspond à projectFiles de App.tsx)
interface ProjectFiles {
  [filePath: string]: string; // Le contenu est une chaîne de caractères
}

interface FileExplorerProps {
  files: ProjectFiles; // La carte des fichiers du projet (du App.tsx)
  selectedFileName: string | null; // Le chemin du fichier actuellement sélectionné
  onFileSelect: (filePath: string) => void; // Callback quand un fichier est sélectionné
  projectId: string | null; // ID du projet, passé pour la cohérence (non utilisé directement ici, mais utile pour App.tsx)
  currentProjectName: string | null; // <-- NOUVELLE PROP
}

// Composant pour un élément individuel dans l'arborescence des fichiers
interface FileTreeItemProps {
  name: string;
  path: string;
  type: 'file' | 'folder';
  depth: number;
  isSelected: boolean;
  onSelect: (path: string) => void;
  children?: FileTreeItemProps[];
}

const FileTreeItem = memo(({ name, path, type, depth, isSelected, onSelect, children }: FileTreeItemProps) => {
  const paddingLeft = `${depth * 16 + 8}px`; // Indentation basée sur la profondeur

  const handleClick = useCallback(() => {
    if (type === 'file') {
      onSelect(path);
    }
    // Pour les dossiers, on pourrait ajouter une logique de dépliage/repliage ici
    // Pour cette version simplifiée, les dossiers ne sont pas interactifs.
  }, [path, type, onSelect]);

  const icon = type === 'folder' ? '📁' : '📄'; // Icônes simples pour dossier/fichier

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer transition-colors duration-150 ease-in-out
          ${isSelected ? 'bg-teal-700 text-white' : 'hover:bg-gray-700 text-gray-100'}
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        <span className="mr-2">{icon}</span>
        <span>{name}</span>
      </div>
      {children && (
        <div className="pl-4"> {/* Indentation pour les enfants */}
          {children.map((child) => (
            <FileTreeItem key={child.path} {...child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
});
FileTreeItem.displayName = 'FileTreeItem';


const FileExplorerComponent = memo(({ // Renommé pour l'export par défaut
  files,
  selectedFileName,
  onFileSelect,
  projectId, // Non utilisé directement dans ce composant, mais passé par App.tsx
  currentProjectName, // <-- UTILISATION DE LA NOUVELLE PROP
}: FileExplorerProps) => {

  // Construction de l'arborescence des fichiers à partir de l'objet `files`
  const fileTree = useMemo(() => {
    const tree: { [key: string]: FileTreeItemProps } = {};
    const paths = Object.keys(files).sort(); // Trier les chemins pour un affichage cohérent

    paths.forEach(filePath => {
      const parts = filePath.split('/');
      let currentPath = '';
      let currentLevel = tree;

      parts.forEach((part, index) => {
        const isLastPart = index === parts.length - 1;
        const fullPath = (currentPath ? currentPath + '/' : '') + part;

        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            path: fullPath,
            type: isLastPart && files[filePath] !== undefined ? 'file' : 'folder', // Si le chemin existe dans `files` et c'est la dernière partie, c'est un fichier
            depth: index,
            isSelected: fullPath === selectedFileName,
            onSelect: onFileSelect,
            children: [],
          };
        } else {
          // Si le dossier existe déjà, assurez-vous que son type est 'folder'
          currentLevel[part].type = 'folder';
        }

        if (!isLastPart) {
          // S'assurer que le dossier a un tableau children
          if (!currentLevel[part].children) {
            currentLevel[part].children = [];
          }
          // Passer au niveau suivant
          currentLevel = currentLevel[part].children!.reduce((acc, item) => {
            acc[item.name] = item;
            return acc;
          }, {} as { [key: string]: FileTreeItemProps });
          currentPath = fullPath;
        }
      });
    });

    // Convertir l'objet en tableau pour le rendu
    const convertObjectToArray = (obj: { [key: string]: FileTreeItemProps }): FileTreeItemProps[] => {
      const result = Object.values(obj).sort((a, b) => {
        // Trier les dossiers avant les fichiers, puis par nom
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      result.forEach(item => {
        if (item.children) {
          item.children = convertObjectToArray(item.children.reduce((acc, child) => {
            acc[child.name] = child;
            return acc;
          }, {} as { [key: string]: FileTreeItemProps }));
        }
      });
      return result;
    };

    return convertObjectToArray(tree);
  }, [files, selectedFileName, onFileSelect]);


  return (
    <div className="h-full w-full overflow-y-auto modern-scrollbar bg-gray-900 text-gray-100">
      {/* Affichage du nom du projet actuel en haut de l'explorateur de fichiers */}
      {currentProjectName && (
        <div className="p-3 bg-gray-800 text-teal-300 font-semibold text-center border-b border-gray-700 sticky top-0 z-10">
          Projet : {currentProjectName}
        </div>
      )}

      {fileTree.length === 0 && (
        <div className="p-4 text-center text-gray-400">
          Aucun fichier dans le projet.
        </div>
      )}
      {fileTree.map((item) => (
        <FileTreeItem key={item.path} {...item} onSelect={onFileSelect} />
      ))}
    </div>
  );
});

// Exportation par défaut du composant
export default FileExplorerComponent;