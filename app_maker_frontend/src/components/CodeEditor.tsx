// src/components/CodeEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
// Imports des extensions de base de CodeMirror
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';

import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string; // Le contenu du code à afficher
  onChange?: (value: string) => void; // Callback pour les changements de contenu (optionnel)
  readOnly?: boolean; // Pour rendre l'éditeur non modifiable (optionnel)
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, readOnly = false }) => {
  const editorRef = useRef<HTMLDivElement>(null); // Référence pour attacher l'éditeur CodeMirror
  const [view, setView] = useState<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Configuration des extensions CodeMirror
    const extensions = [
      lineNumbers(), // Afficher les numéros de ligne
      highlightActiveLineGutter(), // Surligner le numéro de ligne active
      highlightSpecialChars(), // Mettre en évidence les caractères spéciaux
      history(), // Historique des modifications (undo/redo)
      foldGutter(), // Gouttière pour le pliage de code
      dropCursor(), // Curseur de dépôt
      EditorState.allowMultipleSelections.of(true), // Permettre la sélection multiple
      rectangularSelection(), // Sélection rectangulaire
      crosshairCursor(), // Curseur en croix
      highlightActiveLine(), // Surligner la ligne active
      highlightSelectionMatches(), // Surligner les correspondances de sélection
      bracketMatching(), // Correspondance des parenthèses/crochets
      closeBrackets(), // Fermeture automatique des parenthèses/crochets
      autocompletion(), // Autocomplétion
      python(), // Support de langage pour Python
      vscodeDark, // Thème sombre inspiré de VS Code
      keymap.of([
        ...defaultKeymap, // Raccourcis clavier par défaut (copier, coller, etc.)
        ...searchKeymap, // Raccourcis pour la recherche
        ...historyKeymap, // Raccourcis pour l'historique
        ...foldKeymap, // Raccourcis pour le pliage de code
        ...completionKeymap, // Raccourcis pour l'autocomplétion
        ...lintKeymap, // Raccourcis pour le linting
        ...closeBracketsKeymap, // Raccourcis pour la fermeture des parenthèses
        indentWithTab, // Indentation avec la touche Tab
      ]),
    ];

    // Si l'éditeur n'est pas en mode lecture seule, ajoutez un écouteur de changements
    if (!readOnly) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
        })
      );
    }

    // Création de l'état initial de l'éditeur
    const startState = EditorState.create({
      doc: value, // Contenu initial de l'éditeur
      extensions: extensions,
    });

    // Création de la vue de l'éditeur
    const editorView = new EditorView({
      state: startState,
      parent: editorRef.current, // Attache l'éditeur à cet élément DOM
      readOnly: readOnly, // Définir l'état de lecture seule
    });

    setView(editorView); // Stocke la vue pour un nettoyage futur

    // Fonction de nettoyage quand le composant est démonté ou les dépendances changent
    return () => {
      editorView.destroy(); // Détruit l'instance de l'éditeur
      setView(null);
    };
  }, [value, onChange, readOnly]); // Dépendances: recréer l'éditeur si 'value', 'onChange' ou 'readOnly' changent

  // Mettre à jour le contenu de l'éditeur si la prop 'value' change
  useEffect(() => {
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value, view]);


  return (
    <div className="code-editor-container" ref={editorRef} style={{ height: '100%', overflow: 'hidden' }} />
  );
};

export default CodeEditor;