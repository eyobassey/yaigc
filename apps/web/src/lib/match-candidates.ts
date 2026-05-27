// SDD Addendum §6.1 / Stage U.1. Composite scoring + filtering of
// bookable companions against a family + (primary) recipient.
//
// Hard filters knock candidates out completely:
//   - status must be onboarding | active
//   - deletedAt must be null
//   - DBS must be clear (dbsRenewalDueAt is set and in the future)
//   - capacity must not be maxed (open match count < maxConcurrentMatches)
//
// Composite score (higher is better):
//     interestOverlap × 3
//   + availabilityFlexibility × 2
//   - travelMinutesPenalty (drivingMinutes / 5, capped)
//   - currentMatches × 0.5
//
// Conservative defaults. Tweak the weights in WEIGHTS below as we
// learn what reads right in practice.

import type { Companion, CompanionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { estimateTravel } from '@/lib/postcode-distance';
import {
  DAYS,
  PERIODS,
  type AvailabilitySlots,
  type DayKey,
  type PeriodKey,
} from '@/lib/availability';

const WEIGHTS = {
  interestPerMatch: 3,
  availabilitySlot: 2,
  travelDivisor: 5, // drivingMinutes / 5 subtracted
  travelPenaltyCap: 20, // never penalise more than this
  currentMatchPenalty: 0.5,
};

const TRAVEL_HARD_FILTER_MINUTES = 60; // candidates further than this drop out

export type CandidateRow = {
  companion: Pick<
    Companion,
    | 'id'
    | 'applicationId'
    | 'firstName'
    | 'lastName'
    | 'photoUrl'
    | 'photoFilename'
    | 'borough'
    | 'bio'
    | 'interests'
    | 'hourlyRate'
    | 'maxConcurrentMatches'
    | 'dbsRenewalDueAt'
    | 'addressPostcode'
    | 'maxTravelMiles'
  >;
  openMatchCount: number;
  travel: { distanceMiles: number; drivingMinutes: number } | null;
  signals: {
    interestOverlap: number;
    sharedInterests: string[];
    availabilityFlexibility: number;
    availabilitySummary: string;
  };
  score: number;
  scoreParts: {
    interest: number;
    availability: number;
    travel: number;
    capacity: number;
  };
};

export interface CandidateContext {
  recipientPostcode: string | null;
  recipientInterests: string | null;
}

/**
 * Returns the top-scoring bookable companions for a family.
 * limit is applied after hard filtering and sorting.
 */
export async function rankCandidates(
  ctx: CandidateContext,
  limit: number = 25,
): Promise<CandidateRow[]> {
  const companions = await prisma.companion.findMany({
    where: {
      deletedAt: null,
      status: { in: ['onboarding', 'active'] as CompanionStatus[] },
    },
    select: {
      id: true,
      applicationId: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      photoFilename: true,
      borough: true,
      bio: true,
      interests: true,
      hourlyRate: true,
      maxConcurrentMatches: true,
      dbsRenewalDueAt: true,
      addressPostcode: true,
      maxTravelMiles: true,
      availability: true,
      application: { select: { postcode: true } },
    },
  });

  // Count open matches per candidate. "Open" = status proposed or
  // accepted, endedAt null. One query per candidate would be N+1; do a
  // single aggregated query with groupBy.
  const ids = companions.map((c) => c.id);
  const matchCounts = await prisma.match.groupBy({
    by: ['candidateCompanionId'],
    where: {
      candidateCompanionId: { in: ids },
      endedAt: null,
      status: { in: ['proposed', 'accepted'] },
    },
    _count: { candidateCompanionId: true },
  });
  const openByCompanion = new Map<string, number>();
  for (const row of matchCounts) {
    openByCompanion.set(row.candidateCompanionId, row._count.candidateCompanionId);
  }

  const now = new Date();
  const recipientTokens = tokenise(ctx.recipientInterests);

  const rows: CandidateRow[] = [];
  for (const c of companions) {
    // DBS-clear gate
    if (!c.dbsRenewalDueAt || c.dbsRenewalDueAt.getTime() <= now.getTime()) {
      continue;
    }
    // Capacity gate
    const openCount = openByCompanion.get(c.id) ?? 0;
    if (openCount >= c.maxConcurrentMatches) continue;

    // Travel - use companion's own postcode if set, else fall back to
    // application postcode. Skipped (travel=null, no penalty, soft fail
    // only if hard-filter triggers) when we cannot geocode either side.
    const companionPostcode = c.addressPostcode ?? c.application.postcode ?? null;
    const travelEstimate = await estimateTravel(companionPostcode, ctx.recipientPostcode);
    if (
      travelEstimate &&
      travelEstimate.drivingMinutes > TRAVEL_HARD_FILTER_MINUTES
    ) {
      continue;
    }

    const companionTokens = tokenise(c.interests);
    const shared = intersect(recipientTokens, companionTokens);
    const interestOverlap = shared.length;

    const slots = parseAvailability(c.availability);
    const availabilityFlexibility = countSlots(slots);
    const availabilitySummary = renderSlotSummary(slots);

    const interest = interestOverlap * WEIGHTS.interestPerMatch;
    const availability = availabilityFlexibility * WEIGHTS.availabilitySlot;
    const travelPenalty = travelEstimate
      ? Math.min(travelEstimate.drivingMinutes / WEIGHTS.travelDivisor, WEIGHTS.travelPenaltyCap)
      : 0;
    const capacityPenalty = openCount * WEIGHTS.currentMatchPenalty;
    const score = interest + availability - travelPenalty - capacityPenalty;

    const { availability: _availability, application: _application, ...companionCols } = c;
    rows.push({
      companion: companionCols,
      openMatchCount: openCount,
      travel: travelEstimate
        ? {
            distanceMiles: travelEstimate.distanceMiles,
            drivingMinutes: travelEstimate.drivingMinutes,
          }
        : null,
      signals: {
        interestOverlap,
        sharedInterests: shared.slice(0, 5),
        availabilityFlexibility,
        availabilitySummary,
      },
      score,
      scoreParts: {
        interest,
        availability,
        travel: travelPenalty,
        capacity: capacityPenalty,
      },
    });
  }

  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, limit);
}

