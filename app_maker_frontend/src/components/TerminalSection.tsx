import React from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface TerminalSectionProps {
  logs: LogEntry[];
  isPollingEnabled: boolean;
  setIsPollingEnabled: (enabled: boolean) => void;
  logsEndRef: React.RefObject<HTMLDivElement>;
}

const TerminalSection: React.FC<TerminalSectionProps> = ({
  logs,
  isPollingEnabled,
  setIsPollingEnabled,
  logsEndRef,
}) => {
  return (
    <div className="terminal-section">
      <h2>Logs du Backend</h2>
      <button
        onClick={() => setIsPollingEnabled(!isPollingEnabled)}
        style={{ marginBottom: '10px' }}
      >
        {isPollingEnabled ? 'Désactiver Polling des Logs' : 'Activer Polling des Logs'}
      </button>
      <div className="logs-output">
        {logs.map((log, index) => (
          <p key={index} className={`log-level-${log.level.toLowerCase()}`}>
            [{log.timestamp}] {log.level}: {log.message}
          </p>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default TerminalSection;