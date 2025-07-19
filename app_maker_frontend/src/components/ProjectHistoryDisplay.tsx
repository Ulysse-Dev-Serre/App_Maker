import React from 'react';
import type { HistoryEntry, ProjectHistory } from '@/types/api';

interface Props { projectHistory: ProjectHistory | null }

export default function ProjectHistoryDisplay({ projectHistory }: Props) {
  if (!projectHistory?.prompts?.length) {
    return (
      <div className="max-h-[min(40vh,512px)] overflow-y-auto p-3 bg-gray-900 rounded-md">
        <p className="text-sm text-center text-gray-500">
          Aucun historique pour ce projet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[min(40vh,512px)] overflow-y-auto p-3 bg-gray-900 rounded-md space-y-3">
      {projectHistory.prompts.map((entry, i) => (
        <article
          key={i}
          className={`p-3 rounded-md text-sm ${
            entry.type === 'user' ? 'bg-gray-700' : 'bg-teal-900/40'
          }`}
        >
          <h4 className="font-semibold mb-1">
            {entry.type === 'user' ? 'Votre prompt' : 'Réponse LLM'}
          </h4>

          {typeof entry.content === 'string' ? (
            <pre className="whitespace-pre-wrap text-xs text-gray-200 bg-gray-800 p-2 rounded">
              {entry.content}
            </pre>
          ) : entry.content ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-teal-300">
                {Object.keys(entry.content).length} fichier(s)
              </summary>
              <ul className="mt-2 space-y-1">
                {Object.entries(entry.content).map(([name, code]) => (
                  <li key={name}>
                    <strong className="text-teal-400 text-xs">{name}</strong>
                    <pre className="whitespace-pre-wrap text-xs text-gray-300 bg-gray-800 p-2 rounded">
                      {code}
                    </pre>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="text-xs text-gray-500">Contenu non disponible.</p>
          )}

          <time
            dateTime={entry.timestamp}
            className="block text-right text-xs text-gray-400 mt-1"
          >
            {new Date(entry.timestamp).toLocaleString()}
          </time>
        </article>
      ))}
    </div>
  );
}