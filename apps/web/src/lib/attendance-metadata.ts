import type { CheckInPayload } from '@/types/attendance';

export type LocationStatus =
  | 'captured'    // got coords
  | 'denied'      // user denied permission
  | 'timeout'     // got prompt but didn't respond / GPS slow
  | 'unavailable' // hardware/OS couldn't return a fix
  | 'unsupported'; // browser doesn't have navigator.geolocation

export interface GatheredMetadata {
  meta: Partial<CheckInPayload>;
  locationStatus: LocationStatus;
}

export function detectDeviceType(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

/**
 * Capture device + geolocation metadata for an attendance event.
 *
 * Always returns userAgent + deviceType when running in a browser.
 * Attempts an 8-second geolocation read; on failure, returns a status
 * code so the caller can give the user a meaningful message instead
 * of a silent "Location not shared".
 *
 * Never throws — safe to await without try/catch.
 */
export async function gatherCheckInMetadata(): Promise<GatheredMetadata> {
  const meta: Partial<CheckInPayload> = {};

  if (typeof navigator !== 'undefined') {
    meta.userAgent = navigator.userAgent;
    meta.deviceType = detectDeviceType(navigator.userAgent);
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { meta, locationStatus: 'unsupported' };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,         // give cold-start GPS a fair shot (4s was too tight)
        maximumAge: 60_000,
      });
    });
    meta.latitude = position.coords.latitude;
    meta.longitude = position.coords.longitude;
    meta.accuracyMeters = position.coords.accuracy;
    return { meta, locationStatus: 'captured' };
  } catch (err) {
    // GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
    const code = (err as GeolocationPositionError)?.code;
    let locationStatus: LocationStatus = 'unavailable';
    if (code === 1) locationStatus = 'denied';
    else if (code === 3) locationStatus = 'timeout';
    return { meta, locationStatus };
  }
}

/**
 * True when meta has lat/lng coordinates (i.e., user shared location).
 */
export function metaHasLocation(meta: Partial<CheckInPayload>): boolean {
  return typeof meta.latitude === 'number' && typeof meta.longitude === 'number';
}

/** Human message for each location status, suitable for a toast subtitle. */
export function describeLocationStatus(status: LocationStatus): string {
  switch (status) {
    case 'captured':    return 'Location shared';
    case 'denied':      return 'Location blocked — click the lock icon in the address bar to enable';
    case 'timeout':     return 'Location request timed out';
    case 'unavailable': return 'Location not available right now';
    case 'unsupported': return 'This browser does not support location';
  }
}