// --- helpers ----------------------------------------------------------------

const STOPWORDS = new Set([
  'the',
  'and',
  'a',
  'an',
  'of',
  'to',
  'in',
  'for',
  'with',
  'on',
  'or',
  'is',
  'are',
  'be',
  'i',
  'we',
  'my',
  'me',
  'our',
  'their',
  'her',
  'his',
  'him',
  'they',
  'them',
  'enjoy',
  'enjoys',
  'like',
  'likes',
  'love',
  'loves',
  'and',
]);

function tokenise(s: string | null): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function intersect(a: string[], b: string[]): string[] {
  const setA = new Set(a);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of b) {
    if (setA.has(w) && !seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

function parseAvailability(v: unknown): AvailabilitySlots {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  return v as AvailabilitySlots;
}

function countSlots(slots: AvailabilitySlots): number {
  let n = 0;
  for (const d of DAYS) {
    const sel = slots[d.key as DayKey];
    if (sel) n += sel.length;
  }
  return n;
}

function renderSlotSummary(slots: AvailabilitySlots): string {
  const parts: string[] = [];
  for (const d of DAYS) {
    const sel = slots[d.key as DayKey];
    if (!sel || sel.length === 0) continue;
    parts.push(`${d.short} (${sel.length})`);
  }
  if (parts.length === 0) return 'No slots set';
  return parts.join(' · ');
}

// Re-export PeriodKey so callers can render the labels without
// importing from two places.
export type { PeriodKey };
export const PERIOD_LABELS = PERIODS;
