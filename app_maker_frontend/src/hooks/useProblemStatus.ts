// useProblemStatus.ts
import { useState, useEffect, useCallback } from 'react';

interface ProblemData {
  type: string;
  message: string;
  details?: string;
  timestamp: string;
}

interface UseProblemStatusResult {
  currentProblem: ProblemData | null;
  fetchProblemStatus: (projectId: string) => Promise<void>; // Correct interface
  error: string | null;
}

export const useProblemStatus = (hookProjectId: string | null): UseProblemStatusResult => { // Renommé pour plus de clarté
  const [currentProblem, setCurrentProblem] = useState<ProblemData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modifiez fetchProblemStatus pour accepter projectId comme argument
  const fetchProblemStatus = useCallback(async (projectIdToFetch: string) => { // Accepte projectId comme argument
    if (!projectIdToFetch) {
      console.log(`fetchProblemStatus: Pas de projectId fourni, annulation.`); // Log pour débogage
      return;
    }
    console.log(`fetchProblemStatus: Appelée pour projectId: ${projectIdToFetch}`); // Utilise l'argument
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${projectIdToFetch}/problem_status`); // Utilise l'argument
      if (response.ok) {
        const data = await response.json();
        console.log(`fetchProblemStatus: Réponse reçue pour projectId ${projectIdToFetch}:`, data.problem); // Utilise l'argument
        setCurrentProblem(data.problem || null);
      } else {
        const errorText = await response.text();
        console.error(`fetchProblemStatus: Erreur de réponse HTTP pour projectId ${projectIdToFetch}: ${response.status} ${response.statusText}`, errorText); // Utilise l'argument
        setError(`Erreur: ${response.statusText} (${response.status})`);
      }
    } catch (err) {
      console.error(`fetchProblemStatus: Erreur réseau pour projectId ${projectIdToFetch}:`, err); // Utilise l'argument
      setError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []); // Les dépendances sont vides car projectIdToFetch est un argument, ce qui rend la fonction plus stable.

  useEffect(() => {
    // Ce useEffect gère le polling, en utilisant le hookProjectId
    if (!hookProjectId) {
      console.log('useEffect useProblemStatus: Pas de projectId, pas de polling.');
      return;
    }
    console.log(`useEffect useProblemStatus: Démarrage du polling pour projectId: ${hookProjectId}`);
    // Passe hookProjectId à fetchProblemStatus pour le polling
    const pollFunction = () => fetchProblemStatus(hookProjectId);
    const id = setInterval(pollFunction, 3000);
    return () => {
      console.log(`useEffect useProblemStatus: Arrêt du polling pour projectId: ${hookProjectId}`);
      clearInterval(id);
    };
  }, [hookProjectId, fetchProblemStatus]); // Dépendances: hookProjectId et la fonction fetchProblemStatus mémoïsée

  return { currentProblem, fetchProblemStatus, error };
};
