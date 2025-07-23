import { useState, useCallback } from 'react';
import { useLlmOptions } from './useLlmOptions';
import { useProjects } from './useProjects';
import { useProblemStatus } from './useProblemStatus';

// Interfaces pour les données (répétées ici pour la clarté du hook, mais idéalement importées d'un fichier de types global)
interface ProjectData {
  project_id: string;
  files: { [key: string]: string };
}
interface ProblemData {
  type: string;
  message: string;
  details?: string;
  timestamp: string;
}

interface UseAppActionsProps {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  projectFiles: { [key: string]: string };
  setProjectFiles: (files: { [key: string]: string }) => void;
  setSelectedFileName: (fileName: string | null) => void;
  prompt: string;
  currentProblem: ProblemData | null;
  fetchProblemStatus: (projectId: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  selectedLlmProvider: string;
  selectedModel: string;
}

interface UseAppActionsResult {
  loading: boolean;
  error: string | null;
  handleGenerateApp: (event: React.FormEvent) => Promise<void>;
  handleUpdateApp: (event: React.FormEvent) => Promise<void>;
  handleRunApp: () => Promise<void>;
  handleStopApp: () => Promise<void>;
  handleFixProblem: () => Promise<void>;
}

export const useAppActions = ({
  projectId,
  setProjectId,
  projectFiles,
  setProjectFiles,
  setSelectedFileName,
  prompt,
  currentProblem,
  fetchProblemStatus,
  fetchProjects,
  selectedLlmProvider,
  selectedModel,
}: UseAppActionsProps): UseAppActionsResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const commonFetchOptions = (method: string, body?: object) => ({
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });


  const handleGenerateApp = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProjectFiles({});
    setProjectId(null);
    setSelectedFileName(null);




    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects/',
        commonFetchOptions('POST', {
          prompt: prompt,
          llm_provider: selectedLlmProvider,
          model_name: selectedModel,
        })
      );

      if (response.ok) {
        const data: ProjectData = await response.json();
        setProjectId(data.project_id);
        setProjectFiles(data.files);
        const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
        setSelectedFileName(defaultFile || null);
        await fetchProjects();
        await fetchProblemStatus(data.project_id); // Vérifier le problème après génération
      } else {
        const errorData = await response.json();
        setError(`Erreur lors de la génération de l'application: ${errorData.detail || response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur réseau lors de la génération de l\'application:', err);
      setError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, selectedLlmProvider, selectedModel, setProjectFiles, setProjectId, setSelectedFileName, fetchProjects, fetchProblemStatus]);

  const handleUpdateApp = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId) {
      setError("Aucun projet sélectionné pour la mise à jour.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/generate`,
        commonFetchOptions('POST', {
          prompt: prompt,
          llm_provider: selectedLlmProvider,
          model_name: selectedModel,
        })
      );

      if (response.ok) {
        const data: ProjectData = await response.json();
        setProjectFiles(data.files);
        if (!setSelectedFileName || !data.files[setSelectedFileName]) { // Correction ici
            const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
            setSelectedFileName(defaultFile || null);
        }
        await fetchProblemStatus(projectId); // Vérifier le problème après mise à jour
      } else {
        const errorData = await response.json();
        setError(`Erreur lors de la mise à jour de l'application: ${errorData.detail || response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur réseau lors de la mise à jour de l\'application:', err);
      setError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, prompt, selectedLlmProvider, selectedModel, setProjectFiles, setSelectedFileName, fetchProblemStatus]);




  

  const handleRunApp = useCallback(async () => {
    if (!projectId) {
      console.log("handleRunApp: Pas de projectId, annulation."); // NOUVEAU LOG
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log(`handleRunApp: Tentative de lancement de l'application pour le projet ${projectId}`); // NOUVEAU LOG
      const response = await fetch(`http://127.0.0.1:8000/api/runner/run`, commonFetchOptions('POST', { project_id: projectId }));

      if (response.ok) {
        console.log("handleRunApp: Application lancée avec succès, attente de 5 secondes..."); // NOUVEAU LOG
        // Attendre 5 secondes pour laisser le temps au backend de créer problem.json si l'app crashe
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log("handleRunApp: Attente de 5 secondes terminée, récupération du statut du problème..."); // NOUVEAU LOG
        await fetchProblemStatus(projectId);
        alert("Application lancée.");
      } else {
        const errorData = await response.json();
        setError(`Erreur lors du lancement de l'application: ${errorData.detail || response.statusText}`);
        console.error(`handleRunApp: Erreur lors du lancement de l'application:`, errorData); // NOUVEAU LOG
      }
    } catch (err) {
      console.error('handleRunApp: Erreur réseau lors du lancement de l\'application:', err); // NOUVEAU LOG
      setError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchProblemStatus]);






  const handleStopApp = useCallback(async () => {
    if (!projectId) {
      setError("Aucun projet sélectionné pour l'arrêt.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/runner/stop',
        commonFetchOptions('POST', { project_id: projectId })
      );
      if (!response.ok) {
        const errorData = await response.json();
        setError(`Erreur lors de l'arrêt de l'application: ${errorData.detail || response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur réseau lors de l\'arrêt de l\'application:', err);
      setError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleFixProblem = useCallback(async () => {
    if (!projectId || !currentProblem) {
      setError("Aucun problème actif ou projet sélectionné pour la résolution.");
      return;
    }

    setLoading(true);
    setError(null);

    const fixPrompt = `L'application a rencontré un problème. Voici le code actuel de l'application et les logs d'erreur :\n\n` +
                     `--- CODE ACTUEL ---\n` +
                     Object.entries(projectFiles).map(([name, content]) => `## Fichier: ${name}\n\`\`\`python\n${content}\n\`\`\``).join('\n\n') +
                     `\n\n--- LOGS D'ERREUR ---\n` +
                     `Type de problème: ${currentProblem.type}\n` +
                     `Message: ${currentProblem.message}\n` +
                     `Détails: ${currentProblem.details || "Aucun détail supplémentaire."}\n\n` +
                     `Veuillez analyser ces informations et fournir les modifications nécessaires aux fichiers pour corriger le problème. ` +
                     `Retournez SEULEMENT les fichiers modifiés/créés/supprimés dans le format JSON spécifié.`;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/generate`,
        commonFetchOptions('POST', {
          prompt: fixPrompt,
          llm_provider: selectedLlmProvider,
          model_name: selectedModel,
        })
      );

      if (response.ok) {
        const data: ProjectData = await response.json();
        setProjectFiles(data.files);
        if (!setSelectedFileName || !data.files[setSelectedFileName]) { // Correction ici
            const defaultFile = data.files['main.py'] ? 'main.py' : Object.keys(data.files)[0];
            setSelectedFileName(defaultFile || null);
        }
        await fetchProblemStatus(projectId);
        alert("Tentative de résolution du problème effectuée. Veuillez relancer l'application pour vérifier.");
      } else {
        const errorData = await response.json();
        setError(`Erreur lors de la tentative de résolution: ${errorData.detail || response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur réseau lors de la tentative de résolution:', err);
      setError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentProblem, projectFiles, selectedLlmProvider, selectedModel, setProjectFiles, setSelectedFileName, fetchProblemStatus]);

  return { loading, error, handleGenerateApp, handleUpdateApp, handleRunApp, handleStopApp, handleFixProblem };
};