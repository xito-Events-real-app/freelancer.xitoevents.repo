// File Management API — ported from Xito Business Suite and adapted for this app.
// Multi-tenant: every row is owned by auth.uid() (default + RLS).
// Auto-generation reads from agency_clients / agency_client_events / crew_assignments
// instead of the source app's freelancer_assignments / clients_cache.

import { supabase } from "@/integrations/supabase/client";
import { adToBS } from "@/lib/nepali-date";
import { withActiveAgency } from "@/lib/withActiveAgency";

// Trailing options object for every write helper. Named so adding more options
// later cannot silently shift positional date/id arguments (Claude PR-review flag).
export type AgencyOpts = { agencyId: string };

// ── Types ──────────────────────────────────────────────
export interface StorageDevice {
  id: string;
  device_type: string;
  device_name: string;
  pc_drive_letter: string | null;
  total_storage_gb: number;
  used_storage_gb: number;
  remaining_storage_gb: number;
  health_percent: number;
  safety_status: string;
  speed_rating: number;
  purchase_date_ad: string;
  purchase_date_bs: string;
  price_npr: number;
  purchased_from: string;
  cloud_type: string;
  expiry_date_ad: string;
  synced_to_sheet: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  registered_date_time_ad: string;
  registered_date_bs: string;
  client_name: string;
  event_name: string;
  event_year: string;
  event_month: string;
  event_day: string;
  event_date_ad: string;
  freelancer_type: string;
  freelancer_name: string;
  storage_type: string;
  storage_device_id: string | null;
  year_event_folder: string;
  category: string;
  client_folder_name: string;
  event_folder_name: string;
  side: string;
  card_label: string;
  size_gb: number;
  number_of_items: number;
  format_type: string;
  who_copied: string;
  reconfirmation: boolean;
  double_backup: boolean;
  double_backup_path: string;
  triple_backup: boolean;
  triple_backup_path: string;
  drive_upload: boolean;
  drive_upload_path: string;
  deleted_or_not: boolean;
  final_generated_path: string;
  synced_to_sheet: boolean;
  created_at: string;
  updated_at: string;
  backup_1_device_name: string;
  backup_2_path: string;
  backup_2_device_name: string;
  backup_3_path: string;
  backup_3_device_name: string;
  drive_link: string;
  notes: string;
  confirmed: boolean;
  backup_1_recorded_at: string;
  backup_2_recorded_at: string;
  backup_3_recorded_at: string;
  backup_history: string;
}

