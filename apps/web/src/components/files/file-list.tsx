'use client';

import { useState } from 'react';
import { FileLinkCard } from './file-link-card';
import { ErrorMessage } from '@/components/ui/error-message';

interface FileDoc {
  id: string;
  fileUrl: string;
  fileName: string;
}

interface FileListProps {
  documents: FileDoc[];
  canAdd?: boolean;
  canRemove?: boolean;
  onAdd?: (fileUrl: string, fileName: string) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  emptyMessage?: string;
}

export function FileList({
  documents,
  canAdd,
  canRemove,
  onAdd,
  onRemove,
  emptyMessage = 'No documents attached.',
}: FileListProps) {
  const [showForm, setShowForm] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [acting, setActing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleAdd() {
    const url = fileUrl.trim();
    const name = fileName.trim();
    if (!url || !name) {
      setError('File URL and name are required.');
      return;
    }
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL.');
      return;
    }
    setError('');
    setActing(true);
    try {
      await onAdd?.(url, name);
      setFileUrl('');
      setFileName('');
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add document.',
      );
    } finally {
      setActing(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setError('');
    try {
      await onRemove?.(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove document.',
      );
    } finally {
      setRemovingId(null);
    }
  }

  const inputCls =
    'block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div>
      {documents.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <FileLinkCard
              key={doc.id}
              fileUrl={doc.fileUrl}
              fileName={doc.fileName}
              onRemove={
                canRemove && onRemove
                  ? () => handleRemove(doc.id)
                  : undefined
              }
              removing={removingId === doc.id}
            />
          ))}
        </div>
      )}

      {canAdd && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          + Add Document
        </button>
      )}

      {showForm && (
        <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2">
          <input
            type="url"
            placeholder="File URL (https://...)"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="File name (e.g. document.pdf)"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={acting}
              onClick={handleAdd}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {acting ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError('');
                setFileUrl('');
                setFileName('');
              }}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <ErrorMessage message={error} />
        </div>
      )}
    </div>
  );
}
