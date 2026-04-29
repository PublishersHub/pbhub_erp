'use client';

import { FileList } from '@/components/files/file-list';
import { uploadTaskDocument, removeTaskDocument } from '@/lib/onboarding-api';
import type { OnboardingTaskDocument } from '@/types/onboarding';

interface DocumentUploadProps {
  taskId: string;
  documents: OnboardingTaskDocument[];
  canUpload: boolean;
  canDelete: boolean;
  onChanged: () => void;
}

export function DocumentUpload({
  taskId,
  documents,
  canUpload,
  canDelete,
  onChanged,
}: DocumentUploadProps) {
  async function handleAdd(fileUrl: string, fileName: string) {
    await uploadTaskDocument(taskId, { fileUrl, fileName });
    onChanged();
  }

  async function handleRemove(docId: string) {
    await removeTaskDocument(taskId, docId);
    onChanged();
  }

  return (
    <FileList
      documents={documents}
      canAdd={canUpload}
      canRemove={canDelete}
      onAdd={handleAdd}
      onRemove={handleRemove}
      emptyMessage="No documents attached to this task."
    />
  );
}
