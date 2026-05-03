'use client';

import type { AttendanceLog } from '@/types/attendance';

function IconDevice() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5h-5A1.5 1.5 0 0 0 4 3v18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 21V3a1.5 1.5 0 0 0-1.5-1.5h-5m-3 0v.75c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V1.5m-3 0h3" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-2.5 w-2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function formatCoord(value: string | null): string | null {
  if (!value) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return n.toFixed(2);
}

function formatAccuracy(value: string | null): string | null {
  if (!value) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return `±${Math.round(n)}m`;
}

interface LogMetaChipsProps {
  log: AttendanceLog;
  className?: string;
}

/**
 * Small inline pills showing device + location captured at check-in/out.
 * Returns null if no metadata is present.
 */
export function LogMetaChips({ log, className = '' }: LogMetaChipsProps) {
  const hasDevice = !!log.deviceType;
  const hasCoords = !!log.latitude && !!log.longitude;
  const hasLocation = hasCoords || !!log.locationLabel;

  if (!hasDevice && !hasLocation) return null;

  const accuracy = formatAccuracy(log.accuracyMeters);
  const lat = formatCoord(log.latitude);
  const lng = formatCoord(log.longitude);

  const locationText = log.locationLabel
    ? log.locationLabel
    : lat && lng
    ? `${lat}, ${lng}`
    : null;

  const mapUrl = hasCoords
    ? `https://www.google.com/maps?q=${log.latitude},${log.longitude}`
    : null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {hasDevice && (
        <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <IconDevice />
          {log.deviceType}
        </span>
      )}
      {hasLocation && (
        mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Maps"
            className="inline-flex items-center gap-1 rounded-full border border-hairline bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <IconPin />
            <span>{locationText}</span>
            {accuracy && <span className="opacity-70">({accuracy})</span>}
            <IconExternal />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <IconPin />
            <span>{locationText}</span>
            {accuracy && <span className="opacity-70">({accuracy})</span>}
          </span>
        )
      )}
    </div>
  );
}
