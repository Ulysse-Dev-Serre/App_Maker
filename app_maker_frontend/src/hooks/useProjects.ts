import { useState, useEffect, useCallback } from 'react';

interface ProjectInfo {
  project_id: string;
  name: string;
}

interface UseProjectsResult {
  projects: ProjectInfo[];
  fetchProjects: () => Promise<void>;
  handleProjectRename: (id: string, newName: string) => Promise<void>;
  handleProjectDelete: (id: string) => Promise<void>;
  error: string | null;
  loading: boolean; // Ajout d'un état de chargement pour les actions
}

export const useProjects = (): UseProjectsResult => {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects/');
      if (response.ok) {
        const data: ProjectInfo[] = await response.json();
        setProjects(data);
      } else {
        setError(`Erreur lors de la récupération de la liste des projets: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des projets:', err);
      setError(`Erreur réseau lors de la récupération des projets: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

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
      } else {
        const errorData = await response.json();
        setError(`Erreur lors du renommage du projet: ${errorData.detail || response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors du renommage du projet:', err);
      setError(`Erreur réseau lors du renommage du projet: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  const handleProjectDelete = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchProjects(); // Rafraîchit la liste des projets
      } else {
        const errorData = await response.json();
        setError(`Erreur lors de la suppression du projet: ${errorData.detail || response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du projet:', err);
      setError(`Erreur réseau lors de la suppression du projet: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, fetchProjects, handleProjectRename, handleProjectDelete, error, loading };
};
