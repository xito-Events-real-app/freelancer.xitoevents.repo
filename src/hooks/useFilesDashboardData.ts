import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileRecord } from "@/lib/files-api";

export interface DashboardStats {
  todayCopied: number; todayCopiedGB: number; todayPhotoGB: number; todayVideoGB: number;
  totalCopied: number; totalCopiedGB: number; totalPhotoGB: number; totalVideoGB: number;
  filesPending: number; pendingPhotoCount: number; pendingVideoCount: number;
  doubleBackupDone: number; doubleBackupRemaining: number;
  backupDonePhotoGB: number; backupDoneVideoGB: number;
  backupRemainingPhotoGB: number; backupRemainingVideoGB: number;
}

const PHOTO_ROLES = new Set(["PB", "PG", "EP"]);
const VIDEO_ROLES = new Set(["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"]);
const isPhoto = (f: FileRecord) => PHOTO_ROLES.has((f.freelancer_type || "").toUpperCase());
const isVideo = (f: FileRecord) => VIDEO_ROLES.has((f.freelancer_type || "").toUpperCase());

export interface ActivityItem { id: string; clientName: string; action: string; timestamp: string; }
export interface InsightItem { type: "warning" | "info" | "success"; message: string; }
export type FilterMode = "all" | "today" | "copied" | "pending" | "backup_done" | "backup_remaining";

const isToday = (dateStr: string): boolean => {
  const d = new Date(dateStr); const now = new Date();
  return d.toDateString() === now.toDateString();
};

export const FILES_ALL_KEY = ["files", "all"] as const;

async function fetchAllFiles(): Promise<FileRecord[]> {
  const { data, error } = await (supabase as any)
    .from("files_management").select("*").eq("deleted_or_not", false)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as FileRecord[]) || [];
}

import { useState } from "react";

export function useFilesDashboardData() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const { data: files = [], isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: FILES_ALL_KEY,
    queryFn: fetchAllFiles,
    // Enables stale-while-revalidate: instant render from (in-memory or persisted) cache
    staleTime: 30_000,
    meta: { persist: true },
  });

  // Realtime: patch the cache directly so all screens stay in sync without refetch.
  useEffect(() => {
    const channel = (supabase as any)
      .channel("files_dashboard_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "files_management" }, (payload: any) => {
        const newRow = payload.new as FileRecord | undefined;
        const oldRow = payload.old as { id?: string } | undefined;
        const eventType = payload.eventType as string;

        qc.setQueryData<FileRecord[]>(FILES_ALL_KEY, (prev) => {
          const list = prev ?? [];
          if (eventType === "INSERT" && newRow) {
            if (newRow.deleted_or_not) return list;
            if (list.some((f) => f.id === newRow.id)) return list;
            return [newRow, ...list];
          }
          if (eventType === "UPDATE" && newRow) {
            if (newRow.deleted_or_not) return list.filter((f) => f.id !== newRow.id);
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
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [qc]);

  const stats = useMemo<DashboardStats>(() => {
    const gb = (f: FileRecord) => Number(f.size_gb) || 0;
    const sumGB = (arr: FileRecord[]) => arr.reduce((s, f) => s + gb(f), 0);
    const todayFiles = files.filter((f) => f.backup_1_recorded_at && isToday(f.backup_1_recorded_at));
    const copiedFiles = files.filter((f) => !!f.final_generated_path);
    const pendingFiles = files.filter((f) => !f.final_generated_path);
    const backupDoneFiles = files.filter((f) => !!f.backup_2_path);
    const backupRemainingFiles = files.filter((f) => f.final_generated_path && !f.backup_2_path);
    return {
      todayCopied: todayFiles.length, todayCopiedGB: sumGB(todayFiles),
      todayPhotoGB: sumGB(todayFiles.filter(isPhoto)), todayVideoGB: sumGB(todayFiles.filter(isVideo)),
      totalCopied: copiedFiles.length, totalCopiedGB: sumGB(copiedFiles),
      totalPhotoGB: sumGB(copiedFiles.filter(isPhoto)), totalVideoGB: sumGB(copiedFiles.filter(isVideo)),
      filesPending: pendingFiles.length,
      pendingPhotoCount: pendingFiles.filter(isPhoto).length,
      pendingVideoCount: pendingFiles.filter(isVideo).length,
      doubleBackupDone: backupDoneFiles.length, doubleBackupRemaining: backupRemainingFiles.length,
      backupDonePhotoGB: sumGB(backupDoneFiles.filter(isPhoto)),
      backupDoneVideoGB: sumGB(backupDoneFiles.filter(isVideo)),
      backupRemainingPhotoGB: sumGB(backupRemainingFiles.filter(isPhoto)),
      backupRemainingVideoGB: sumGB(backupRemainingFiles.filter(isVideo)),
    };
  }, [files]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) =>
        (f.client_name || "").toLowerCase().includes(q) ||
        (f.event_name || "").toLowerCase().includes(q) ||
        (f.freelancer_name || "").toLowerCase().includes(q));
    }
    switch (filterMode) {
      case "today": return result.filter((f) => f.backup_1_recorded_at && isToday(f.backup_1_recorded_at));
      case "copied": return result.filter((f) => !!f.final_generated_path);
      case "pending": return result.filter((f) => !f.final_generated_path);
      case "backup_done": return result.filter((f) => !!f.backup_2_path);
      case "backup_remaining": return result.filter((f) => f.final_generated_path && !f.backup_2_path);
      default: return result;
    }
  }, [files, search, filterMode]);

  const activityFeed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const f of files) {
      if (f.backup_1_recorded_at) items.push({
        id: f.id + "_b1", clientName: f.client_name || "Unknown",
        action: `${f.freelancer_name || "File"} copied to ${f.backup_1_device_name || "device"}`,
        timestamp: f.backup_1_recorded_at,
      });
      if (f.backup_2_recorded_at) items.push({
        id: f.id + "_b2", clientName: f.client_name || "Unknown",
        action: `Double backup to ${f.backup_2_device_name || "device"}`,
        timestamp: f.backup_2_recorded_at,
      });
    }
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, 30);
  }, [files]);

  const insights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];
    items.push({ type: "info", message: `${stats.todayCopied} files copied today (${stats.todayCopiedGB.toFixed(1)} GB)` });
    if (stats.filesPending > 0) items.push({ type: "warning", message: `${stats.filesPending} files pending copy` });
    if (stats.doubleBackupRemaining > 0) items.push({ type: "warning", message: `${stats.doubleBackupRemaining} files need double backup` });
    items.push({ type: "success", message: `${stats.doubleBackupDone} double backups completed` });
    return items;
  }, [stats]);

  // Show loading only when there's truly no data yet (initial cold start).
  // After that, cache provides instant render and refetch happens silently.
  const showLoading = isLoading && files.length === 0;

  return {
    files: filteredFiles, allFiles: files, stats, activityFeed, insights,
    isLoading: showLoading,
    search, setSearch, filterMode, setFilterMode,
    lastUpdated: new Date(dataUpdatedAt),
    refresh: () => refetch(),
  };
}
