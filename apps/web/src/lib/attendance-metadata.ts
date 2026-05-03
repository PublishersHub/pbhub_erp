import type { CheckInPayload } from '@/types/attendance';

export function detectDeviceType(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

/**
 * Captures device + (optionally) geolocation metadata for an attendance event.
 *
 * - Always returns userAgent + deviceType when running in a browser.
 * - Attempts a 4-second non-blocking geolocation read; if the user denies,
 *   the prompt times out, or the API is unavailable, coords are simply omitted.
 * - Never throws — callers can safely await this without try/catch.
 */
export async function gatherCheckInMetadata(): Promise<Partial<CheckInPayload>> {
  const meta: Partial<CheckInPayload> = {};

  if (typeof navigator !== 'undefined') {
    meta.userAgent = navigator.userAgent;
    meta.deviceType = detectDeviceType(navigator.userAgent);
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) return meta;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 60_000,
      });
    });
    meta.latitude = position.coords.latitude;
    meta.longitude = position.coords.longitude;
    meta.accuracyMeters = position.coords.accuracy;
  } catch {
    // user denied / unavailable / timed out — fine, just skip
  }

  return meta;
}

/**
 * True when meta has lat/lng coordinates (i.e., user shared location).
 */
export function metaHasLocation(meta: Partial<CheckInPayload>): boolean {
  return typeof meta.latitude === 'number' && typeof meta.longitude === 'number';
}
