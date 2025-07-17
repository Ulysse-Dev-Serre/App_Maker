import { useState, useEffect, useCallback } from 'react';

interface LlmOptions {
  [provider: string]: string[];
}

interface UseLlmOptionsResult {
  llmOptions: LlmOptions;
  selectedLlmProvider: string;
  setSelectedLlmProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  error: string | null;
}

export const useLlmOptions = (): UseLlmOptionsResult => {
  const [llmOptions, setLlmOptions] = useState<LlmOptions>({});
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro');
  const [error, setError] = useState<string | null>(null);

  const fetchLlmOptions = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/llm_options');
      if (response.ok) {
        const data: LlmOptions = await response.json();
        setLlmOptions(data);
        if (Object.keys(data).length > 0) {
          const defaultProvider = Object.keys(data)[0];
          setSelectedLlmProvider(defaultProvider);
          if (data[defaultProvider] && data[defaultProvider].length > 0) {
            setSelectedModel(data[defaultProvider][0]);
          }
        }
      } else {
        setError(`Erreur lors de la récupération des options LLM: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des options LLM:', err);
      setError(`Erreur réseau lors de la récupération des options LLM: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  useEffect(() => {
    fetchLlmOptions();
  }, [fetchLlmOptions]);

  useEffect(() => {
    if (llmOptions[selectedLlmProvider] && llmOptions[selectedLlmProvider].length > 0) {
      setSelectedModel(llmOptions[selectedLlmProvider][0]);
    } else {
      setSelectedModel('');
    }
  }, [selectedLlmProvider, llmOptions]);

  return { llmOptions, selectedLlmProvider, setSelectedLlmProvider, selectedModel, setSelectedModel, error };
};