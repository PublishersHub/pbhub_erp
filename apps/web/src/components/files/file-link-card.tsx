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
      return { ext: 'PDF', color: 'bg-red-100 text-red-700' };
    case 'DOC':
    case 'DOCX':
      return { ext: 'DOC', color: 'bg-blue-100 text-blue-700' };
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'GIF':
    case 'WEBP':
    case 'SVG':
      return { ext: 'IMG', color: 'bg-purple-100 text-purple-700' };
    case 'XLS':
    case 'XLSX':
    case 'CSV':
      return { ext: 'XLS', color: 'bg-green-100 text-green-700' };
    default:
      return { ext: 'FILE', color: 'bg-gray-100 text-gray-600' };
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
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      {badge && (
        <span
          className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.color}`}
        >
          {badge.ext}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {label && (
          <p className="text-[10px] font-medium uppercase text-gray-400">
            {label}
          </p>
        )}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-blue-600 hover:underline"
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
          className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          Remove
        </button>
      )}
    </div>
  );
}
