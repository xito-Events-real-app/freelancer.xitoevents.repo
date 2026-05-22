import { supabase } from '@/integrations/supabase/client';

/**
 * Callback wrapper that sets the active-agency GUC on the database session
 * before running the supplied mutation, so the BEFORE INSERT trigger on every
 * agency-owned table knows which company the staff member is acting on behalf of.
 *
 * The DB trigger short-circuits for owners (auth.uid() = NEW.user_id), so
 * setting the GUC is a no-op cost for owner writes — kept here for uniformity
 * and to make it impossible to forget.
 *
 * Structurally pairs the GUC set + the actual write so the await on the GUC
 * step can never be forgotten.
 */
export async function withActiveAgency<T>(
  agencyId: string | null | undefined,
  run: () => Promise<T>,
): Promise<T> {
  if (!agencyId) {
    throw new Error('Active agency context not set');
  }
  const { error } = await supabase.rpc('set_active_agency' as any, { _agency: agencyId });
  if (error) throw error;
  return run();
}
