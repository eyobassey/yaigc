# ADR 0005: postcodes.io for pre-accept travel-time estimates

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-22 |
| **Deciders** | Bassey Eyo (founder), Engineering (lead) |
| **Affected SDD sections** | §12.3.4 (Companion-facing match), §11 (Data protection) |

## Context

When a companion sees a proposed match, they reasonably want to know
whether the visit is round the corner or across town before accepting.
Pre-accept we deliberately don't share the recipient's address — the
match isn't agreed yet — so the companion has no way to estimate
travel time themselves.

Three approaches:

- **A. Show a Google Maps deep link.** Companion clicks out, sees real
  driving directions on Maps. We send no data to a third party
  ourselves; the companion does it from their browser.
- **B. Server-side estimate via postcodes.io.** Geocode both postcodes
  (UK-only, free, no API key), haversine the distance, apply a
  road-network factor and a speed multiplier. Show a coarse band
  ("about 25 min by car").
- **C. Server-side estimate via Google Distance Matrix or Mapbox
  Directions API.** Real driving / transit / walking time with traffic.

## Decision

**Option B**: postcodes.io geocoding + haversine + conservative
multipliers, rounded to the nearest 5-minute band, with both postcodes
withheld from the rendered UI.

## Trade-off

postcodes.io gives us coordinates only; the rest is approximation. The
numbers are wrong by some amount in every direction (road-network
factor varies by area; bus frequency dominates short transit trips;
trains are faster over 5+ miles than the multiplier reflects). We're
trading accuracy for a footprint we control: no API key, no costs,
no third-party data flow.

A real routing API would solve the accuracy problem. It introduces:

- **An API key** and a billing relationship.
- **A data flow** sending UK postcodes to a US-based provider (Google
  Distance Matrix is hosted in the US). DPIA-relevant; we'd want a
  paragraph in the privacy notice. Mapbox EU hosting is available but
  not the default.
- **A budget concern** if the proposal rate ever spikes.

The crude band answers the actual product question — "is this practical
or not?" — well enough for v1.

## Why postcodes.io

- **UK-hosted, free, no key.** Aligns with the existing data residency
  story (eu-west-2 + UK).
- **GDPR-friendly:** the only data we send is a postcode, which is
  not by itself personally identifying.
- **Module-level cache** in `lib/postcode-distance.ts` is fine because
  postcodes don't move. Cache misses too, so a typo doesn't keep
  hammering the API.
- **Graceful degradation** is straightforward: if either postcode
  doesn't resolve, the travel block silently drops out and the rest of
  the proposal renders normally.

## Implementation summary

`lib/postcode-distance.ts` exposes `estimateTravel(from, to)`:

1. Normalise both postcodes (uppercase, strip whitespace).
2. Fetch each from `postcodes.io/postcodes/<pc>`. Cache hit + miss.
3. Haversine the great-circle distance.
4. Apply **road-network factor 1.3** (typical urban deviation).
5. Apply speed multipliers calibrated to Greater Manchester urban:
   - Car: 33 km/h (1.8 min/km).
   - Public transport: 20 km/h (3.0 min/km) — averaged across
     tram + bus + train door-to-door, including walk-to-stop and waits.
   - Walking: only shown for ≤2.5 km, 5 km/h (12 min/km).
6. Round each band to the nearest 5 minutes.

The companion sees: "~25 min by car / ~40 min by public transport /
~30 min on foot" — three pills, with the on-foot pill omitted when
distance is too large.

Pre-accept we render **the band only**. No postcode is surfaced. Post-
accept, the full address comes through via the existing match → visit
flow.

## Consequences

### When the numbers are noticed to be wrong

- A companion reports a band that bears no relation to reality. First
  fix: check the speed multipliers in `lib/postcode-distance.ts`;
  Greater Manchester is the calibration anchor but other GMR boroughs
  have different traffic profiles.
- If the multipliers can't be made accurate enough across the YAIGC
  service area, that's the trigger to move to **C** (Mapbox EU
  Directions API). The `estimateTravel` interface is stable; only the
  implementation changes.

### When to revisit

- The platform expands beyond Greater Manchester. Different urban
  geometries need different multipliers; one set won't cover both
  Manchester and rural Cheshire.
- A companion-facing UX research session indicates the bands are
  routinely off enough to mistrust.
- Operators want per-mode breakdowns (separate train vs bus, say).
  postcodes.io can't deliver those; only a routing API can.
