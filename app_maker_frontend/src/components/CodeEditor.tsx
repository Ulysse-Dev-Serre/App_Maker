// src/components/CodeEditor.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment, EditorSelection } from '@codemirror/state';
import { LanguageDescription, indentUnit, indentOnInput, bracketMatching, foldGutter } from '@codemirror/language';
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands';
import { autocompletion, acceptCompletion, closeBrackets } from '@codemirror/autocomplete';
import { searchKeymap } from '@codemirror/search';
import {
  lineNumbers, highlightActiveLineGutter, highlightActiveLine,
  drawSelection, dropCursor, scrollPastEnd, keymap, showTooltip, tooltips
} from '@codemirror/view';

// Pas d'importation de fichiers de "bolt.diy", tout est autonome ici.

interface EditorSettings {
  fontSize?: string;
  tabSize?: number;
}

interface CodeEditorProps {
  value: string; // Le contenu du fichier à afficher
  selectedFileName: string | null; // Le nom du fichier sélectionné (pour le support de langage)
  readOnly?: boolean; // Si l'éditeur est en lecture seule
  onContentChange?: (content: string) => void; // Callback pour les changements de contenu
  onSave?: () => void; // Callback pour la sauvegarde (ex: Ctrl+S)
  theme?: 'light' | 'dark'; // Thème de l'éditeur (par défaut à 'dark' pour correspondre à votre App.tsx)
  settings?: EditorSettings; // Paramètres de l'éditeur (ex: taille de police, taille d'onglet)
}

// Composant pour afficher un message pour les fichiers binaires
// Ceci remplace le BinaryContent.tsx de bolt.diy
const BinaryContent = memo(() => {
  return (
    <div className="flex items-center justify-center absolute inset-0 z-10 text-sm bg-gray-900 text-gray-400">
      Le format de fichier ne peut pas être affiché.
    </div>
  );
});
BinaryContent.displayName = 'BinaryContent';

// Logique d'indentation pour la touche Tab (remplace indent.ts de bolt.diy)
const indentMore = (view: EditorView) => {
  if (view.state.readOnly) {
    return false;
  }
  view.dispatch(
    view.state.update(
      view.state.changeByRange((range) => {
        const changes: { from: number; to?: number; insert: string }[] = [];
        const line = view.state.doc.lineAt(range.from);
        if (range.from === range.to) {
          changes.push({ from: range.from, insert: view.state.facet(indentUnit) });
        } else if (range.from < range.to && range.to <= line.to) {
          changes.push({ from: range.from, to: range.to, insert: view.state.facet(indentUnit) });
        } else {
          let atLine = -1;
          for (let pos = range.from; pos <= range.to; ) {
            const currentLine = view.state.doc.lineAt(pos);
            if (currentLine.number > atLine && (range.empty || range.to > currentLine.from)) {
              changes.push({ from: currentLine.from, insert: view.state.facet(indentUnit) });
              atLine = currentLine.number;
            }
            pos = currentLine.to + 1;
          }
        }
        return { changes, range };
      }),
      { userEvent: 'input.indent' },
    ),
  );
  return true;
};

const indentLess = (view: EditorView) => {
  if (view.state.readOnly) {
    return false;
  }
  view.dispatch(
    view.state.update(
      view.state.changeByRange((range) => {
        const changes: { from: number; to?: number; insert: string }[] = [];
        let atLine = -1;
        for (let pos = range.from; pos <= range.to; ) {
          const currentLine = view.state.doc.lineAt(pos);
          if (currentLine.number > atLine && (range.empty || range.to > currentLine.from)) {
            const lineText = currentLine.text;
            const indentMatch = lineText.match(/^\s*/);
            if (indentMatch && indentMatch[0].length > 0) {
              const currentIndent = indentMatch[0];
              const tabSize = view.state.tabSize;
              let newIndentLength = Math.max(0, currentIndent.length - tabSize);
              // Si l'indentation actuelle est des espaces, essayez de la réduire par `tabSize`
              if (currentIndent.startsWith(' ')) {
                newIndentLength = Math.max(0, currentIndent.length - tabSize);
              } else if (currentIndent.startsWith('\t')) {
                // Si c'est un onglet, supprimez un onglet
                newIndentLength = Math.max(0, currentIndent.length - 1);
              }

              const newIndent = ' '.repeat(newIndentLength); // Ou '\t'.repeat(newIndentLength) si vous gérez les onglets

              changes.push({
                from: currentLine.from,
                to: currentLine.from + currentIndent.length,
                insert: newIndent,
              });
            }
            atLine = currentLine.number;
          }
          pos = currentLine.to + 1;
        }
        return { changes, range };
      }),
      { userEvent: 'input.indentLess' },
    ),
  );
  return true;
};

