'use client';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-md border border-destructive/20 bg-destructive-soft px-4 py-4">
      <p className="text-sm text-destructive/90">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-destructive underline-offset-4 hover:underline hover:text-destructive/80 motion-press"
        >
          Try again
        </button>
      )}
    </div>
  );
}
