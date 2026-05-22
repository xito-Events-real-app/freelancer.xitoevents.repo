/**
 * Standardized agency-scoped query key shape: [resource, agencyId, ...rest]
 * — UUID lives at position 1 as a bare string so the cache-purge predicate
 * in ActiveCompanyContext can find it reliably.
 */
export function keyForAgency(resource: string, agencyId: string | null | undefined, ...rest: unknown[]) {
  return [resource, agencyId ?? null, ...rest] as const;
}
