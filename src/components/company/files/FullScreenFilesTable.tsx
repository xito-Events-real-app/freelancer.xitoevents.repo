import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Loader2, X, ChevronLeft, FolderOpen, ChevronDown, ChevronUp, Filter, PenLine, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentBSDate, nepaliMonthsEnglish, getBSYearsRange } from "@/lib/nepali-date";
import { supabase } from "@/integrations/supabase/client";
import { useFilesManagement } from "@/hooks/useFilesManagement";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { FilePathBuilderDialog } from "./FilePathBuilderDialog";
import { CloudUploadDialog } from "./CloudUploadDialog";
import { ReconfirmationDialog } from "./ReconfirmationDialog";
import { FileRecord } from "@/lib/files-api";

const DAY_COLORS = [
  "bg-white dark:bg-slate-900",
  "bg-blue-50 dark:bg-blue-950/40",
  "bg-amber-50 dark:bg-amber-950/40",
  "bg-emerald-50 dark:bg-emerald-950/40",
  "bg-purple-50 dark:bg-purple-950/40",
  "bg-rose-50 dark:bg-rose-950/40",
  "bg-cyan-50 dark:bg-cyan-950/40",
  "bg-orange-50 dark:bg-orange-950/40",
];

const PHOTO_ROLES = ["PB", "PG", "EP"];
const VIDEO_ROLES = ["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"];

const getTimeAgo = (dateStr: string): string => {
  if (!dateStr) return "";
  const then = new Date(dateStr);
  const now = new Date();
  let diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 0) return "just now";
  const days = Math.floor(diff / 86400); diff %= 86400;
  const hrs = Math.floor(diff / 3600); diff %= 3600;
  const mins = Math.floor(diff / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hrs > 0) parts.push(`${hrs}h`);
  parts.push(`${mins}m`);
  return parts.join(" ") + " ago";
};

