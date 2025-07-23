// ProjectSidebar.tsx
import React, { useState } from 'react';
import { Pencil, Save, X, Trash2, Folder, FolderOpen } from 'lucide-react';

// Supprimez cette ligne car la fonction apiFetch locale ne sera plus utilisée pour la suppression.
// const apiFetch = (endpoint: string, init?: RequestInit) =>
//   fetch(`http://127.0.0.1:8000${endpoint}`, init);

interface ProjectInfo {
  project_id: string;
  name: string;
}

interface Props {
  projects: ProjectInfo[];
  selectedProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onClose: () => void;
  loading: boolean;
  isVisible: boolean;
  fetchProjects: () => Promise<void>;
  // Ajoutez les props pour le renommage et la suppression depuis les hooks
  onProjectRename: (id: string, newName: string) => Promise<void>;
  onProjectDelete: (id: string) => Promise<void>; // Assurez-vous que cette prop est bien reçue
}

export default function ProjectSidebar({
  projects,
  selectedProjectId,
  onProjectSelect,
  onClose,
  loading,
  isVisible,
  fetchProjects, // Gardez cette prop si elle est utilisée ailleurs pour rafraîchir explicitement
  onProjectRename, // Ajoutez cette prop
  onProjectDelete, // Ajoutez cette prop
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const startRename = (p: ProjectInfo) => {
    setEditingId(p.project_id);
    setDraftName(p.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftName('');
  };

  const confirmRename = async (id: string) => {
    if (!draftName.trim()) return;
    // Utilisez la prop onProjectRename
    await onProjectRename(id, draftName.trim());
    cancelRename();
    // fetchProjects() est déjà appelé dans onProjectRename (via useProjects.handleProjectRename)
  };

  const confirmDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce projet ?')) return;
    // Utilisez la prop onProjectDelete
    await onProjectDelete(id); // Ceci appellera handleProjectDelete de useProjects
    // fetchProjects() est déjà appelé dans onProjectDelete (via useProjects.handleProjectDelete)
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-72 bg-gray-900 text-gray-100 p-4 shadow-lg transition-transform duration-300 ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <header className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-teal-400">Projets</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      </header>

      {loading && <p className="text-sm text-center text-teal-300">Chargement…</p>}

      <ul className="mt-3 space-y-1 overflow-y-auto flex-1">
        {!loading && projects.length === 0 && (
          <li className="text-sm text-center text-gray-500 py-4">Aucun projet.</li>
        )}
        {projects.map((p) => (
          <li key={p.project_id}>
            {editingId === p.project_id ? (
              <div className="flex items-center gap-2">
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRename(p.project_id)}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded focus:ring-1 focus:ring-teal-500"
                />
                <button
                  onClick={() => confirmRename(p.project_id)}
                  className="p-1 text-green-400 hover:text-green-300"
                  aria-label="Sauvegarder"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={cancelRename}
                  className="p-1 text-red-400 hover:text-red-300"
                  aria-label="Annuler"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-1.5 rounded hover:bg-gray-700 group">
                <button
                  onClick={() => onProjectSelect(p.project_id)}
                  className={`flex items-center gap-2 flex-1 text-left text-sm truncate ${
                    selectedProjectId === p.project_id
                      ? 'font-semibold text-teal-400'
                      : 'text-gray-300'
                  }`}
                >
                  {selectedProjectId === p.project_id ? (
                    <FolderOpen size={16} />
                  ) : (
                    <Folder size={16} />
                  )}
                  <span title={p.name}>{p.name}</span>
                </button>
                <div className="hidden group-hover:flex gap-1">
                  <button
                    onClick={() => startRename(p)}
                    className="p-1 text-gray-400 hover:text-teal-400"
                    aria-label="Renommer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => confirmDelete(p.project_id)}
                    className="p-1 text-gray-400 hover:text-red-400"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}