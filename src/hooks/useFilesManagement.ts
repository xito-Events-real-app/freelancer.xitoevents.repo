import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileRecord, FileMonthData,
  getFileRecords, updateFileRecord, deleteFileRecord,
  getAvailableFileMonths, ensureFileRowsForMonth,
} from "@/lib/files-api";
import { toast } from "@/hooks/use-toast";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";


export const filesMonthKey = (year: string, month: string) =>
  ["files", "month", year, month] as const;
export const FILE_MONTHS_KEY = ["files", "months"] as const;

// In-memory guard so we only run ensureFileRowsForMonth once per (year,month) per session.
const ensuredKey = (y: string, m: string) => `${y}::${m}`;
const ensuredCache = new Set<string>();

export function useFilesManagement(selectedMonth: { year: string; month: string } | null) {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  const [isEnsuring, setIsEnsuring] = useState(false);
  const pendingLocalEdits = useRef(new Map<string, number>());

  const requireAgency = (): string => {
    if (!activeAgencyId) throw new Error("Active agency context not set");
    return activeAgencyId;
  };

  // Available months — cached so the month picker is instant after first load.
  const { data: availableMonths = [] } = useQuery<FileMonthData[]>({
    queryKey: FILE_MONTHS_KEY,
    queryFn: getAvailableFileMonths,
    staleTime: 5 * 60_000,
    meta: { persist: true },
  });

  // Files for the selected month — instant render from cache (memory or persisted).
  const monthKey = selectedMonth ? filesMonthKey(selectedMonth.year, selectedMonth.month) : ["files", "month", "none"];
  const enabled = !!selectedMonth;
  const { data: files = [], isLoading: queryLoading, refetch } = useQuery<FileRecord[]>({
    queryKey: monthKey,
    queryFn: () => getFileRecords({
      eventMonth: selectedMonth!.month,
      eventYear: selectedMonth!.year,
    }),
    enabled,
    staleTime: 30_000,
    meta: { persist: true },
  });

  // Background ensure-rows: don't block UI. Runs once per month per session,
  // then refetches the month query so any new rows appear.
  useEffect(() => {
    if (!selectedMonth) return;
    const key = ensuredKey(selectedMonth.year, selectedMonth.month);
    if (ensuredCache.has(key)) return;
    ensuredCache.add(key);

    let cancelled = false;
    setIsEnsuring(true);
    (async () => {
      try {
        await ensureFileRowsForMonth({
          agencyId: requireAgency(),
          eventYear: selectedMonth.year,
          eventMonth: selectedMonth.month,
        });
        if (!cancelled) {
          await qc.invalidateQueries({ queryKey: monthKey });
          await qc.invalidateQueries({ queryKey: FILE_MONTHS_KEY });
        }
      } catch (err) {
        console.error("ensureFileRowsForMonth error:", err);
      } finally {
        if (!cancelled) setIsEnsuring(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMonth?.year, selectedMonth?.month]);

  // Realtime: patch caches directly (month + all-files dashboard cache).
  useEffect(() => {
    if (!selectedMonth) return;
    let cancelled = false;
    const channel = (supabase as any)
      .channel(`files_mgmt_${selectedMonth.year}_${selectedMonth.month}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "files_management" }, (payload: any) => {
        if (cancelled) return;
        const newRow = payload.new as FileRecord | undefined;
        const oldRow = payload.old as { id?: string } | undefined;
        const eventType = payload.eventType as string;
        const rowId = newRow?.id || oldRow?.id;
        if (rowId && pendingLocalEdits.current.has(rowId)) return;

        // Determine if row belongs to this month view
        const inMonth = newRow
          ? newRow.event_year === selectedMonth.year && newRow.event_month === selectedMonth.month
          : false;

        qc.setQueryData<FileRecord[]>(monthKey, (prev) => {
          const list = prev ?? [];
          if (eventType === "INSERT" && newRow) {
            if (newRow.deleted_or_not || !inMonth) return list;
            return list.some((f) => f.id === newRow.id) ? list : [newRow, ...list];
          }
          if (eventType === "UPDATE" && newRow) {
            if (newRow.deleted_or_not) return list.filter((f) => f.id !== newRow.id);
            if (!inMonth) return list.filter((f) => f.id !== newRow.id);
            const exists = list.some((f) => f.id === newRow.id);
            return exists
              ? list.map((f) => (f.id === newRow.id ? { ...f, ...newRow } : f))
              : [newRow, ...list];
          }
          if (eventType === "DELETE" && oldRow?.id) {
            return list.filter((f) => f.id !== oldRow.id);
          }
          return list;
        });

        // Also update the dashboard's "all files" cache if it exists.
        qc.setQueryData<FileRecord[]>(["files", "all"], (prev) => {
          if (!prev) return prev;
          if (eventType === "INSERT" && newRow) {
            if (newRow.deleted_or_not) return prev;
            return prev.some((f) => f.id === newRow.id) ? prev : [newRow, ...prev];
          }
          if (eventType === "UPDATE" && newRow) {
            if (newRow.deleted_or_not) return prev.filter((f) => f.id !== newRow.id);
            const exists = prev.some((f) => f.id === newRow.id);
            return exists
              ? prev.map((f) => (f.id === newRow.id ? { ...f, ...newRow } : f))
              : [newRow, ...prev];
          }
          if (eventType === "DELETE" && oldRow?.id) {
            return prev.filter((f) => f.id !== oldRow.id);
          }
          return prev;
        });
      })
      .subscribe();
    return () => { cancelled = true; (supabase as any).removeChannel(channel); };
  }, [selectedMonth?.year, selectedMonth?.month, qc]);

  // Toast errors for available months
  useEffect(() => {
    // no-op; useQuery handles errors silently in this context
  }, []);

  const update = async (id: string, updates: Partial<FileRecord>) => {
    pendingLocalEdits.current.set(id, Date.now());
    setTimeout(() => pendingLocalEdits.current.delete(id), 3000);

    // Optimistic patch into both caches
    const patch = (prev?: FileRecord[]) =>
      (prev ?? []).map((f) => (f.id === id ? { ...f, ...updates } : f));
    qc.setQueryData<FileRecord[]>(monthKey, patch);
    qc.setQueryData<FileRecord[]>(["files", "all"], (prev) => prev ? patch(prev) : prev);

    try {
      return await updateFileRecord(id, { ...updates, synced_to_sheet: false }, { agencyId: requireAgency() });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: monthKey });
      throw err;
    }
  };

  const remove = async (id: string) => {
    pendingLocalEdits.current.set(id, Date.now());
    setTimeout(() => pendingLocalEdits.current.delete(id), 3000);
    qc.setQueryData<FileRecord[]>(monthKey, (prev) => (prev ?? []).filter((f) => f.id !== id));
    qc.setQueryData<FileRecord[]>(["files", "all"], (prev) => prev ? prev.filter((f) => f.id !== id) : prev);
    await deleteFileRecord(id, { agencyId: requireAgency() });
  };

  // Show loading only when nothing in cache yet.
  const isLoading = enabled && queryLoading && files.length === 0;

  return {
    files,
    isLoading,
    isEnsuring,
    availableMonths,
    update,
    remove,
    refresh: async () => { await refetch(); },
  };
}
