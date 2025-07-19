// src/components/CodeEditor.tsx
import React, { memo, useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

interface Props {
  value: string;
  selectedFileName: string | null;
}

const CodeEditor = memo(({ value, selectedFileName }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        oneDark,
        python(),
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
      ],
    });
    viewRef.current = new EditorView({ state, parent: ref.current });
    return () => viewRef.current?.destroy();
  }, [value]);

  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div className="h-full overflow-auto">
      {selectedFileName && (
        <div className="px-3 py-1 text-sm bg-gray-800 text-teal-300 border-b border-gray-700">
          {selectedFileName}
        </div>
      )}
      <div ref={ref} className="h-[calc(100%-28px)]" />
    </div>
  );
});
CodeEditor.displayName = 'CodeEditor';
export default CodeEditor;