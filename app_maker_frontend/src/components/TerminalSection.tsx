// src/components/TerminalSection.tsx
import React, { memo, useEffect, useRef } from 'react';

// Types d'interface pour le TerminalSection
interface TerminalSectionProps {
  logs: string[]; // Logs à afficher (provenant de useLogs dans App.tsx)
  isPollingEnabled: boolean; // État d'activation du polling (non utilisé directement ici pour l'affichage)
  setIsPollingEnabled: (enabled: boolean) => void; // Fonction pour changer l'état du polling (non utilisé directement ici pour l'affichage)
  logsEndRef: React.RefObject<HTMLDivElement>; // Référence pour le défilement automatique
}

const TerminalSectionComponent = memo(({
  logs,
  logsEndRef,
}: TerminalSectionProps) => {

  // Effet pour faire défiler le terminal vers le bas lorsque de nouveaux logs arrivent
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, logsEndRef]);

  return (
    <div className="h-full w-full bg-gray-950 rounded-lg overflow-hidden flex flex-col">
      <h3 className="text-lg font-semibold text-teal-400 p-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        Terminal
      </h3>
      <div className="flex-1 overflow-y-auto modern-scrollbar p-3 text-gray-200 font-mono text-sm">
        {logs.map((log, index) => (
          // Utilisation de <pre> pour préserver les retours à la ligne et les espaces
          // et application de classes Tailwind pour le style
          <pre key={index} className="whitespace-pre-wrap break-words font-mono text-sm text-gray-200">{log}</pre>
        ))}
        <div ref={logsEndRef} /> {/* Pour le défilement automatique */}
      </div>
    </div>
  );
});

export default TerminalSectionComponent