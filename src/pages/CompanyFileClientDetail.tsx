import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { FileRecord } from "@/lib/files-api";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowLeft, Clock, HardDrive, FileText, Camera, Video } from "lucide-react";

function formatNepaliDate(year?: string, month?: string, day?: string): string {
  if (!year || !month) return "-";
  const mIdx = parseInt(String(month));
  const mName = mIdx >= 1 && mIdx <= 12 ? nepaliMonthsEnglish[mIdx - 1] : month;
  return `${mName} ${day || "?"}, ${year}`;
}

const PHOTO_ROLES = new Set(["PB", "PG", "EP"]);
const VIDEO_ROLES = new Set(["VB", "VG", "EV", "DRONE", "FPV", "IPHONE"]);

const toTB = (gb: number) => gb >= 1024 ? `${(gb / 1024).toFixed(2)} TB` : `${gb.toFixed(1)} GB`;

async function fetchClientFiles(registeredDateTimeAD: string): Promise<FileRecord[]> {
  const { data: fileRows, error } = await (supabase as any)
    .from("files_management").select("*")
    .eq("registered_date_time_ad", registeredDateTimeAD)
    .eq("deleted_or_not", false).order("event_name");
  if (error) throw error;
  return ((fileRows as FileRecord[]) || []).filter(r => !r.event_date_ad?.includes('**'));
}

