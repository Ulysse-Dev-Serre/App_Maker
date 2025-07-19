// src/components/FileExplorer.tsx
import React, { memo, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

interface Props {
  files: Record<string, string>;
  selectedFileName: string | null;
  onFileSelect: (path: string) => void;
  currentProjectName: string | null;
}

const FileExplorer = memo(
  ({ files, selectedFileName, onFileSelect, currentProjectName }: Props) => {
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (path: string) => {
      setOpenFolders((prev) => {
        const next = new Set(prev);
        next.has(path) ? next.delete(path) : next.add(path);
        return next;
      });
    };

    const tree = useMemo(() => {
      const root: Record<string, any> = {};
      Object.keys(files)
        .sort()
        .forEach((path) => {
          const parts = path.split('/');
          let cursor = root;
          parts.forEach((part, idx) => {
            const isFile = idx === parts.length - 1;
            if (!cursor[part])
              cursor[part] = isFile ? { type: 'file', path } : { type: 'folder', children: {} };
            cursor = cursor[part].children || {};
          });
        });
      return root;
    }, [files]);

    const render = (
      node: Record<string, any>,
      depth: number,
      prefix: string = ''
    ) =>
      Object.entries(node).map(([name, item]) => {
        const path = prefix ? `${prefix}/${name}` : name;
        if (item.type === 'file') {
          return (
            <div
              key={path}
              className={`flex items-center py-1 px-2 cursor-pointer text-sm ${
                selectedFileName === path ? 'bg-teal-700' : 'hover:bg-gray-700'
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => onFileSelect(path)}
            >
              <File size={14} className="mr-2 text-gray-400" />
              {name}
            </div>
          );
        }
        const isOpen = openFolders.has(path);
        return (
          <div key={path}>
            <div
              className="flex items-center py-1 px-2 cursor-pointer text-sm hover:bg-gray-700"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => toggleFolder(path)}
            >
              {isOpen ? (
                <ChevronDown size={14} className="mr-1 text-gray-400" />
              ) : (
                <ChevronRight size={14} className="mr-1 text-gray-400" />
              )}
              <Folder size={14} className="mr-2 text-gray-400" />
              {name}
            </div>
            {isOpen && render(item.children, depth + 1, path)}
          </div>
        );
      });

    return (
      <div className="h-full bg-gray-900 text-gray-100 overflow-y-auto">
        {currentProjectName && (
          <div className="px-3 py-2 font-semibold text-teal-300 border-b border-gray-700 sticky top-0 bg-gray-800">
            {currentProjectName}
          </div>
        )}
        {render(tree, 0)}
      </div>
    );
  }
);
FileExplorer.displayName = 'FileExplorer';
export default FileExplorer;