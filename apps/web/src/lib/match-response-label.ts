import type { MatchStatus } from '@prisma/client';

// Shared 'where this match is' label-building for the per-side cards on
// the family and companion match detail pages. The match data does not
// have a single 'who declined' column, so we infer from status +
// timestamps. The inference matches the server actions' update pattern:
//   - respondToMatchByFamily decline    => sets familyResponseAt
//   - respondToMatchByCompanion decline => sets companionResponseAt
//   - operator transitionMatch decline  => leaves timestamps untouched

export type MatchSide = 'family' | 'companion';
export type ResponseLabel = {
  text: string;
  tone: 'accepted' | 'declined' | 'pending' | 'operator';
};

/**
 * Identify which side, if any, declined the match. Returns null when
 * the status is not 'declined' or when no timestamps are present (i.e.
 * operator-declined on a phone call without capturing either side's
 * response).
 */
export function inferDecliner(
  status: MatchStatus,
  familyResponseAt: Date | null,
  companionResponseAt: Date | null,
): MatchSide | null {
  if (status !== 'declined') return null;
  if (familyResponseAt && !companionResponseAt) return 'family';
  if (companionResponseAt && !familyResponseAt) return 'companion';
  if (familyResponseAt && companionResponseAt) {
    // Both responded; later timestamp is the decliner (the earlier
    // response was an accept that got overridden).
    return familyResponseAt.getTime() >= companionResponseAt.getTime()
      ? 'family'
      : 'companion';
  }
  return null;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Per-side response label, with tone for styling.
 */
export function buildResponseLabel(
  side: MatchSide,
  status: MatchStatus,
  responseAt: Date | null,
  decliner: MatchSide | null,
): ResponseLabel {
  // Withdrawn / ended close the match without a per-side action.
  if (status === 'withdrawn' || status === 'ended') {
    if (responseAt) {
      return { text: `Accepted ${isoDate(responseAt)}`, tone: 'accepted' };
    }
    return { text: '—', tone: 'pending' };
  }

  if (status === 'declined') {
    if (decliner === side && responseAt) {
      return { text: `Declined ${isoDate(responseAt)}`, tone: 'declined' };
    }
    if (decliner === side && !responseAt) {
      return { text: 'Declined', tone: 'declined' };
    }
    // Other side declined; show what this side did (accepted or not).
    if (responseAt) {
      return { text: `Accepted ${isoDate(responseAt)}`, tone: 'accepted' };
    }
    return { text: 'No response', tone: 'pending' };
  }

  // proposed + accepted: any response present is necessarily an accept
  // (decline would have flipped status to declined).
  if (responseAt) {
    return { text: `Accepted ${isoDate(responseAt)}`, tone: 'accepted' };
  }
  return { text: 'Awaiting reply', tone: 'pending' };
}
