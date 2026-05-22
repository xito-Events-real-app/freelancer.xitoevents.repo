import { createContext, useContext, useEffect, useMemo, useReducer, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfile';
import { useMyCompanies } from '@/hooks/useMyCompanies';
import { supabase } from '@/integrations/supabase/client';

interface ActiveCompanyContextType {
  activeAgencyId: string | null;
  setActiveAgencyId: (id: string) => void;
  activeCompany: {
    agency_user_id: string;
    business_name: string | null;
    full_name: string | null;
    profile_photo_url: string | null;
  } | null;
  isOwner: boolean;
  switching: boolean;
  loading: boolean;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextType>({
  activeAgencyId: null,
  setActiveAgencyId: () => {},
  activeCompany: null,
  isOwner: false,
  switching: false,
  loading: true,
});

const storageKey = (uid: string) => `active_company:${uid}`;

type State = { activeAgencyId: string | null; switching: boolean };
type Action =
  | { type: 'init'; id: string | null }
  | { type: 'switch'; id: string }
  | { type: 'ready' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'init':
      return { activeAgencyId: action.id, switching: false };
    case 'switch':
      if (action.id === state.activeAgencyId) return state;
      return { activeAgencyId: action.id, switching: true };
    case 'ready':
      return { ...state, switching: false };
  }
}

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: myCompanies = [], isLoading: companiesLoading } = useMyCompanies();
  const qc = useQueryClient();
  const [state, dispatch] = useReducer(reducer, { activeAgencyId: null, switching: false });
  const previousIdRef = useRef<string | null>(null);

  // Resolve the default active company on mount or when companies/profile change
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'init', id: null });
      return;
    }
    const stored = localStorage.getItem(storageKey(user.id));
    const ownAgency = profile?.account_type === 'agency' ? user.id : null;
    const validIds = new Set<string>([
      ...(ownAgency ? [ownAgency] : []),
      ...myCompanies.map(c => c.agency_user_id),
    ]);
    let resolved: string | null = null;
    if (stored && validIds.has(stored)) resolved = stored;
    else if (ownAgency) resolved = ownAgency;
    else if (myCompanies[0]) resolved = myCompanies[0].agency_user_id;
    dispatch({ type: 'init', id: resolved });
  }, [user, profile?.account_type, myCompanies]);

  // On every change of activeAgencyId, purge stale per-agency caches & finish switching
  useEffect(() => {
    const previousId = previousIdRef.current;
    const currentId = state.activeAgencyId;
    if (previousId && previousId !== currentId) {
      qc.removeQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[1] === previousId,
      });
      // Also clear any cross-cutting finance session cache
      try { sessionStorage.removeItem('agency-finance-session'); } catch {}
    }
    previousIdRef.current = currentId;
    // Best-effort: prime the DB session GUC so non-owner inserts via legacy
    // helpers (files-api, storage-devices) pass the enforce_active_agency trigger.
    // The trigger no-ops for owners. withActiveAgency() remains the authoritative
    // pairing for critical writes inside refactored hooks.
    if (currentId && user && currentId !== user.id) {
      void Promise.resolve(supabase.rpc('set_active_agency' as any, { _agency: currentId })).catch(() => {});
    }
    if (state.switching) dispatch({ type: 'ready' });
  }, [state.activeAgencyId, state.switching, qc, user]);

  const setActiveAgencyId = (id: string) => {
    if (user) localStorage.setItem(storageKey(user.id), id);
    dispatch({ type: 'switch', id });
  };

  const activeCompany = useMemo(() => {
    if (!state.activeAgencyId) return null;
    if (user && profile?.account_type === 'agency' && state.activeAgencyId === user.id) {
      return {
        agency_user_id: user.id,
        business_name: profile.business_name ?? null,
        full_name: profile.full_name ?? null,
        profile_photo_url: profile.profile_photo_url ?? null,
      };
    }
    const c = myCompanies.find(c => c.agency_user_id === state.activeAgencyId);
    return c ? {
      agency_user_id: c.agency_user_id,
      business_name: c.business_name,
      full_name: c.full_name,
      profile_photo_url: c.profile_photo_url,
    } : null;
  }, [state.activeAgencyId, user, profile, myCompanies]);

  const isOwner = !!user && !!state.activeAgencyId && user.id === state.activeAgencyId && profile?.account_type === 'agency';

  return (
    <ActiveCompanyContext.Provider value={{
      activeAgencyId: state.activeAgencyId,
      setActiveAgencyId,
      activeCompany,
      isOwner,
      switching: state.switching,
      loading: profileLoading || companiesLoading,
    }}>
      {children}
    </ActiveCompanyContext.Provider>
  );
}

export const useActiveCompany = () => useContext(ActiveCompanyContext);

/** Convenience: just the current agency id (null when none active). */
export const useActiveAgencyId = () => useContext(ActiveCompanyContext).activeAgencyId;