const BackupPill = ({ path, deviceName, file, backupNum, onDeviceClick }: { path: string; deviceName: string; file: FileRecord; backupNum?: number; onDeviceClick?: (name: string) => void }) => {
  if (!path) return <X className="w-4 h-4 text-red-500 mx-auto" />;
  const label = deviceName || path.split("\\")[0] || "✓";
  const ts = backupNum === 1 ? file.backup_1_recorded_at
    : backupNum === 2 ? file.backup_2_recorded_at
    : backupNum === 3 ? file.backup_3_recorded_at
    : null;
  const displayDate = ts || file.updated_at || file.created_at;

  return (
    <HoverCard openDelay={100} closeDelay={300}>
      <HoverCardTrigger asChild>
        <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold truncate max-w-[90px] cursor-pointer rounded-md"
          onClick={(e) => { if (onDeviceClick && deviceName) { e.stopPropagation(); onDeviceClick(deviceName); } }}>
          {label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3 space-y-2 text-xs z-[200]" side="top">
        <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{label}</div>
        <div className="bg-muted/50 rounded px-2 py-1.5 font-mono text-[11px] break-all">{path}</div>
        {displayDate && <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="w-3.5 h-3.5" /><span className="font-bold">{getTimeAgo(displayDate)}</span></div>}
      </HoverCardContent>
    </HoverCard>
  );
};

interface AssignmentRow {
  id: string;
  registeredDateTimeAD: string;
  clientName: string;
  event: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
}

interface Props {
  onClose: () => void;
  selectedMonthFilter?: { year: string; month: string } | null;
  onMonthFilterChange?: (month: { year: string; month: string }) => void;
}

export function FullScreenFilesTable({ onClose, selectedMonthFilter, onMonthFilterChange }: Props) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const didApplyUrlParams = useRef(false);
  const currentBS = getCurrentBSDate();
  const [selectedYear, setSelectedYear] = useState(String(currentBS.year));
  const [selectedMonth, setSelectedMonth] = useState(String(currentBS.month));
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterDevice, setFilterDevice] = useState<string | null>(null);
  const [filterFreelancer, setFilterFreelancer] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const monthObj = useMemo(() => ({ year: selectedYear, month: selectedMonth }), [selectedYear, selectedMonth]);
  const { files, isLoading: filesLoading, isEnsuring, update, refresh } = useFilesManagement(monthObj);
  const { devices } = useStorageDevices();

  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [editBackupNumber, setEditBackupNumber] = useState<number | null>(null);

  const [cloudDialogOpen, setCloudDialogOpen] = useState(false);
  const [cloudFile, setCloudFile] = useState<FileRecord | null>(null);

  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesFile, setNotesFile] = useState<FileRecord | null>(null);
  const [notesText, setNotesText] = useState("");

  const [reconfirmFile, setReconfirmFile] = useState<FileRecord | null>(null);
  const [reconfirmOpen, setReconfirmOpen] = useState(false);

  useEffect(() => {
    if (!selectedMonthFilter) return;
    if (selectedMonthFilter.year !== selectedYear) setSelectedYear(selectedMonthFilter.year);
    if (selectedMonthFilter.month !== selectedMonth) setSelectedMonth(selectedMonthFilter.month);
  }, [selectedMonthFilter?.year, selectedMonthFilter?.month]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    onMonthFilterChange?.({ year, month: selectedMonth });
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    onMonthFilterChange?.({ year: selectedYear, month });
  };

  // Load assignments for selected year/month — uses agency_client_events + agency_clients adapter
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      
      const { data: events } = await (supabase as any)
        .from("agency_client_events")
        .select("id, client_id, event_name, event_date_ad, event_date_bs");
      if (!events) { setAssignments([]); return; }

      const clientIds = Array.from(new Set(events.map((e: any) => e.client_id).filter(Boolean)));
      const { data: clients } = await (supabase as any)
        .from("agency_clients")
        .select("id, client_name, created_at, status")
        .in("id", clientIds);
      const clientMap = new Map<string, any>();
      (clients || []).forEach((c: any) => clientMap.set(c.id, c));

      const rows: AssignmentRow[] = [];
      for (const ev of events) {
        const client = clientMap.get(ev.client_id);
        if (!client) continue;
        const status = String(client.status || "").toUpperCase();
        const isBooked = status.includes("BOOKED") && !status.includes("SOMEWHERE ELSE") && !status.includes("CANCEL");
        if (!isBooked) continue;
        const bs = (ev.event_date_bs || "").trim();
        let y = "", m = "", d = "";
        if (bs) {
          // Supported formats:
          //  "<day> <MonthName> <year>"  e.g. "8 Baisakh 2083"
          //  "<year>-<month>-<day>"      e.g. "2083-01-08"
          //  "<year> <month> <day>"      e.g. "2083 1 8"
          const parts = bs.split(/[-\s]/).filter(Boolean);
          if (parts.length >= 3) {
            const [a, b, c] = parts;
            const monthIdxByName = nepaliMonthsEnglish.findIndex(
              (mn) => mn.toLowerCase() === String(b).toLowerCase()
            );
            if (monthIdxByName !== -1) {
              // "<day> <MonthName> <year>"
              d = String(parseInt(a, 10) || a);
              m = String(monthIdxByName + 1);
              y = c;
            } else {
              // "<year> <month> <day>"
              y = a;
              m = String(parseInt(b, 10) || b);
              d = String(parseInt(c, 10) || c);
            }
          }
        }
        if (y !== selectedYear || m !== selectedMonth) continue;
        const dateAD = ev.event_date_ad || "";
        if (!dateAD || dateAD.includes("**")) continue;
        if (dateAD > today) continue;
        rows.push({
          id: ev.id,
          registeredDateTimeAD: client.created_at || "",
          clientName: client.client_name || "",
          event: ev.event_name || "",
          eventYear: y, eventMonth: m, eventDay: d,
          eventDateAD: dateAD,
        });
      }
      setAssignments(rows);
    } catch {
      toast.error("Failed to load events");
    } finally { setLoading(false); }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  useEffect(() => {
    if (didApplyUrlParams.current || loading || assignments.length === 0) return;
    const urlClient = searchParams.get("client");
    const urlEvent = searchParams.get("event");
    const urlYear = searchParams.get("year");
    const urlMonth = searchParams.get("month");
    if (!urlClient) return;
    if (urlYear && urlYear !== selectedYear) setSelectedYear(urlYear);
    if (urlMonth && urlMonth !== selectedMonth) setSelectedMonth(urlMonth);
    setFilterClient(urlClient);
    didApplyUrlParams.current = true;
    const newParams = new URLSearchParams(searchParams);
    ["client", "event", "year", "month"].forEach(k => newParams.delete(k));
    setSearchParams(newParams, { replace: true });
    if (urlEvent) {
      const match = assignments.find(a => a.clientName === urlClient && a.event === urlEvent);
      if (match) setExpandedRows(new Set([`${match.registeredDateTimeAD}-${match.event}-${match.eventDateAD}`]));
    }
  }, [searchParams, assignments, loading, selectedYear, selectedMonth, setSearchParams]);

  const filteredRows = useMemo(() => {
    let rows = [...assignments].sort((a, b) => (parseInt(b.eventDay) || 0) - (parseInt(a.eventDay) || 0));
    if (filterDay) rows = rows.filter(a => a.eventDay === filterDay);
    if (filterClient) rows = rows.filter(a => a.clientName === filterClient);
    if (filterDevice) rows = rows.filter(a => {
      const rf = files.filter(f => f.registered_date_time_ad === a.registeredDateTimeAD && f.event_name === a.event);
      return rf.some(f => [f.backup_1_device_name, f.backup_2_device_name, f.backup_3_device_name, f.drive_upload_path].includes(filterDevice));
    });
    if (filterFreelancer) rows = rows.filter(a => {
      const rf = files.filter(f => f.registered_date_time_ad === a.registeredDateTimeAD && f.event_name === a.event);
      return rf.some(f => f.freelancer_name === filterFreelancer);
    });
    return rows;
  }, [assignments, filterDay, filterClient, filterDevice, filterFreelancer, files]);

  const dayColorMap = useMemo(() => {
    const days = [...new Set(filteredRows.map(r => r.eventDay))];
    const map = new Map<string, string>();
    days.forEach((d, i) => map.set(d, DAY_COLORS[i % DAY_COLORS.length]));
    return map;
  }, [filteredRows]);

  const getFilesForRow = useCallback((row: AssignmentRow): FileRecord[] => {
    let rf = files.filter(f => f.registered_date_time_ad === row.registeredDateTimeAD && f.event_name === row.event);
    if (filterDevice) rf = rf.filter(f => [f.backup_1_device_name, f.backup_2_device_name, f.backup_3_device_name, f.drive_upload_path].includes(filterDevice));
    if (filterFreelancer) rf = rf.filter(f => f.freelancer_name === filterFreelancer);
    return rf;
  }, [files, filterDevice, filterFreelancer]);

  const stats = useMemo(() => ({
    totalEvents: filteredRows.length,
    totalFiles: files.length,
    totalSizeGB: Math.round(files.reduce((s, f) => s + (Number(f.size_gb) || 0), 0) * 100) / 100,
  }), [filteredRows, files]);

  const toggleExpand = useCallback((rowKey: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
      return next;
    });
  }, []);

  const allExpanded = useMemo(() => filteredRows.length > 0 && filteredRows.every(row => expandedRows.has(`${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`)), [filteredRows, expandedRows]);

  const handleToggleExpandAll = useCallback(() => {
    if (allExpanded) setExpandedRows(new Set());
    else setExpandedRows(new Set(filteredRows.map(row => `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`)));
  }, [allExpanded, filteredRows]);

  const openPathBuilder = (file: FileRecord, backupNum?: number) => {
    setSelectedFile(file); setEditBackupNumber(backupNum ?? null); setPathDialogOpen(true);
  };
  const openNotesDialog = (file: FileRecord) => { setNotesFile(file); setNotesText(file.notes || ""); setNotesDialogOpen(true); };
  const saveNotes = async () => {
    if (!notesFile) return;
    await update(notesFile.id, { notes: notesText, synced_to_sheet: false });
    setNotesDialogOpen(false); toast.success("Notes saved");
  };
  const handleReconfirmClick = (file: FileRecord) => { setReconfirmFile(file); setReconfirmOpen(true); };
  const handleConfirmFile = async (fileId: string) => { await update(fileId, { confirmed: true, reconfirmation: true, synced_to_sheet: false }); };

  const years = getBSYearsRange();
  const monthName = nepaliMonthsEnglish[parseInt(selectedMonth) - 1] || "";
  const isDataLoading = loading || filesLoading || isEnsuring;
  const getFirstName = (name: string) => (name || "").split(" ")[0];

  const getBackupDeviceSummary = (rowFiles: FileRecord[]): string => {
    const photoDevs = [...new Set(rowFiles.filter(f => PHOTO_ROLES.includes(f.freelancer_type) && f.backup_1_device_name).map(f => f.backup_1_device_name))];
    const videoDevs = [...new Set(rowFiles.filter(f => VIDEO_ROLES.includes(f.freelancer_type) && f.backup_1_device_name).map(f => f.backup_1_device_name))];
    const parts: string[] = [];
    if (photoDevs.length) parts.push(`📷 ${photoDevs.join(", ")}`);
    if (videoDevs.length) parts.push(`🎬 ${videoDevs.join(", ")}`);
    return parts.join("  ·  ") || "—";
  };

  const getRemainingCount = (rf: FileRecord[]): number => rf.filter(f => !f.final_generated_path).length;
  const getStatusPill = (rf: FileRecord[], small = false) => {
    const cls = small ? "text-[10px]" : "text-xs";
    if (rf.length === 0) return <span className={cn(cls, "font-bold text-amber-600")}>NO FILES YET</span>;
    const remaining = getRemainingCount(rf);
    return remaining > 0
      ? <span className={cn(cls, "font-bold text-red-600")}>{remaining} REMAINING</span>
      : <span className={cn(cls, "font-bold text-green-600")}>ALL COPIED</span>;
  };

  const FileRowsTable = ({ fileRows }: { fileRows: FileRecord[] }) => {
    if (fileRows.length === 0) return <div className="px-4 py-3 text-xs text-muted-foreground">No file rows for this event</div>;
    const photoFiles = fileRows.filter(f => PHOTO_ROLES.includes(f.freelancer_type));
    const videoFiles = fileRows.filter(f => VIDEO_ROLES.includes(f.freelancer_type));
    const otherFiles = fileRows.filter(f => !PHOTO_ROLES.includes(f.freelancer_type) && !VIDEO_ROLES.includes(f.freelancer_type));

    const renderSection = (label: string, sectionFiles: FileRecord[], bgClass: string, headerBg: string) => {
      if (sectionFiles.length === 0) return null;
      return (
        <div className="mb-1">
          <div className={cn("px-3 py-1.5 font-bold text-sm uppercase tracking-wider", headerBg)}>{label} ({sectionFiles.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={cn("border-b text-xs", bgClass)}>
                  <th className="px-2 py-1.5 text-left font-bold">Role</th>
                  <th className="px-2 py-1.5 text-left font-bold">Name</th>
                  <th className="px-2 py-1.5 text-left font-bold">Side</th>
                  <th className="px-2 py-1.5 text-left font-bold">Card</th>
                  <th className="px-2 py-1.5 text-left font-bold">Format</th>
                  <th className="px-2 py-1.5 text-right font-bold">Size</th>
                  <th className="px-2 py-1.5 text-center font-bold">1st</th>
                  <th className="px-2 py-1.5 text-center font-bold">2nd</th>
                  <th className="px-2 py-1.5 text-center font-bold">3rd</th>
                  <th className="px-2 py-1.5 text-center font-bold">Cloud</th>
                  <th className="px-2 py-1.5 text-center font-bold">Link</th>
                  <th className="px-2 py-1.5 text-left font-bold">Copied By</th>
                  <th className="px-2 py-1.5 text-center font-bold">Confirm</th>
                  <th className="px-2 py-1.5 text-center font-bold">📝</th>
                  <th className="px-2 py-1.5 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sectionFiles.map((file) => (
                  <tr key={file.id} className={cn("border-b border-border/30 hover:bg-muted/30", bgClass)}>
                    <td className="px-2 py-1.5"><Badge variant="outline" className="text-[11px] px-1.5 font-bold">{file.freelancer_type}</Badge></td>
                    <td className="px-2 py-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-bold cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setFilterFreelancer(prev => prev === file.freelancer_name ? null : file.freelancer_name); }}>
                              {getFirstName(file.freelancer_name)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent><p className="font-bold">{file.freelancer_name}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-2 py-1.5 text-xs">{file.side === "BRIDE SIDE" ? "BRIDE" : file.side === "GROOM SIDE" ? "GROOM" : file.side || "-"}</td>
                    <td className="px-2 py-1.5 text-xs">Card {file.card_label || "1"}</td>
                    <td className="px-2 py-1.5 text-xs">{file.format_type || "-"}</td>
                    <td className="px-2 py-1.5 text-right text-xs">{file.size_gb ? `${file.size_gb}GB` : "-"}</td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.final_generated_path || ""} deviceName={file.backup_1_device_name || ""} file={file} backupNum={1} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.final_generated_path && <button onClick={() => openPathBuilder(file, 1)} className="hover:text-blue-500 text-muted-foreground"><PenLine className="w-3 h-3" /></button>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.backup_2_path || ""} deviceName={file.backup_2_device_name || ""} file={file} backupNum={2} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.backup_2_path && <button onClick={() => openPathBuilder(file, 2)} className="hover:text-blue-500 text-muted-foreground"><PenLine className="w-3 h-3" /></button>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <BackupPill path={file.backup_3_path || ""} deviceName={file.backup_3_device_name || ""} file={file} backupNum={3} onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)} />
                        {file.backup_3_path && <button onClick={() => openPathBuilder(file, 3)} className="hover:text-blue-500 text-muted-foreground"><PenLine className="w-3 h-3" /></button>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {file.drive_upload && file.drive_upload_path ? (
                        <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 font-bold rounded-md cursor-pointer" onClick={() => { setCloudFile(file); setCloudDialogOpen(true); }}>
                          {file.drive_upload_path}
                        </span>
                      ) : (
                        <button onClick={() => { setCloudFile(file); setCloudDialogOpen(true); }}><X className="w-4 h-4 text-red-500 mx-auto" /></button>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {file.drive_link
                        ? <a href={file.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-bold inline-flex items-center gap-0.5">OPEN<ExternalLink className="w-3 h-3" /></a>
                        : <X className="w-4 h-4 text-red-500 mx-auto" />}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-bold">{file.who_copied || "-"}</td>
                    <td className="px-2 py-1.5 text-center">
                      {!file.final_generated_path
                        ? <span className="text-[10px] text-muted-foreground">-</span>
                        : file.confirmed
                          ? <button onClick={() => { setReconfirmFile(file); setReconfirmOpen(true); }}><span className="text-[10px] font-black text-emerald-600">CONFIRMED</span></button>
                          : <button onClick={() => handleReconfirmClick(file)}><span className="text-[10px] font-black text-red-600">NOT CONFIRMED</span></button>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => openNotesDialog(file)}>
                        <PenLine className={cn("w-3.5 h-3.5 mx-auto", file.notes ? "text-blue-600" : "text-muted-foreground")} />
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2 font-bold" onClick={() => openPathBuilder(file)}>SET PATH</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div>
        {renderSection("PHOTOS", photoFiles, "bg-emerald-50/50 dark:bg-emerald-950/10", "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300")}
        {photoFiles.length > 0 && videoFiles.length > 0 && <div className="h-1 bg-border" />}
        {renderSection("VIDEOS", videoFiles, "bg-indigo-50/50 dark:bg-indigo-950/10", "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300")}
        {otherFiles.length > 0 && <div className="h-1 bg-border" />}
        {renderSection("OTHER", otherFiles, "bg-muted/30", "bg-muted text-muted-foreground")}
      </div>
    );
  };

  const MobileRow = ({ row, rowKey }: { row: AssignmentRow; rowKey: string }) => {
    const isExpanded = expandedRows.has(rowKey);
    const rowFiles = getFilesForRow(row);
    const dayColor = dayColorMap.get(row.eventDay) || "bg-white dark:bg-slate-900";
    return (
      <div className={cn("border rounded-lg overflow-hidden mb-2", isExpanded && "ring-1 ring-cyan-300")}>
        <button className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left", dayColor)} onClick={() => toggleExpand(rowKey)}>
          <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0" onClick={(e) => { e.stopPropagation(); setFilterDay(filterDay === row.eventDay ? null : row.eventDay); }}>{row.eventDay}</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{row.clientName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{getBackupDeviceSummary(rowFiles)}</p>
            <p className="text-xs font-bold truncate">{row.event}</p>
          </div>
          <span className="shrink-0">{getStatusPill(rowFiles, true)}</span>
          <Badge variant="outline" className="text-xs font-bold shrink-0">{rowFiles.length}</Badge>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="border-t bg-background"><FileRowsTable fileRows={rowFiles} /></div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 shrink-0" onClick={onClose}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <FolderOpen className="w-4 h-4" />
        </div>
        <h1 className="font-bold text-sm uppercase tracking-wide flex-1">File Management</h1>

        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[80px] h-8 text-xs bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-white/10 border-white/20 text-white"><SelectValue>{monthName}</SelectValue></SelectTrigger>
          <SelectContent>{nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>

        <div className="hidden md:flex items-center gap-3 text-xs text-white/80">
          <span>{stats.totalEvents} events</span><span>·</span>
          <span>{stats.totalFiles} files</span><span>·</span>
          <span>{stats.totalSizeGB} GB</span>
        </div>

        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs hidden md:flex" onClick={handleToggleExpandAll}>
          {allExpanded ? <><ChevronUp className="w-3 h-3 mr-1" />Collapse</> : <><ChevronDown className="w-3 h-3 mr-1" />Expand</>}
        </Button>

        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 shrink-0" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {(filterDay || filterClient || filterDevice || filterFreelancer) && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 shrink-0 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {filterDay && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterDay(null)}>Day: {filterDay} ✕</Badge>}
          {filterClient && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterClient(null)}>Client: {filterClient} ✕</Badge>}
          {filterDevice && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterDevice(null)}>Device: {filterDevice} ✕</Badge>}
          {filterFreelancer && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterFreelancer(null)}>Freelancer: {filterFreelancer} ✕</Badge>}
          <button className="text-xs text-muted-foreground hover:text-foreground ml-auto" onClick={() => { setFilterDay(null); setFilterClient(null); setFilterDevice(null); setFilterFreelancer(null); }}>Clear all</button>
        </div>
      )}

      {isDataLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          {isEnsuring && <span className="ml-3 text-sm text-muted-foreground">Preparing file rows...</span>}
        </div>
      )}

      {!isDataLoading && filteredRows.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <FolderOpen className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">No events for {monthName} {selectedYear}</p>
        </div>
      )}

      {!isDataLoading && filteredRows.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {isMobile ? (
            <div className="p-3 space-y-0">
              {filteredRows.map(row => {
                const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
                return <MobileRow key={rowKey} row={row} rowKey={rowKey} />;
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-cyan-50/50 dark:bg-cyan-950/20 sticky top-0 z-10">
                  <TableHead className="w-10 text-xs"></TableHead>
                  <TableHead className="w-14 text-xs text-center">Day</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">1st Backup Devices</TableHead>
                  <TableHead className="text-xs">Event</TableHead>
                  <TableHead className="text-xs w-36 text-center">Status</TableHead>
                  <TableHead className="text-xs w-12 text-center">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(row => {
                  const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const rowFiles = getFilesForRow(row);
                  const dayColor = dayColorMap.get(row.eventDay) || "bg-white dark:bg-slate-900";
                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow className={cn("cursor-pointer transition-colors font-bold", dayColor, isExpanded && "ring-1 ring-cyan-300")} onClick={() => toggleExpand(rowKey)}>
                        <TableCell className="py-1.5 px-2">{isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-cyan-600" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}</TableCell>
                        <TableCell className="py-1.5 text-center">
                          <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold mx-auto cursor-pointer hover:bg-cyan-700" onClick={(e) => { e.stopPropagation(); setFilterDay(filterDay === row.eventDay ? null : row.eventDay); }}>{row.eventDay}</div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="font-bold text-sm cursor-pointer hover:text-cyan-600" onClick={(e) => { e.stopPropagation(); navigate(`/company/files/client/${encodeURIComponent(row.registeredDateTimeAD)}`); }}>{row.clientName}</span>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">{getBackupDeviceSummary(rowFiles)}</TableCell>
                        <TableCell className="py-1.5 text-sm font-bold">{row.event}</TableCell>
                        <TableCell className="py-1.5 text-center">{getStatusPill(rowFiles)}</TableCell>
                        <TableCell className="py-1.5 text-center"><Badge variant="outline" className="text-xs font-bold">{rowFiles.length}</Badge></TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0 bg-muted/20">
                            <div className="border-l-2 border-cyan-400 ml-6"><FileRowsTable fileRows={rowFiles} /></div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <ReconfirmationDialog
        open={reconfirmOpen}
        onOpenChange={setReconfirmOpen}
        file={reconfirmFile}
        onConfirm={handleConfirmFile}
        alreadyConfirmed={reconfirmFile?.confirmed === true}
      />

      <FilePathBuilderDialog
        open={pathDialogOpen}
        onOpenChange={setPathDialogOpen}
        fileRecord={selectedFile}
        devices={devices}
        onSave={async (updates) => { if (selectedFile) await update(selectedFile.id, { ...updates, synced_to_sheet: false }); }}
        allFiles={files}
        onRefresh={refresh}
        initialBackupNumber={editBackupNumber ?? undefined}
      />

      <CloudUploadDialog
        open={cloudDialogOpen}
        onOpenChange={setCloudDialogOpen}
        fileRecord={cloudFile}
        devices={devices}
        onSave={async (id, updates) => { await update(id, updates); }}
      />

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Notes — {notesFile?.freelancer_name}</DialogTitle>
          </DialogHeader>
          <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Write notes about this file entry..." className="min-h-[100px] text-sm" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveNotes} className="font-bold">Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
