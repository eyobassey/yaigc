# ADR 0001: Operator console served from `ops.*` subdomain, not a separate domain

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-21 |
| **Deciders** | Bassey Eyo (founder), Engineering (lead) |
| **Supersedes** | — |
| **Affected SDD sections** | §6.4 (Operator console), §4.1 (In scope for v1) |

## Context

The Solution Design Document v1 (§6.4) specifies that the operator console
should be served from **`igcs.co.uk`**, a domain separate from the customer
apex `youareingoodcompany.co.uk`. The SDD names three reasons:

1. **Separate brand** — operators see a visually distinct internal tool.
2. **IP allow-list** scoped to office and home IPs.
3. **Origin isolation** — operator session cookies cannot leak into
   customer-facing surfaces (or vice versa).

When standing the platform up, the operator console needs a canonical URL
*before* we have a registered second domain. We chose between three patterns:

- **A.** Separate domain `igcs.co.uk` (SDD-spec, requires registration).
- **B.** Subdomain `ops.youareingoodcompany.co.uk` of the existing apex.
- **C.** Path prefix `youareingoodcompany.co.uk/ops` on the apex (no DNS work).

## Decision

The operator console is served from **`ops.youareingoodcompany.co.uk`**.

## Alternatives considered

### A. Separate domain (`igcs.co.uk`)

- ✅ Strongest origin isolation — distinct eTLD+1, no possibility of cookie leakage.
- ✅ Fully separate brand identity reinforces "internal tool, not product".
- ❌ Costs domain registration, separate cert lifecycle, separate monitoring.
- ❌ Adds a second source of truth for ops while we are still a one-engineer team.
- ❌ Premature for a pre-launch product. The SDD anticipates this scale of
  separation at Phase 2; we are in Phase 1.

### B. Subdomain (`ops.youareingoodcompany.co.uk`) — chosen

- ✅ Reuses the existing Cloudflare Origin Certificate (the wildcard SAN
  `*.youareingoodcompany.co.uk` already covers it).
- ✅ One CF DNS record + one extra `server_name` token in nginx.
- ✅ Provides a canonical URL distinct from the marketing apex.
- ✅ Easy to migrate to a separate domain later (1 hour: register, update SAN,
  swap DNS, update `AUTH_URL`).
- ⚠️ Partial origin isolation only. Cookies share via a domain-scoped
  attribute; cross-origin requests still require CORS opt-in.
- ⚠️ Less visceral "separate tool" feel than a fully distinct domain.

### C. Path prefix (`/ops` on the apex)

- ✅ Zero infrastructure changes.
- ❌ Operator console shares the public origin: cookies, CSP, CORS, all
  unified with the customer site. No origin-isolation benefit at all.
- ❌ Bookmarking operator URLs looks like customer URLs; less canonical.

## Consequences

### Authentication
Auth.js session and callback cookies are scoped to
`.youareingoodcompany.co.uk` (leading dot) so a single sign-in is valid on
the apex, on `ops.*`, and on the future `app.*` portals. The CSRF cookie
stays host-only via the `__Host-` prefix, which forbids a domain attribute
by spec.

### IP allow-list (deferred)
The SDD specifies an IP allow-list for `igcs.co.uk`. We do not have real
operators or office IPs yet. The control is deferred. When it comes online,
it will be implemented as an `nginx` `allow`/`deny` block scoped to the
`ops.youareingoodcompany.co.uk` server name. (Cloudflare presents
loopback IPs to the origin, so the allow-list must operate against the
`CF-Connecting-IP` header that nginx already lifts into `$remote_addr`
via `real_ip_header`.)

### Visual separation
The operator console adopts a denser visual shell (sidebar nav, role pill,
moss header bar) within the same YAIGC brand palette — internal tool
signalled by composition rather than a different brand identity.

### Re-platform path
Migrating to a separate domain later is bounded. The work:
1. Register the second domain (`igcs.co.uk` or whatever is chosen).
2. Add it to the Cloudflare Origin Certificate SAN (regenerate cert).
3. Update DNS, CF zone, nginx `server_name`.
4. Update `AUTH_URL` and any code paths that hard-code the host.
5. Drop the `domain` attribute from Auth.js cookies so they become
   host-only again.

Estimated 1 hour of focused work plus DNS propagation.

## Triggers to revisit

This decision should be revisited if **any** of the following occur:

- Real operators come online and the partial isolation becomes a real risk
  (e.g., XSS in marketing surface exfiltrating operator cookies).
- A regulatory, audit, or partnership constraint requires physical
  separation between the operator brand and the customer brand.
- A security incident or near-miss involves cross-origin behaviour that
  a separate eTLD+1 would have prevented.
- The customer-facing site or operator console grows large enough that
  operating them as one application stops paying back.
