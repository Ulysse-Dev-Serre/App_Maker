import React, { useState } from 'react';
import './ProjectSidebar.css'; // Créez ce fichier CSS

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
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onProjectRename,
  onProjectDelete,
  loading,
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
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.")) {
      onProjectDelete(projectIdToDelete);
    }
  };

  return (
    <div className="project-sidebar">
      <h2>Mes Projets</h2>
      {loading && <p>Chargement des projets...</p>}
      <ul className="project-list">
        {projects.length === 0 ? (
          <li className="no-projects">Aucun projet trouvé. Créez-en un !</li>
        ) : (
          projects.map((project) => (
            <li
              key={project.project_id}
              className={`project-item ${selectedProjectId === project.project_id ? 'selected' : ''}`}
            >
              {editingProjectId === project.project_id ? (
                <div className="project-rename-form">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveRename(project.project_id);
                    }}
                    disabled={loading}
                  />
                  <button onClick={() => handleSaveRename(project.project_id)} disabled={loading}>
                    💾
                  </button>
                  <button onClick={handleCancelRename} disabled={loading}>
                    ❌
                  </button>
                </div>
              ) : (
                <>
                  <span className="project-name" onClick={() => onProjectSelect(project.project_id)}>
                    {project.name}
                  </span>
                  <div className="project-actions">
                    <button onClick={() => handleEditClick(project)} disabled={loading}>
                      ✏️
                    </button>
                    <button onClick={() => handleDeleteClick(project.project_id)} disabled={loading}>
                      🗑️
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