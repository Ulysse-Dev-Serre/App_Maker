import { useState, useEffect, useCallback } from 'react';

interface ProblemData {
  type: string;
  message: string;
  details?: string;
  timestamp: string;
}

interface UseProblemStatusResult {
  currentProblem: ProblemData | null;
  fetchProblemStatus: (projectId: string) => Promise<void>;
  error: string | null;
}

export const useProblemStatus = (): UseProblemStatusResult => {
  const [currentProblem, setCurrentProblem] = useState<ProblemData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProblemStatus = useCallback(async (projectId: string) => {
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/problem_status`);
      if (response.ok) {
        const data = await response.json();
        setCurrentProblem(data.problem || null);
      } else {
        console.error(`Erreur lors de la récupération du statut du problème: ${response.statusText}`);
        setCurrentProblem(null);
        setError(`Erreur lors de la récupération du statut du problème: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur réseau lors de la récupération du statut du problème:', err);
      setCurrentProblem(null);
      setError(`Erreur réseau lors de la récupération du statut du problème: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  return { currentProblem, fetchProblemStatus, error };
};