import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { QueryClient } from "@tanstack/react-query";

const BASE_KEY = "lvbl-rq-cache";
const VERSION = "v3";
const ACTIVE_KEY = `${BASE_KEY}:${VERSION}`;

/**
 * Build a single shared localStorage persister. We do NOT key by userId — that
 * caused the QueryClient to be re-mounted on every auth change, wiping
 * in-flight queries (including `my-profile`) and bouncing real users to
 * /register. Per-query userId in queryKey already scopes data correctly, and
 * `shouldPersistQuery` only persists queries explicitly tagged with
 * `meta.persist === true` — so no sensitive data leaks across accounts.
 */
export function buildPersister(_userId: string | null) {
  return createSyncStoragePersister({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    key: ACTIVE_KEY,
    throttleTime: 1000,
  });
}

/**
 * Drop any old persisted caches (from previous versions or per-user keys).
 * Keeps only the current shared key.
 */
export function pruneOtherUserCaches(_currentUserId: string | null) {
  if (typeof window === "undefined") return;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(`${BASE_KEY}:`) && k !== ACTIVE_KEY) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

/** Only persist queries marked safe (we tag them with `meta.persist = true`). */
export function shouldPersistQuery(query: { meta?: { persist?: boolean } }): boolean {
  return query.meta?.persist === true;
}

export type { QueryClient };