export default function CompanyFileClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack('/company/files');
  const registeredDateTimeAD = decodeURIComponent(clientId || "");
  const qc = useQueryClient();

  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);

  const clientKey = ["files", "client", registeredDateTimeAD] as const;
  const { data: files = [], isLoading: queryLoading } = useQuery({
    queryKey: clientKey,
    queryFn: () => fetchClientFiles(registeredDateTimeAD),
    enabled: !!registeredDateTimeAD,
    staleTime: 30_000,
    meta: { persist: true },
  });
  const isLoading = queryLoading && files.length === 0;
  const clientName = files[0]?.client_name || "";

  // Realtime: keep this client's cache in sync with edits from anywhere.
  useEffect(() => {
    if (!registeredDateTimeAD) return;
    const channel = (supabase as any)
      .channel(`files_client_${registeredDateTimeAD}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "files_management" }, (payload: any) => {
        const newRow = payload.new as FileRecord | undefined;
        const oldRow = payload.old as { id?: string; registered_date_time_ad?: string } | undefined;
        const eventType = payload.eventType as string;
        const matches = (r?: { registered_date_time_ad?: string } | null) =>
          r?.registered_date_time_ad === registeredDateTimeAD;
        if (!matches(newRow) && !matches(oldRow)) return;

        qc.setQueryData<FileRecord[]>(clientKey, (prev) => {
          const list = prev ?? [];
          if (eventType === "INSERT" && newRow) {
            if (newRow.deleted_or_not) return list;
            return list.some(f => f.id === newRow.id) ? list : [...list, newRow];
          }
          if (eventType === "UPDATE" && newRow) {
            if (newRow.deleted_or_not) return list.filter(f => f.id !== newRow.id);
            return list.some(f => f.id === newRow.id)
              ? list.map(f => f.id === newRow.id ? { ...f, ...newRow } : f)
              : [...list, newRow];
          }
          if (eventType === "DELETE" && oldRow?.id) {
            return list.filter(f => f.id !== oldRow.id);
          }
          return list;
        });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [registeredDateTimeAD, qc]);

  const stats = useMemo(() => {
    const isPhotoRole = (f: FileRecord) => PHOTO_ROLES.has((f.freelancer_type || "").toUpperCase());
    const isVideoRole = (f: FileRecord) => VIDEO_ROLES.has((f.freelancer_type || "").toUpperCase());
    const gb = (f: FileRecord) => Number(f.size_gb) || 0;
    const sumGB = (arr: FileRecord[]) => arr.reduce((s, f) => s + gb(f), 0);
    return {
      totalSize: sumGB(files),
      remaining: files.filter(f => !f.final_generated_path).length,
      photoSize: sumGB(files.filter(isPhotoRole)),
      videoSize: sumGB(files.filter(isVideoRole)),
      remainingPhoto: files.filter(f => !f.final_generated_path && isPhotoRole(f)).length,
      remainingVideo: files.filter(f => !f.final_generated_path && isVideoRole(f)).length,
    };
  }, [files]);

  const eventGroups = useMemo(() => {
    const source = showOnlyRemaining ? files.filter(f => !f.final_generated_path) : files;
    const map = new Map<string, { eventName: string; year: string; month: string; day: string; files: FileRecord[] }>();
    for (const f of source) {
      const key = `${f.event_name}__${f.event_date_ad}`;
      if (!map.has(key)) {
        map.set(key, { eventName: f.event_name, year: f.event_year, month: f.event_month, day: f.event_day, files: [] });
      }
      map.get(key)!.files.push(f);
    }
    return Array.from(map.values());
  }, [files, showOnlyRemaining]);

  const summaryCards = [
    { label: "Total Size", value: toTB(stats.totalSize), sub: `${files.length} total files`, icon: HardDrive, colorClass: "text-blue-600", bgClass: "bg-blue-100", onClick: undefined as (() => void) | undefined },
    { label: "Photo Size", value: toTB(stats.photoSize), sub: `Photo files`, icon: Camera, colorClass: "text-purple-600", bgClass: "bg-purple-100", onClick: undefined },
    { label: "Video Size", value: toTB(stats.videoSize), sub: `Video files`, icon: Video, colorClass: "text-amber-600", bgClass: "bg-amber-100", onClick: undefined },
    { label: "Remaining", value: String(stats.remaining), sub: showOnlyRemaining ? "Showing filtered" : "files to copy", icon: Clock, colorClass: "text-red-600", bgClass: "bg-red-100", onClick: () => setShowOnlyRemaining(p => !p) },
  ];

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 max-w-[1400px] mx-auto">
          <Button variant="ghost" size="icon" onClick={goBack} className="text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground truncate">{clientName || "Client"}</h1>
            <p className="text-sm text-muted-foreground">File Management Detail</p>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryCards.map((c, i) => (
                <Card key={i}
                  className={cn("border-border bg-card transition-all", c.onClick && "cursor-pointer hover:border-primary/40 hover:shadow-md",
                    c.label === "Remaining" && showOnlyRemaining && "ring-2 ring-red-500/50 border-red-500/40")}
                  onClick={c.onClick}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl shrink-0", c.bgClass)}>
                      <c.icon className={cn("w-6 h-6", c.colorClass)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs uppercase tracking-wider font-semibold mb-1", c.colorClass)}>{c.label}</p>
                      <p className="text-2xl font-black tabular-nums leading-tight text-foreground">{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {eventGroups.map((group, gi) => (
              <div key={gi} className="space-y-3">
                <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-2.5 rounded-r-lg flex flex-wrap items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <h3 className="text-base font-bold text-foreground">{group.eventName || "Event"}</h3>
                  <Badge variant="secondary" className="text-xs px-3 py-1">
                    {formatNepaliDate(group.year, group.month, group.day)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{group.files.length} files</span>
                </div>

                <Card className="border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground text-xs">Name</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Type</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Side</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Format</TableHead>
                          <TableHead className="text-muted-foreground text-xs text-right">Size</TableHead>
                          <TableHead className="text-muted-foreground text-xs text-center">Copy</TableHead>
                          <TableHead className="text-muted-foreground text-xs text-center">Backup</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Path</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.files.map(f => {
                          const copied = !!f.final_generated_path;
                          const hasB2 = !!f.backup_2_path;
                          return (
                            <TableRow key={f.id} className="border-border/60 hover:bg-muted/40">
                              <TableCell className="py-3"><span className="text-sm font-semibold text-foreground">{f.freelancer_name || "-"}</span></TableCell>
                              <TableCell className="py-3"><span className="text-xs text-foreground/80">{f.freelancer_type || "-"}</span></TableCell>
                              <TableCell className="py-3"><span className="text-xs text-foreground/80">{f.side || "-"}</span></TableCell>
                              <TableCell className="py-3"><span className="text-xs text-foreground/80">{f.format_type || "-"}</span></TableCell>
                              <TableCell className="py-3 text-right"><span className="text-sm text-foreground tabular-nums">{f.size_gb || 0}</span></TableCell>
                              <TableCell className="py-3 text-center">
                                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", copied ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                  {copied ? "DONE" : "PENDING"}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", hasB2 ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700")}>
                                  {hasB2 ? "DOUBLE" : "SINGLE"}
                                </span>
                              </TableCell>
                              <TableCell className="py-3"><span className="text-xs text-foreground/80 font-mono break-all">{f.final_generated_path || "—"}</span></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            ))}

            {files.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-semibold text-foreground mb-1">No file records found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