const indentKeyBinding = {
  key: 'Tab',
  run: indentMore,
  shift: indentLess,
};


// --- Logique de support des langages (simplifiée et locale) ---
const supportedLanguages = [
  LanguageDescription.of({
    name: 'Python',
    extensions: ['py'],
    async load() {
      return import('@codemirror/lang-python').then((module) => module.python());
    },
  }),
  LanguageDescription.of({
    name: 'CSS',
    extensions: ['css'],
    async load() {
      return import('@codemirror/lang-css').then((module) => module.css());
    },
  }),
  LanguageDescription.of({
    name: 'JSON',
    extensions: ['json'],
    async load() {
      return import('@codemirror/lang-json').then((module) => module.json());
    },
  }),
  LanguageDescription.of({
    name: 'Markdown',
    extensions: ['md'],
    async load() {
      return import('@codemirror/lang-markdown').then((module) => module.markdown());
    },
  }),
];

async function getLanguageSupport(fileName: string) {
  const languageDescription = LanguageDescription.matchFilename(supportedLanguages, fileName);
  if (languageDescription) {
    return await languageDescription.load();
  }
  return undefined;
}
// --- Fin de la logique de support des langages ---


const CodeEditorComponent = memo(({ // Renommé pour l'export par défaut
  value,
  selectedFileName,
  readOnly = false,
  onContentChange,
  onSave,
  theme = 'dark', // Par défaut à 'dark' pour correspondre à votre App.tsx
  settings,
}: CodeEditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null); // Initialisé à null
  const languageCompartment = useState(new Compartment())[0];
  const readOnlyCompartment = useState(new Compartment())[0];

  // Définition d'un thème simple qui correspond au style de votre App.tsx
  const customTheme = EditorView.theme({
    '&': {
      fontSize: settings?.fontSize || '14px',
      height: '100%',
      backgroundColor: '#1a202c', // bg-gray-900
      color: '#e2e8f0', // text-gray-100
    },
    '.cm-cursor': {
      borderLeft: '1.5px solid #63b3ed', // Couleur du curseur (teal-400 ou similaire)
    },
    '.cm-scroller': {
      lineHeight: '1.5',
    },
    '.cm-line': {
      padding: '0 0 0 4px',
    },
    '.cm-activeLine': {
      backgroundColor: '#2d3748', // bg-gray-800
    },
    '.cm-gutters': {
      backgroundColor: '#1a202c', // bg-gray-900
      borderRight: '1px solid #4a5568', // border-gray-800
      color: '#a0aec0', // text-gray-400
    },
    '.cm-gutter.cm-lineNumbers': {
      minWidth: '40px',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    },
    '.cm-gutter .cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#63b3ed', // Couleur de la ligne active dans la gouttière
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(99, 179, 237, 0.3) !important', // Couleur de sélection (bleu clair avec opacité)
    },
    '.cm-matchingBracket': {
      backgroundColor: '#4299e1', // Couleur de la parenthèse correspondante (bleu)
    },
    // Styles pour les tooltips (utilisés par CodeMirror)
    '.cm-tooltip': {
      backgroundColor: '#2d3748', // bg-gray-800
      border: '1px solid #4a5568', // border-gray-800
      color: '#e2e8f0', // text-gray-100
      borderRadius: '0.25rem', // rounded-md
      padding: '0.5rem',
      fontSize: '0.875rem', // text-sm
    },
    '.cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: '#4299e1', // bg-blue-500
      color: '#ffffff', // text-white
    },
    // Styles pour la barre de recherche (si utilisée)
    '.cm-panel.cm-search': {
      backgroundColor: '#2d3748', // bg-gray-800
      color: '#e2e8f0', // text-gray-100
      padding: '8px',
      borderTop: '1px solid #4a5568', // border-gray-800
    },
    '.cm-search input': {
      backgroundColor: '#1a202c', // bg-gray-900
      borderColor: '#4a5568', // border-gray-800
      color: '#e2e8f0', // text-gray-100
      borderRadius: '0.25rem', // rounded-md
    },
    '.cm-search button': {
      backgroundColor: '#4299e1', // bg-blue-500
      color: '#ffffff', // text-white
      borderRadius: '0.25rem', // rounded-md
      '&:hover': {
        backgroundColor: '#3182ce', // hover:bg-blue-600
      },
    },
    // Styles pour les marqueurs de pliage
    '.fold-icon': {
      display: 'inline-block',
      width: '1em',
      height: '1em',
      verticalAlign: 'middle',
      // Fallback si les classes d'icônes ne sont pas configurées
      '&::before': {
        content: '""',
      }
    },
    '.fold-icon.i-ph-caret-down-bold::before': {
      content: '"\\25BC"', // Unicode for black down-pointing triangle
    },
    '.fold-icon.i-ph-caret-right-bold::before': {
      content: '"\\25B6"', // Unicode for black right-pointing triangle
    },
  }, { dark: theme === 'dark' });

  useEffect(() => {
    if (!containerRef.current) return;

    // Détruit l'éditeur existant avant d'en créer un nouveau
    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const onUpdate = (update: { docChanged: boolean; selection: EditorSelection; }) => {
      if (update.docChanged) {
        onContentChange?.(viewRef.current!.state.doc.toString());
      }
    };

    const newEditorState = EditorState.create({
      doc: value || '',
      extensions: [
        EditorView.updateListener.of((update) => {
          onUpdate({ docChanged: update.docChanged, selection: update.state.selection });
        }),
        EditorView.domEventHandlers({
          keydown: (event, view) => {
            // Gérer la sauvegarde (Ctrl+S ou Cmd+S)
            if (!readOnly && (event.ctrlKey || event.metaKey) && event.key === 's') {
              event.preventDefault();
              onSave?.();
              return true;
            }
            return false;
          },
        }),
        customTheme,
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          { key: 'Tab', run: acceptCompletion },
          indentKeyBinding,
        ]),
        indentUnit.of(settings?.tabSize ? ' '.repeat(settings.tabSize) : '\t'),
        autocompletion({ closeOnBlur: false }),
        closeBrackets(),
        lineNumbers(),
        scrollPastEnd(),
        dropCursor(),
        drawSelection(),
        bracketMatching(),
        EditorState.tabSize.of(settings?.tabSize ?? 2),
        indentOnInput(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter({
          markerDOM: (open) => {
            const icon = document.createElement('div');
            icon.className = `fold-icon text-gray-400 ${open ? 'i-ph-caret-down-bold' : 'i-ph-caret-right-bold'}`;
            if (!icon.className.includes('i-ph')) {
              icon.textContent = open ? '▼' : '▶';
            }
            return icon;
          },
        }),
        languageCompartment.of([]),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        tooltips({
          position: 'absolute',
          parent: document.body,
        }),
      ],
    });

    const view = new EditorView({
      state: newEditorState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [onContentChange, onSave, settings, customTheme, readOnly, value, selectedFileName]); // Ajout de value et selectedFileName aux dépendances pour recréer l'éditeur si ces props changent

  // Effet pour mettre à jour le contenu du document et le support linguistique
  useEffect(() => {
    const view = viewRef.current;
    // Ajout d'une vérification précoce pour selectedFileName
    if (!view || selectedFileName === null || selectedFileName === undefined) {
        // Si selectedFileName est null ou undefined, assurez-vous que l'éditeur est vide et en lecture seule
        if (view) {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: '' },
            });
            view.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(true)) });
        }
        return;
    }

    const isBinary = selectedFileName.endsWith('.png') || selectedFileName.endsWith('.jpg') || selectedFileName.endsWith('.gif');

    if (isBinary) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: '' },
      });
      view.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(true)) });
      return;
    }

    if (value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }

    getLanguageSupport(selectedFileName).then((languageSupport) => {
      if (languageSupport) {
        view.dispatch({
          effects: languageCompartment.reconfigure(languageSupport),
        });
      } else {
        view.dispatch({
          effects: languageCompartment.reconfigure([]),
        });
      }
    });

    view.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)) });

  }, [value, selectedFileName, readOnly, languageCompartment, readOnlyCompartment]);


  return (
    <div className="relative h-full w-full">
      {/* Affiche le composant BinaryContent si le fichier est binaire */}
      {selectedFileName && (selectedFileName.endsWith('.png') || selectedFileName.endsWith('.jpg') || selectedFileName.endsWith('.gif')) && <BinaryContent />}
      <div className="h-full overflow-hidden" ref={containerRef} />
    </div>
  );
});

// Exportation par défaut du composant
export default CodeEditorComponent;