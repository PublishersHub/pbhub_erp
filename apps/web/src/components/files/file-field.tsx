'use client';

import { useState } from 'react';
import { FileLinkCard } from './file-link-card';

interface FileFieldProps {
  label: string;
  fileUrl: string;
  fileName: string;
  onUrlChange: (url: string) => void;
  onNameChange: (name: string) => void;
  helperText?: string;
  readOnly?: boolean;
}

export function FileField({
  label,
  fileUrl,
  fileName,
  onUrlChange,
  onNameChange,
  helperText,
  readOnly,
}: FileFieldProps) {
  const [editing, setEditing] = useState(false);
  const hasFile = fileUrl.trim() !== '';

  if (readOnly) {
    if (!hasFile) return null;
    return <FileLinkCard label={label} fileUrl={fileUrl} fileName={fileName} />;
  }

  if (hasFile && !editing) {
    return (
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
        <FileLinkCard fileUrl={fileUrl} fileName={fileName} />
        <div className="mt-1.5 flex gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => {
              onUrlChange('');
              onNameChange('');
            }}
            className="text-xs font-medium text-destructive hover:text-destructive/80"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  const inputCls =
    'block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50';

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <div className="rounded-lg border-2 border-dashed border-input bg-muted/50 p-3 space-y-2 hover:border-primary hover:bg-primary-soft transition-colors">
        <input
          type="url"
          placeholder="File URL (https://...)"
          value={fileUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          className={inputCls}
        />
        <input
          placeholder="File name (e.g. resume.pdf)"
          value={fileName}
          onChange={(e) => onNameChange(e.target.value)}
          className={inputCls}
        />
        {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