// ── Storage Devices API ─────────────────────────────────
export async function getStorageDevices(): Promise<StorageDevice[]> {
  const { data, error } = await (supabase as any)
    .from("storage_devices")
    .select("*")
    .order("device_type", { ascending: true })
    .order("device_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addStorageDevice(
  device: Partial<StorageDevice>,
  { agencyId }: AgencyOpts,
): Promise<StorageDevice> {
  return withActiveAgency(agencyId, async () => {
    const { data, error } = await (supabase as any)
      .from("storage_devices")
      .insert(device)
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

export async function updateStorageDevice(
  id: string,
  updates: Partial<StorageDevice>,
  { agencyId }: AgencyOpts,
): Promise<StorageDevice> {
  return withActiveAgency(agencyId, async () => {
    const { data, error } = await (supabase as any)
      .from("storage_devices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

export async function deleteStorageDevice(
  id: string,
  { agencyId }: AgencyOpts,
): Promise<void> {
  return withActiveAgency(agencyId, async () => {
    const { error } = await (supabase as any).from("storage_devices").delete().eq("id", id);
    if (error) throw error;
  });
}

// ── Files Management API ─────────────────────────────────
export async function getFileRecords(filters?: {
  clientName?: string;
  eventMonth?: string;
  eventYear?: string;
}): Promise<FileRecord[]> {
  let query = (supabase as any)
    .from("files_management")
    .select("*")
    .eq("deleted_or_not", false)
    .order("created_at", { ascending: false });
  if (filters?.clientName) query = query.eq("client_name", filters.clientName);
  if (filters?.eventMonth) query = query.eq("event_month", filters.eventMonth);
  if (filters?.eventYear) query = query.eq("event_year", filters.eventYear);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addFileRecord(
  record: Partial<FileRecord>,
  { agencyId }: AgencyOpts,
): Promise<FileRecord> {
  return withActiveAgency(agencyId, async () => {
    const { data, error } = await (supabase as any)
      .from("files_management")
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

export async function updateFileRecord(
  id: string,
  updates: Partial<FileRecord>,
  { agencyId }: AgencyOpts,
): Promise<FileRecord> {
  return withActiveAgency(agencyId, async () => {
    const { data, error } = await (supabase as any)
      .from("files_management")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

export async function deleteFileRecord(
  id: string,
  { agencyId }: AgencyOpts,
): Promise<void> {
  return withActiveAgency(agencyId, async () => {
    const { error } = await (supabase as any)
      .from("files_management")
      .update({ deleted_or_not: true, synced_to_sheet: false })
      .eq("id", id);
    if (error) throw error;
  });
}

// ── Crew → role/category/side mapping (matches source) ──
export const CREW_CODE_MAP: Record<string, { field: string; code: string; category: string; side: string }> = {
  photographer_bride: { field: "photographer_bride", code: "PB", category: "PHOTOS", side: "BRIDE SIDE" },
  photographer_groom: { field: "photographer_groom", code: "PG", category: "PHOTOS", side: "GROOM SIDE" },
  extra_photographer: { field: "extra_photographer", code: "EP", category: "PHOTOS", side: "" },
  videographer_bride: { field: "videographer_bride", code: "VB", category: "VIDEOS", side: "BRIDE SIDE" },
  videographer_groom: { field: "videographer_groom", code: "VG", category: "VIDEOS", side: "GROOM SIDE" },
  extra_videographer: { field: "extra_videographer", code: "EV", category: "VIDEOS", side: "" },
  drone_operator: { field: "drone_operator", code: "DRONE", category: "VIDEOS", side: "" },
  fpv_operator: { field: "fpv_operator", code: "FPV", category: "VIDEOS", side: "" },
  iphone_shooter: { field: "iphone_shooter", code: "IPHONE", category: "VIDEOS", side: "" },
  assistant: { field: "assistant", code: "ASST", category: "", side: "" },
};

const NEPALI_MONTHS: Record<number, string> = {
  1: "BAISAKH", 2: "JESTHA", 3: "ASHADH", 4: "SHRAWAN",
  5: "BHADRA", 6: "ASHWIN", 7: "KARTIK", 8: "MANGSIR",
  9: "POUSH", 10: "MAGH", 11: "FALGUN", 12: "CHAITRA",
};

// English Nepali month names used in event_date_bs strings like "8 Baisakh 2083"
const NEPALI_MONTH_NAMES_EN = [
  "Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

// Map crew_assignments.role values → file management role codes used in CREW_CODE_MAP.
// crew_assignments stores roles in lowercase descriptive form (e.g. "photographer_bride").
const ROLE_TO_CREW_FIELD: Record<string, string> = {
  PHOTOGRAPHER_BRIDE: "photographer_bride",
  PB: "photographer_bride",
  PHOTOGRAPHER_GROOM: "photographer_groom",
  PG: "photographer_groom",
  EXTRA_PHOTOGRAPHER: "extra_photographer",
  EDITOR_PHOTO: "extra_photographer",
  PHOTO_EDITOR: "extra_photographer",
  EP: "extra_photographer",
  VIDEOGRAPHER_BRIDE: "videographer_bride",
  VB: "videographer_bride",
  VIDEOGRAPHER_GROOM: "videographer_groom",
  VG: "videographer_groom",
  EXTRA_VIDEOGRAPHER: "extra_videographer",
  EDITOR_VIDEO: "extra_videographer",
  VIDEO_EDITOR: "extra_videographer",
  EV: "extra_videographer",
  DRONE: "drone_operator",
  DRONE_OPERATOR: "drone_operator",
  FPV: "fpv_operator",
  FPV_OPERATOR: "fpv_operator",
  IPHONE: "iphone_shooter",
  IPHONE_SHOOTER: "iphone_shooter",
  ASSISTANT: "assistant",
  ASST: "assistant",
};

function splitCrewNames(value: string): string[] {
  return (value || "")
    .split(/[,\n]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function getCurrentStatus(status?: string | null): string {
  return String(status || "").trim().toUpperCase();
}

function buildYearEventFolder(eventMonth?: string, eventYear?: string): string {
  if (!eventMonth || !eventYear) return "";
  const monthNumber = parseInt(eventMonth, 10);
  return `${NEPALI_MONTHS[monthNumber] || eventMonth.toUpperCase()} EVENTS ${eventYear}`;
}

function buildCrewKey(code?: string, name?: string): string {
  return `${(code || "").trim().toUpperCase()}||${(name || "").trim().toUpperCase()}`;
}

function buildFileUniquenessKey(file: Partial<FileRecord>): string {
  return [
    file.registered_date_time_ad || "",
    file.event_name || "",
    file.freelancer_type || "",
    file.freelancer_name || "",
    file.card_label || "1",
  ].join("||");
}

function hasMeaningfulFileData(file: Partial<FileRecord>): boolean {
  return Boolean(
    file.final_generated_path ||
      Number(file.size_gb) > 0 ||
      file.backup_2_path ||
      file.backup_3_path,
  );
}

// ── Adapter: synthesize a "freelancer_assignments-like" object per event ──
interface SynthAssignment {
  id: string;
  registered_date_time_ad: string;
  client_name: string;
  client_id: string;
  event: string;
  event_year: string;
  event_month: string;
  event_day: string;
  event_date_ad: string;
  registered_date_bs: string;
  // Per-role assigned freelancer(s), matching source role fields
  photographer_bride: string; photographer_groom: string; extra_photographer: string;
  videographer_bride: string; videographer_groom: string; extra_videographer: string;
  drone_operator: string; fpv_operator: string; iphone_shooter: string; assistant: string;
}

function deriveBSFromAD(adIso: string): { year: string; month: string; day: string } {
  if (!adIso) return { year: "", month: "", day: "" };
  try {
    const d = new Date(adIso);
    if (isNaN(d.getTime())) return { year: "", month: "", day: "" };
    const bs = adToBS(d);
    return { year: String(bs.year), month: String(bs.month), day: String(bs.day) };
  } catch {
    return { year: "", month: "", day: "" };
  }
}

async function fetchSynthAssignments(opts: {
  eventYear?: string;
  eventMonth?: string;
  clientId?: string;
  registeredDateTimeAD?: string;
}): Promise<SynthAssignment[]> {
  // Pull events
  let eventQuery = (supabase as any)
    .from("agency_client_events")
    .select("id, client_id, event_name, event_date_ad, event_date_bs, created_at");

  if (opts.clientId) eventQuery = eventQuery.eq("client_id", opts.clientId);

  const { data: events, error: eErr } = await eventQuery;
  if (eErr) throw eErr;
  if (!events || events.length === 0) return [];

  // Pull clients referenced
  const clientIds = [...new Set(events.map((e: any) => e.client_id).filter(Boolean))];
  const { data: clients } = await (supabase as any)
    .from("agency_clients")
    .select("id, client_name, created_at, event_date_bs, status")
    .in("id", clientIds);

  const clientMap = new Map<string, any>();
  for (const c of clients || []) clientMap.set(c.id, c);

  // Pull crew assignments for these events
  const eventIds = events.map((e: any) => e.id);
  const { data: crews } = await (supabase as any)
    .from("crew_assignments")
    .select("event_id, role, assigned_freelancer")
    .in("event_id", eventIds);

  const crewByEvent = new Map<string, Record<string, string>>();
  for (const c of crews || []) {
    if (!crewByEvent.has(c.event_id)) crewByEvent.set(c.event_id, {});
    const rawRole = String(c.role || "").trim().toUpperCase();
    const field = ROLE_TO_CREW_FIELD[rawRole] || rawRole.toLowerCase();
    if (field && c.assigned_freelancer && CREW_CODE_MAP[field]) {
      const current = crewByEvent.get(c.event_id)![field];
      crewByEvent.get(c.event_id)![field] = current ? `${current}\n${c.assigned_freelancer}` : c.assigned_freelancer;
    }
  }

  // Build synth assignments
  const out: SynthAssignment[] = [];
  for (const ev of events) {
    const client = clientMap.get(ev.client_id);
    if (!client) continue;
    const status = getCurrentStatus(client.status);
    const isBooked = status.includes("BOOKED") && !status.includes("SOMEWHERE ELSE") && !status.includes("CANCEL");
    if (!isBooked) continue;
    // Identity key — use client.created_at iso as registered_date_time_ad
    const registeredDateTimeAD = client.created_at || "";

    // Derive BS y/m/d from event_date_bs.
    // Supported formats: "YYYY-M-D", "YYYY M D", "D MonthName YYYY" (e.g. "8 Baisakh 2083").
    let year = "", month = "", day = "";
    const bs = (ev.event_date_bs || "").trim();
    if (bs) {
      const parts = bs.split(/[-\s]/).filter(Boolean);
      if (parts.length >= 3) {
        const [a, b, c] = parts;
        const monthIdxByName = NEPALI_MONTH_NAMES_EN.findIndex(
          (mn) => mn.toLowerCase() === String(b).toLowerCase()
        );
        if (monthIdxByName !== -1) {
          day = String(parseInt(a, 10) || a);
          month = String(monthIdxByName + 1);
          year = c;
        } else {
          year = a;
          month = String(parseInt(b, 10) || b);
          day = String(parseInt(c, 10) || c);
        }
      }
    }
    if (!year && ev.event_date_ad) {
      const d = deriveBSFromAD(ev.event_date_ad);
      year = d.year; month = d.month; day = d.day;
    }

    if (opts.eventYear && year !== opts.eventYear) continue;
    if (opts.eventMonth && month !== opts.eventMonth) continue;
    if (opts.registeredDateTimeAD && registeredDateTimeAD !== opts.registeredDateTimeAD) continue;

    const c = crewByEvent.get(ev.id) || {};
    out.push({
      id: ev.id,
      registered_date_time_ad: registeredDateTimeAD,
      client_name: client.client_name || "",
      client_id: client.id,
      event: ev.event_name || "",
      event_year: year,
      event_month: month,
      event_day: day,
      event_date_ad: ev.event_date_ad || "",
      registered_date_bs: client.event_date_bs || "",
      photographer_bride: c.photographer_bride || "",
      photographer_groom: c.photographer_groom || "",
      extra_photographer: c.extra_photographer || "",
      videographer_bride: c.videographer_bride || "",
      videographer_groom: c.videographer_groom || "",
      extra_videographer: c.extra_videographer || "",
      drone_operator: c.drone_operator || "",
      fpv_operator: c.fpv_operator || "",
      iphone_shooter: c.iphone_shooter || "",
      assistant: c.assistant || "",
    });
  }

  return out;
}

function buildFileRowFromAssignment(
  assignment: SynthAssignment,
  config: { code: string; category: string; side: string },
  freelancerName: string,
): Partial<FileRecord> {
  const eventName = assignment.event || "";
  return {
    registered_date_time_ad: assignment.registered_date_time_ad,
    registered_date_bs: assignment.registered_date_bs || "",
    client_name: assignment.client_name || "",
    event_name: eventName,
    event_year: assignment.event_year || "",
    event_month: assignment.event_month || "",
    event_day: assignment.event_day || "",
    event_date_ad: assignment.event_date_ad || "",
    freelancer_type: config.code,
    freelancer_name: freelancerName,
    year_event_folder: buildYearEventFolder(assignment.event_month, assignment.event_year),
    category: config.category,
    client_folder_name: (assignment.client_name || "").toUpperCase(),
    event_folder_name: eventName.toUpperCase(),
    side: config.side,
    card_label: "1",
    synced_to_sheet: false,
  };
}

// ── Path Builder ────────────────────────────────────────
export function buildFilePath(params: {
  storageType: string;
  deviceName: string;
  pcDriveLetter?: string;
  yearEventFolder: string;
  category: string;
  clientFolderName: string;
  eventFolderName: string;
  side: string;
  freelancerName: string;
  cardLabel: string;
}): string {
  const segments = [
    params.yearEventFolder,
    params.category,
    params.clientFolderName,
    params.eventFolderName,
    params.side,
    params.freelancerName,
    params.cardLabel,
  ].filter(Boolean);

  if (params.storageType === "PC") {
    const drive = params.pcDriveLetter ? `${params.pcDriveLetter}:` : "";
    return `\\\\${params.deviceName}\\${drive}\\${segments.join("\\")}`;
  }
  return `${params.deviceName}\\${segments.join("\\")}`;
}

// ── Stats ───────────────────────────────────────────────
export async function getFileManagementStats(): Promise<{
  totalFiles: number;
  totalSizeGB: number;
  devicesCount: number;
  warningDevices: number;
}> {
  const [filesRes, devicesRes] = await Promise.all([
    (supabase as any).from("files_management").select("size_gb", { count: "exact" }).eq("deleted_or_not", false),
    (supabase as any).from("storage_devices").select("*"),
  ]);
  const files = filesRes.data ?? [];
  const devices = devicesRes.data ?? [];
  const totalSizeGB = files.reduce((sum: number, f: any) => sum + (Number(f.size_gb) || 0), 0);
  const warningDevices = devices.filter((d: any) => {
    const remaining = Number(d.remaining_storage_gb) || 0;
    const total = Number(d.total_storage_gb) || 1;
    return remaining / total < 0.1 || d.safety_status === "UNSAFE" || d.safety_status === "RISKY";
  }).length;
  return {
    totalFiles: filesRes.count ?? files.length,
    totalSizeGB: Math.round(totalSizeGB * 100) / 100,
    devicesCount: devices.length,
    warningDevices,
  };
}

// ── Sheets sync stubs ───────────────────────────────────
export async function syncStorageDevicesFromSheets(): Promise<{ upserted: number }> {
  return { upserted: 0 };
}
export async function pushStorageDevicesToSheets(): Promise<{ pushed: number }> {
  return { pushed: 0 };
}
export async function pushFilesToSheets(): Promise<{ pushed: number }> {
  return { pushed: 0 };
}
export async function cleanAndResyncFilesToSheets(): Promise<{ pushed: number }> {
  return { pushed: 0 };
}

// ── Month helpers ───────────────────────────────────────
export interface FileMonthData {
  year: string;
  month: string;
  label: string;
  value: string;
}

export async function getAvailableFileMonths(): Promise<FileMonthData[]> {
  const today = new Date().toISOString().slice(0, 10);
  const synth = await fetchSynthAssignments({});

  const pastRows = synth.filter((r) => {
    const d = r.event_date_ad || "";
    if (!d || d.includes("**")) return false;
    return d <= today;
  });

  const seen = new Set<string>();
  const months: FileMonthData[] = [];
  for (const r of pastRows) {
    if (!r.event_year || !r.event_month) continue;
    const key = `${r.event_year}-${r.event_month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const monthNum = parseInt(r.event_month, 10);
    months.push({
      year: r.event_year,
      month: r.event_month,
      label: `${NEPALI_MONTHS[monthNum] || `Month ${monthNum}`} ${r.event_year}`,
      value: key,
    });
  }
  months.sort((a, b) => {
    const ya = parseInt(a.year), yb = parseInt(b.year);
    if (ya !== yb) return yb - ya;
    return parseInt(b.month) - parseInt(a.month);
  });
  return months;
}

// Module-level lock
let _ensureLock: Promise<void> | null = null;

export async function ensureFileRowsForMonth(
  { agencyId, eventYear, eventMonth }: { agencyId: string; eventYear: string; eventMonth: string },
): Promise<void> {
  if (_ensureLock) await _ensureLock;
  let resolve!: () => void;
  _ensureLock = new Promise((r) => { resolve = r; });
  try {
    await withActiveAgency(agencyId, () => _ensureFileRowsForMonthInner(eventYear, eventMonth));
  } finally {
    resolve();
    _ensureLock = null;
  }
}

async function _ensureFileRowsForMonthInner(eventYear: string, eventMonth: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const assignments = await fetchSynthAssignments({ eventYear, eventMonth });
  if (assignments.length === 0) return;

  const pastAssignments = assignments.filter((a) => {
    const d = a.event_date_ad || "";
    if (!d || d.includes("**")) return false;
    return d <= today;
  });
  if (pastAssignments.length === 0) return;

  const { data: existingFiles } = await (supabase as any)
    .from("files_management")
    .select("registered_date_time_ad, event_name, freelancer_type, freelancer_name, card_label")
    .eq("event_year", eventYear)
    .eq("event_month", eventMonth)
    .eq("deleted_or_not", false);

  const existingKeys = new Set(
    (existingFiles || []).map((f: any) => buildFileUniquenessKey(f)),
  );

  const newRows: Partial<FileRecord>[] = [];
  for (const assignment of pastAssignments) {
    for (const [field, config] of Object.entries(CREW_CODE_MAP)) {
      for (const freelancerName of splitCrewNames((assignment as any)[field])) {
        const row = buildFileRowFromAssignment(assignment, config, freelancerName);
        const key = buildFileUniquenessKey(row);
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        newRows.push(row);
      }
    }
  }

  if (newRows.length > 0) {
    // Pre-insert recheck
    const { data: recheckFiles } = await (supabase as any)
      .from("files_management")
      .select("registered_date_time_ad, event_name, freelancer_type, freelancer_name, card_label")
      .eq("event_year", eventYear)
      .eq("event_month", eventMonth)
      .eq("deleted_or_not", false);
    const recheckKeys = new Set(
      (recheckFiles || []).map((f: any) => buildFileUniquenessKey(f)),
    );
    const dedupedRows = newRows.filter((r) => !recheckKeys.has(buildFileUniquenessKey(r)));
    for (let i = 0; i < dedupedRows.length; i += 50) {
      const batch = dedupedRows.slice(i, i + 50);
      const { error } = await (supabase as any).from("files_management").insert(batch);
      if (error) throw error;
    }
  }

  // Cleanup pass: soft-delete stale skeleton rows
  const { data: allFilesForMonth } = await (supabase as any)
    .from("files_management")
    .select("id, registered_date_time_ad, event_name, freelancer_type, freelancer_name, card_label, final_generated_path, size_gb, backup_2_path, backup_3_path, created_at")
    .eq("event_year", eventYear)
    .eq("event_month", eventMonth)
    .eq("deleted_or_not", false);

  if (allFilesForMonth && allFilesForMonth.length > 0) {
    const assignmentCrewMap = new Map<string, Set<string>>();
    for (const assignment of pastAssignments) {
      const mapKey = `${assignment.registered_date_time_ad}||${assignment.event}`;
      const crewSet = new Set<string>();
      for (const [field, config] of Object.entries(CREW_CODE_MAP)) {
        for (const name of splitCrewNames((assignment as any)[field])) {
          crewSet.add(buildCrewKey(config.code, name));
        }
      }
      assignmentCrewMap.set(mapKey, crewSet);
    }

    const staleIds: string[] = [];
    const seenRowKeys = new Set<string>();
    const filesSorted = [...allFilesForMonth].sort((a: any, b: any) => {
      const aHasData = hasMeaningfulFileData(a) ? 1 : 0;
      const bHasData = hasMeaningfulFileData(b) ? 1 : 0;
      if (aHasData !== bHasData) return bHasData - aHasData;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });

    for (const file of filesSorted) {
      const mapKey = `${file.registered_date_time_ad}||${file.event_name}`;
      const crewSet = assignmentCrewMap.get(mapKey);
      if (!crewSet) continue;
      const fileKey = buildCrewKey(file.freelancer_type, file.freelancer_name);
      if (!crewSet.has(fileKey)) {
        if (!hasMeaningfulFileData(file)) staleIds.push(file.id);
        continue;
      }
      const dedupeKey = `${mapKey}||${fileKey}||${file.card_label || "1"}`;
      if (seenRowKeys.has(dedupeKey) && !hasMeaningfulFileData(file)) {
        staleIds.push(file.id);
        continue;
      }
      seenRowKeys.add(dedupeKey);
    }

    if (staleIds.length > 0) {
      await (supabase as any)
        .from("files_management")
        .update({ deleted_or_not: true, synced_to_sheet: false })
        .in("id", staleIds);
    }
  }
}

// ── Duplicate file row for additional card ──────────────
export async function duplicateFileRowForCard(
  fileId: string,
  cardNumber: number,
  { agencyId }: AgencyOpts,
): Promise<FileRecord> {
  return withActiveAgency(agencyId, async () => {
    const { data: original, error: fetchErr } = await (supabase as any)
      .from("files_management").select("*").eq("id", fileId).single();
    if (fetchErr) throw fetchErr;

    const newRow: Partial<FileRecord> = {
      registered_date_time_ad: original.registered_date_time_ad,
      registered_date_bs: original.registered_date_bs,
      client_name: original.client_name,
      event_name: original.event_name,
      event_year: original.event_year,
      event_month: original.event_month,
      event_day: original.event_day,
      event_date_ad: original.event_date_ad,
      freelancer_type: original.freelancer_type,
      freelancer_name: original.freelancer_name,
      year_event_folder: original.year_event_folder,
      category: original.category,
      client_folder_name: original.client_folder_name,
      event_folder_name: original.event_folder_name,
      side: original.side,
      card_label: String(cardNumber),
      format_type: original.format_type,
      storage_type: "",
      storage_device_id: null,
      size_gb: 0,
      number_of_items: 0,
      final_generated_path: "",
      synced_to_sheet: false,
    };

    const { data, error } = await (supabase as any)
      .from("files_management").insert(newRow).select().single();
    if (error) throw error;
    return data;
  });
}

// ── Auto card label increment ───────────────────────────
export async function getNextCardLabel(
  clientName: string,
  freelancerName: string,
  formatType: string,
): Promise<string> {
  if (!formatType) return "";
  const prefixMap: Record<string, string> = {
    RAW_ONLY: "RAW", JPEG_ONLY: "JPEG", RAW_JPEG: "RJ",
    CF: "CF", NORMAL: "N", CF_NORMAL: "CFN",
  };
  const prefix = prefixMap[formatType] || formatType;

  const { data } = await (supabase as any)
    .from("files_management").select("card_label")
    .eq("client_name", clientName).eq("freelancer_name", freelancerName)
    .eq("deleted_or_not", false);
  if (!data || data.length === 0) return `${prefix}1`;

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)$`, "i");
  for (const row of data) {
    const match = (row.card_label || "").match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `${prefix}${maxNum + 1}`;
}

export function getNextBackupNumber(file: FileRecord): number {
  if (!file.final_generated_path) return 1;
  if (!file.backup_2_path) return 2;
  if (!file.backup_3_path) return 3;
  return 0;
}

// ── Cascade: sync files_management with crew assignments for a single event ──
export async function syncFilesWithAssignments(
  { agencyId, registeredDateTimeAD, eventName }: { agencyId: string; registeredDateTimeAD: string; eventName: string },
): Promise<void> {
  return withActiveAgency(agencyId, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const assignments = await fetchSynthAssignments({ registeredDateTimeAD });
    const assignment = assignments.find((a) => a.event === eventName);
    if (!assignment) return;
    const d = assignment.event_date_ad || "";
    if (!d || d.includes("**") || d > today) return;

    const currentCrewKeys = new Set<string>();
    const desiredRowsByKey = new Map<string, Partial<FileRecord>>();
    for (const [field, config] of Object.entries(CREW_CODE_MAP)) {
      for (const name of splitCrewNames((assignment as any)[field])) {
        const crewKey = buildCrewKey(config.code, name);
        currentCrewKeys.add(crewKey);
        const row = buildFileRowFromAssignment(assignment, config, name);
        desiredRowsByKey.set(`${crewKey}||${row.card_label || "1"}`, row);
      }
    }

    const { data: fileRows } = await (supabase as any)
      .from("files_management").select("*")
      .eq("registered_date_time_ad", registeredDateTimeAD)
      .eq("event_name", eventName).eq("deleted_or_not", false)
      .order("created_at", { ascending: true });

    const sortedFileRows = [...(fileRows || [])].sort((a: any, b: any) => {
      const aHasData = hasMeaningfulFileData(a) ? 1 : 0;
      const bHasData = hasMeaningfulFileData(b) ? 1 : 0;
      if (aHasData !== bHasData) return bHasData - aHasData;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });

    const idsToDelete: string[] = [];
    const seenCurrentRows = new Set<string>();
    const existingDesiredKeys = new Set<string>();

    for (const file of sortedFileRows) {
      const fileKey = buildCrewKey(file.freelancer_type, file.freelancer_name);
      const rowKey = `${fileKey}||${file.card_label || "1"}`;
      if (!currentCrewKeys.has(fileKey)) {
        if (!hasMeaningfulFileData(file)) idsToDelete.push(file.id);
        continue;
      }
      if (seenCurrentRows.has(rowKey) && !hasMeaningfulFileData(file)) {
        idsToDelete.push(file.id);
        continue;
      }
      seenCurrentRows.add(rowKey);
      if (desiredRowsByKey.has(rowKey)) existingDesiredKeys.add(rowKey);
    }

    if (idsToDelete.length > 0) {
      await (supabase as any).from("files_management")
        .update({ deleted_or_not: true, synced_to_sheet: false })
        .in("id", idsToDelete);
    }

    const rowsToInsert = Array.from(desiredRowsByKey.entries())
      .filter(([key]) => !existingDesiredKeys.has(key))
      .map(([, row]) => row);

    if (rowsToInsert.length > 0) {
      await (supabase as any).from("files_management").insert(rowsToInsert);
    }
  }).catch((err) => {
    console.error("[syncFilesWithAssignments] Error:", err);
  });
}

// ── Helper: list freelancer names for "Who Copied" picker ──
export async function getFreelancerNamesForCopier(): Promise<string[]> {
  const { data } = await (supabase as any)
    .from("freelancer_profiles").select("full_name").neq("full_name", "").order("full_name");
  const names = (data || [])
    .map((d: any) => (d.full_name || "").trim())
    .filter(Boolean);
  // Deduplicate case-insensitively to avoid React key collisions in pickers.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const key = n.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}
