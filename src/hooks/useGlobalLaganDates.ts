import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FIVE_MIN = 5 * 60 * 1000;

/** Returns lagan day numbers for a single BS year + month. */
export function useGlobalLaganDates(bsYear: number, bsMonth: number) {
  return useQuery({
    queryKey: ['global-lagan-dates', bsYear, bsMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_lagan_dates')
        .select('bs_day')
        .eq('bs_year', bsYear)
        .eq('bs_month', bsMonth);
      if (error) throw error;
      return (data ?? []).map((d: any) => d.bs_day as number);
    },
    staleTime: FIVE_MIN,
  });
}

export interface LaganRow {
  id: string;
  bs_year: number;
  bs_month: number;
  bs_day: number;
}

/** Returns global lagan dates from the current BS year onwards (used by freelancer calendar / sticky widget). */
export function useAllGlobalLaganDates() {
  return useQuery({
    queryKey: ['global-lagan-dates', 'all'],
    queryFn: async () => {
      // Restrict to the current BS year and later — past lagan dates aren't useful in the UI
      // and previously we were pulling years of history on every page load.
      const { getCurrentBSDate } = await import('@/lib/nepaliCalendar');
      const { year: currentBsYear } = getCurrentBSDate();
      const { data, error } = await supabase
        .from('global_lagan_dates')
        .select('id, bs_year, bs_month, bs_day')
        .gte('bs_year', currentBsYear)
        .order('bs_year', { ascending: true })
        .order('bs_month', { ascending: true })
        .order('bs_day', { ascending: true });
      if (error) throw error;
      return (data ?? []) as LaganRow[];
    },
    staleTime: FIVE_MIN,
  });
}

/** Admin-only: toggle a single lagan date on/off. */
export function useToggleGlobalLaganDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bsYear,
      bsMonth,
      bsDay,
      isLagan,
    }: { bsYear: number; bsMonth: number; bsDay: number; isLagan: boolean }) => {
      if (isLagan) {
        const { error } = await supabase
          .from('global_lagan_dates')
          .delete()
          .eq('bs_year', bsYear)
          .eq('bs_month', bsMonth)
          .eq('bs_day', bsDay);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('global_lagan_dates')
          .insert({ bs_year: bsYear, bs_month: bsMonth, bs_day: bsDay, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-lagan-dates'] });
    },
  });
}
