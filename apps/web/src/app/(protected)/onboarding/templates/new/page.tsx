'use client';

import { useEffect, useState } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { createTemplate } from '@/lib/onboarding-api';

export default function CreateTemplatePage() {
  useDocumentTitle('New Onboarding Template');
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const tpl = await createTemplate({
        name: name.trim(),
        ...(description.trim() && { description: description.trim() }),
        isDefault,
      });
      router.push(`/onboarding/templates/${tpl.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Create Template" backHref="/onboarding/templates" />

      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6 shadow-soft">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Onboarding"
              className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the onboarding program"
              className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <label htmlFor="isDefault" className="text-sm text-foreground">Set as default template</label>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
