// src/components/TerminalSection.tsx
import React, { memo, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface Props {
  logs: LogEntry[];
  logsEndRef: React.RefObject<HTMLDivElement>;
  currentProblem: any; // same shape as before
}

const TerminalSection = memo(({ logs, logsEndRef, currentProblem }: Props) => {
  const lines = useRef<string[]>([]);

  // Build fake shell transcript
  useEffect(() => {
    const shell: string[] = [];
    logs.forEach((l) => {
      // Convert backend log -> shell line
      if (l.message.includes('Lancement de l’application')) {
        shell.push('$ python main.py');
      } else if (l.message.includes('Environnement virtuel non trouvé')) {
        shell.push('$ python3 -m venv .venv');
        shell.push('$ source .venv/bin/activate');
        shell.push('$ pip install -r requirements.txt');
      } else {
        shell.push(`[${l.level}] ${l.message}`);
      }
    });

    if (currentProblem) {
      shell.push(''); // blank line
      shell.push(`>>> ${currentProblem.type} : ${currentProblem.message}`);
      shell.push(currentProblem.details || '');
    }

    lines.current = shell;
  }, [logs, currentProblem]);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-green-400 font-mono text-sm">
      <div className="px-3 py-1 bg-gray-800 text-teal-300 border-b border-gray-700">
        Terminal
      </div>
      <div className="flex-1 overflow-y-auto p-3 whitespace-pre-wrap">
        {lines.current.map((line, i) => (
          <div key={i} className="leading-tight">
            {line}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
});
TerminalSection.displayName = 'TerminalSection';
export default TerminalSection;