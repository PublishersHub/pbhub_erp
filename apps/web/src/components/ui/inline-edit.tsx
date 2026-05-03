'use client';

import { useEffect, useRef, useState } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  emptyText?: string;
  multiline?: boolean;
  disabled?: boolean;
  className?: string;
}

export function InlineEdit({
  value,
  onSave,
  placeholder,
  type = 'text',
  emptyText = '—',
  multiline = false,
  disabled = false,
  className = '',
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setError(null);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        if (inputRef.current && 'select' in inputRef.current) {
          (inputRef.current as HTMLInputElement).select();
        }
      });
    }
  }, [editing, value]);

  const cancel = () => {
    setEditing(false);
    setDraft(value);
    setError(null);
  };

  const commit = async () => {
    if (draft === value) { cancel(); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setEditing(true)}
        className={`group flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || emptyText}
        </span>
        {!disabled && (
          <svg className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <div className="flex-1">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={3}
            disabled={saving}
            className="w-full rounded-lg border border-input bg-card px-2 py-1 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancel();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void commit();
            }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            disabled={saving}
            className="w-full rounded-lg border border-input bg-card px-2 py-1 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancel();
              if (e.key === 'Enter') void commit();
            }}
          />
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <button
        type="button"
        onClick={() => void commit()}
        disabled={saving}
        className="rounded p-1.5 text-success hover:bg-success/10 disabled:opacity-60"
        aria-label="Save"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={saving}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-60"
        aria-label="Cancel"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
