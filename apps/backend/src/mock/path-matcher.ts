import { MOCK_HTTP_METHODS, MockEndpoint } from '../models/mock';

export interface PathMatch {
  endpoint: MockEndpoint;
  params: Record<string, string>;
}

/**
 * Score how well a path pattern matches concrete pathname segments.
 * Lower is better: static segments are more specific than parameters, so
 * `/api/users/me` beats `/api/users/:id` when both are defined.
 */
function scoreSegments(patternSegments: string[], pathSegments: string[]): number | null {
  if (patternSegments.length !== pathSegments.length) return null;

  let score = 0;
  for (let i = 0; i < patternSegments.length; i++) {
    const pattern = patternSegments[i];
    if (pattern.startsWith(':')) {
      score += 2;
      continue;
    }
    if (pattern.toLowerCase() !== pathSegments[i].toLowerCase()) return null;
    score += 1;
  }
  return score;
}

/**
 * Find the endpoint that should serve a request, preferring the most specific
 * pattern. Two kinds of matches exist:
 *
 * 1. Exact match: the request pathname equals the endpoint path (any mode).
 * 2. Item match: dynamic endpoints also serve `<path>/:id` automatically, so a
 *    single "Users" endpoint handles both `GET /api/users` and
 *    `GET /api/users/42`. Item matches always lose against exact matches.
 */
export function matchEndpoint(
  endpoints: MockEndpoint[],
  pathname: string,
): PathMatch | null {
  const pathSegments = pathname.split('/').filter((segment) => segment.length > 0);

  const candidates: Array<{ endpoint: MockEndpoint; patternSegments: string[]; score: number }> = [];

  for (const endpoint of endpoints) {
    if (!endpoint.enabled) continue;

    const patternSegments = endpoint.path.split('/').filter((segment) => segment.length > 0);
    const exactScore = scoreSegments(patternSegments, pathSegments);
    if (exactScore !== null) {
      candidates.push({ endpoint, patternSegments, score: exactScore });
      continue;
    }

    // Implicit item route for dynamic endpoints: one extra segment is the record id
    if (endpoint.mode !== 'dynamic') continue;

    const itemPattern = [...patternSegments, ':id'];
    const itemScore = scoreSegments(itemPattern, pathSegments);
    if (itemScore !== null) {
      candidates.push({ endpoint, patternSegments: itemPattern, score: itemScore + 100 });
    }
  }

  const best = candidates.length > 0
    ? candidates.reduce((a, b) => (b.score < a.score ? b : a))
    : null;
  if (!best) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < best.patternSegments.length; i++) {
    const pattern = best.patternSegments[i];
    if (pattern.startsWith(':')) {
      params[pattern.slice(1)] = pathSegments[i];
    }
  }
  return { endpoint: best.endpoint, params };
}

/**
 * Collect the HTTP methods an endpoint responds to (for the 405 Allow header).
 * Dynamic endpoints serve every method; static ones only their configured set.
 */
export function getConfiguredMethods(endpoint: MockEndpoint): string[] {
  if (endpoint.mode === 'dynamic') return [...MOCK_HTTP_METHODS];
  return Object.entries(endpoint.methods)
    .filter(([, response]) => Boolean(response))
    .map(([method]) => method);
}
