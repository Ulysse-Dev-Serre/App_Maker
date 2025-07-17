import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface UseLogsResult {
  logs: LogEntry[];
  isPollingEnabled: boolean;
  setIsPollingEnabled: (enabled: boolean) => void;
  scrollToBottom: () => void;
  logsEndRef: React.RefObject<HTMLDivElement>;
  error: string | null;
}

export const useLogs = (): UseLogsResult => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/get_logs');
      if (response.ok) {
        const data = await response.json();
        if (typeof data.logs === 'string') {
          const logLines = data.logs.split('\n').filter((line: string) => line.trim() !== '');
          const parsedLogs: LogEntry[] = logLines.map((line: string) => {
            let timestamp = "N/A";
            let level = "UNKNOWN";
            let message = line;
            const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARNING|ERROR|DEBUG|CRITICAL) - (.*)$/);
            if (match) {
              timestamp = match[1];
              level = match[2];
              message = match[3];
            } else {
              const partialLevelMatch = line.match(/(INFO|WARNING|ERROR|DEBUG|CRITICAL):?\s*(.*)$/);
              if (partialLevelMatch) {
                  level = partialLevelMatch[1];
                  message = partialLevelMatch[2];
              }
            }
            return { timestamp, level, message };
          });
          setLogs(parsedLogs);
        } else {
          console.warn("Les logs reçus ne sont pas une chaîne de caractères:", data.logs);
          setLogs([]);
        }
      } else {
        setError(`Erreur lors de la récupération des logs: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur réseau lors de la récupération des logs:', err);
      setError(`Erreur réseau lors de la récupération des logs: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  useEffect(() => {
    if (isPollingEnabled) {
      pollingIntervalRef.current = window.setInterval(fetchLogs, 1000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPollingEnabled, fetchLogs]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  return { logs, isPollingEnabled, setIsPollingEnabled, scrollToBottom, logsEndRef, error };
};
