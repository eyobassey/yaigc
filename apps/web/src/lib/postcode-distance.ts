// Pre-accept travel estimate for companion match proposals.
//
// We don't want to leak the recipient's location before the match is
// agreed, but the companion legitimately needs to know whether the
// visit is round the corner or across town. This module turns two
// UK postcodes into a rough distance + driving / transit time band
// using postcodes.io (free, UK-hosted, no API key, GDPR-friendly).
//
// Numbers are approximate by design. Better routing comes when we
// graduate to Mapbox / Google Distance Matrix.

interface LatLng {
  latitude: number;
  longitude: number;
}

// Module-level cache. Process lifetime is fine - postcodes don't move.
// We cache misses as null so a typo doesn't keep hammering the API.
const cache = new Map<string, LatLng | null>();

function normalisePostcode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

async function geocode(rawPostcode: string): Promise<LatLng | null> {
  const key = normalisePostcode(rawPostcode);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const r = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(key)}`,
      { cache: 'force-cache', next: { revalidate: 60 * 60 * 24 * 30 } },
    );
    if (!r.ok) {
      cache.set(key, null);
      return null;
    }
    const body = (await r.json()) as {
      status: number;
      result?: { latitude: number; longitude: number };
    };
    if (body.status !== 200 || !body.result) {
      cache.set(key, null);
      return null;
    }
    const value = {
      latitude: body.result.latitude,
      longitude: body.result.longitude,
    };
    cache.set(key, value);
    return value;
  } catch (err) {
    // Network blip or postcodes.io down - silently degrade.
    console.error('[postcode-distance] geocode failed', { key, err });
    cache.set(key, null);
    return null;
  }
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Round to the nearest 5-minute band for a friendly "about 25 min" feel.
function roundTo5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

export interface TravelEstimate {
  distanceKm: number;
  distanceMiles: number;
  drivingMinutes: number;
  transitMinutes: number;
  // True when distance is short enough that walking is a real option.
  walkableMinutes: number | null;
}

/**
 * Rough travel estimate from one UK postcode to another.
 * Returns null if either postcode can't be geocoded (e.g. missing,
 * malformed, non-UK, or postcodes.io is unreachable).
 *
 * Multipliers reflect Greater Manchester urban driving and door-to-door
 * transit averages. They are deliberately conservative; we'd rather
 * the companion budget a little extra than be caught short.
 */
export async function estimateTravel(
  fromPostcode: string | null | undefined,
  toPostcode: string | null | undefined,
): Promise<TravelEstimate | null> {
  if (!fromPostcode || !toPostcode) return null;
  const [a, b] = await Promise.all([
    geocode(fromPostcode),
    geocode(toPostcode),
  ]);
  if (!a || !b) return null;

  const crowKm = haversineKm(a, b);
  // Road-network factor: roads aren't straight lines. 1.3x is a
  // workable urban approximation.
  const roadKm = crowKm * 1.3;
  const driving = roundTo5(roadKm * 1.8); // ~33 km/h urban
  const transit = roundTo5(roadKm * 3.0); // ~20 km/h door-to-door
  const walkable = roadKm <= 2.5 ? roundTo5(roadKm * 12) : null; // ~5 km/h
  return {
    distanceKm: Math.round(roadKm * 10) / 10,
    distanceMiles: Math.round(roadKm * 0.621371 * 10) / 10,
    drivingMinutes: driving,
    transitMinutes: transit,
    walkableMinutes: walkable,
  };
}
