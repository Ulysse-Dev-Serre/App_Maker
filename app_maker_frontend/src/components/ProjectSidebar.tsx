import React, { useState } from 'react';
// Import des icônes de lucide-react
import { Pencil, Save, X, Trash2, Folder, FolderOpen, PlusCircle } from 'lucide-react'; // Ajout de PlusCircle pour un bouton "New Project"

interface ProjectInfo {
  project_id: string;
  name: string;
}

interface ProjectSidebarProps {
  projects: ProjectInfo[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  onProjectRename: (projectId: string, newName: string) => void;
  onProjectDelete: (projectId: string) => void;
  loading: boolean;
  isVisible: boolean;
  onClose: () => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onProjectRename,
  onProjectDelete,
  loading,
  isVisible,
  onClose,
}) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState<string>('');

  const handleEditClick = (project: ProjectInfo) => {
    setEditingProjectId(project.project_id);
    setNewProjectName(project.name);
  };

  const handleSaveRename = (projectIdToRename: string) => {
    if (newProjectName.trim() && newProjectName !== projects.find(p => p.project_id === projectIdToRename)?.name) {
      onProjectRename(projectIdToRename, newProjectName.trim());
    }
    setEditingProjectId(null);
    setNewProjectName('');
  };

  const handleCancelRename = () => {
    setEditingProjectId(null);
    setNewProjectName('');
  };

  const handleDeleteClick = (projectIdToDelete: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.")) {
      onProjectDelete(projectIdToDelete);
    }
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 w-80 bg-gray-900 text-gray-100 p-4 shadow-2xl transform transition-transform duration-300 ease-in-out z-20
        ${isVisible ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col`}
    >
      {/* Header de la Sidebar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
        <h2 className="text-2xl font-semibold text-teal-400">Projets</h2>
        <button
          className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-teal-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75"
          onClick={onClose}
          aria-label="Fermer la sidebar"
        >
          <X size={18} /> {/* Icône de fermeture légèrement plus petite */}
        </button>
      </div>

      {/* Bouton "New Project" - Ajouté pour l'exemple de la barre latérale */}
      <button
        className="flex items-center w-full p-2 mb-4 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75 shadow-md"
        // onClick={() => handleCreateNewProject()} // Ajoutez votre logique de création de nouveau projet ici
      >
        <PlusCircle size={16} className="mr-2" /> Nouveau Projet
      </button>
      
      {/* Message de chargement */}
      {loading && <p className="text-center text-teal-300 animate-pulse mt-4">Chargement des projets...</p>}
      
      {/* Liste des projets */}
      <ul className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
        {projects.length === 0 && !loading ? (
          <li className="text-center text-gray-400 p-4 bg-gray-800 rounded-md">
            Aucun projet trouvé. Créez-en un !
          </li>
        ) : (
          projects.map((project) => (
            <li
              key={project.project_id}
              className={`flex items-center justify-between p-2 rounded-md transition-colors duration-200 cursor-pointer group
                ${selectedProjectId === project.project_id
                  ? 'bg-teal-700 text-white font-semibold' // Style pour l'élément sélectionné
                  : 'hover:bg-gray-700 text-gray-300'}` // Style au survol et par défaut
              }
            >
              {editingProjectId === project.project_id ? (
                <div className="flex items-center w-full space-x-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveRename(project.project_id);
                    }}
                    disabled={loading}
                    className="flex-1 p-1.5 rounded-md bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => handleSaveRename(project.project_id)}
                    disabled={loading}
                    className="p-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    title="Sauvegarder le nom"
                  >
                    <Save size={14} /> {/* Icône plus petite */}
                  </button>
                  <button
                    onClick={handleCancelRename}
                    disabled={loading}
                    className="p-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                    title="Annuler le renommage"
                  >
                    <X size={14} /> {/* Icône plus petite */}
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="flex items-center flex-1 min-w-0" // Utilise min-w-0 pour permettre la troncature
                    onClick={() => onProjectSelect(project.project_id)}
                  >
                    {selectedProjectId === project.project_id ? (
                      <FolderOpen size={14} className="text-teal-300 mr-2 flex-shrink-0" /> 
                    ) : (
                      <Folder size={14} className="text-gray-500 group-hover:text-teal-300 mr-2 flex-shrink-0" /> 
                    )}
                    <span
                      className="text-sm truncate" // Texte plus petit et tronqué si trop long
                      title={project.name} // Le nom complet s'affiche au survol
                    >
                      {project.name}
                    </span>
                  </div>
                  <div className={`flex space-x-1 ml-4 ${editingProjectId === project.project_id ? 'hidden' : 'flex'}`}>
                    <button
                      onClick={() => handleEditClick(project)}
                      disabled={loading}
                      className="p-1.5 rounded-md hover:bg-gray-600 text-gray-400 hover:text-teal-400 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      title="Renommer le projet"
                    >
                      <Pencil size={14} /> {/* Icône plus petite */}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project.project_id)}
                      disabled={loading}
                      className="p-1.5 rounded-md hover:bg-red-800 text-gray-400 hover:text-red-400 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                      title="Supprimer le projet"
                    >
                      <Trash2 size={14} /> {/* Icône plus petite */}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ProjectSidebar;