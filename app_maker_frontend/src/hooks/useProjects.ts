import { useState, useEffect, useCallback } from 'react';

interface ProjectInfo {
  project_id: string;
  name: string;
}

interface UseProjectsResult {
  projects: ProjectInfo[];
  fetchProjects: () => Promise<ProjectInfo[]>; // NOUVEAU: La fonction retourne Promise<ProjectInfo[]>
  handleProjectRename: (id: string, newName: string) => Promise<void>;
  handleProjectDelete: (id: string) => Promise<void>;
  error: string | null;
  loading: boolean;
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
        return data; // NOUVEAU: Retourne les données récupérées
      } else {
        setError(`Erreur lors de la récupération de la liste des projets: ${response.statusText}`);
        return []; // Retourne un tableau vide en cas d'erreur
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des projets:', err);
      setError(`Erreur réseau lors de la récupération des projets: ${err instanceof Error ? err.message : String(err)}`);
      return []; // Retourne un tableau vide en cas d'erreur réseau
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
    // La première exécution de fetchProjects se fera via le useEffect de App.tsx
    // pour que la logique de chargement du dernier projet puisse utiliser les données.
    // Cette ligne peut être retirée si la gestion de fetchProjects est centralisée dans App.tsx
    // ou si on veut s'assurer que 'projects' est toujours à jour pour d'autres usages du hook.
    // Pour l'instant, je la laisse pour la cohérence du hook, mais le chargement initial est géré par App.tsx.
    // fetchProjects();
  }, []); // Dépendances vides pour qu'il ne s'exécute qu'une fois au montage

  return { projects, fetchProjects, handleProjectRename, handleProjectDelete, error, loading };
};
