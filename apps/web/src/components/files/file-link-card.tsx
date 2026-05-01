'use client';

function getExtBadge(
  fileName?: string,
  fileUrl?: string,
): { ext: string; color: string } | null {
  const name = fileName || fileUrl || '';
  const match = name.match(/\.(\w+)(?:\?|$)/);
  if (!match) return null;
  const raw = match[1].toUpperCase();
  switch (raw) {
    case 'PDF':
      return { ext: 'PDF', color: 'bg-destructive-soft text-destructive' };
    case 'DOC':
    case 'DOCX':
      return { ext: 'DOC', color: 'bg-primary-soft text-primary' };
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'GIF':
    case 'WEBP':
    case 'SVG':
      return { ext: 'IMG', color: 'bg-info-soft text-info' };
    case 'XLS':
    case 'XLSX':
    case 'CSV':
      return { ext: 'XLS', color: 'bg-success-soft text-success' };
    default:
      return { ext: 'FILE', color: 'bg-secondary text-secondary-foreground' };
  }
}

interface FileLinkCardProps {
  label?: string;
  fileUrl: string;
  fileName?: string;
  onRemove?: () => void;
  removing?: boolean;
}

export function FileLinkCard({
  label,
  fileUrl,
  fileName,
  onRemove,
  removing,
}: FileLinkCardProps) {
  const badge = getExtBadge(fileName, fileUrl);
  const displayName =
    fileName || fileUrl.split('/').pop()?.split('?')[0] || 'Document';

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 hover:bg-muted/50 transition-colors">
      {badge && (
        <span
          className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.color}`}
        >
          {badge.ext}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {label && (
          <p className="text-[10px] font-medium uppercase text-muted-foreground/70">
            {label}
          </p>
        )}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-primary hover:underline"
          title={displayName}
        >
          {displayName}
        </a>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
        >
          Remove
        </button>
      )}
    </div>
  );
}
