import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFilesDashboardData, type FilterMode } from "@/hooks/useFilesDashboardData";
import { FileRecord } from "@/lib/files-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, RefreshCw, CheckCircle, Clock, AlertTriangle, HardDrive,
  TrendingUp, Activity, Info, ShieldAlert, ShieldCheck, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";

interface CardDef { key: string; filterMode: FilterMode; label: string; icon: React.ElementType; color: string; glowColor: string; }

const STATUS_CARDS: CardDef[] = [
  { key: "today", filterMode: "today", label: "Today's Transfers", icon: CheckCircle, color: "hsl(145,65%,38%)", glowColor: "hsl(145,65%,42%/0.12)" },
  { key: "copied", filterMode: "copied", label: "Total Copied", icon: HardDrive, color: "hsl(210,90%,50%)", glowColor: "hsl(210,90%,55%/0.12)" },
  { key: "pending", filterMode: "pending", label: "Files Pending", icon: Clock, color: "hsl(0,75%,55%)", glowColor: "hsl(0,84%,60%/0.12)" },
  { key: "backup", filterMode: "backup_done", label: "Double Backup", icon: AlertTriangle, color: "hsl(35,90%,45%)", glowColor: "hsl(40,95%,50%/0.12)" },
];

const toTB = (gb: number): string => gb >= 1024 ? `${(gb / 1024).toFixed(2)} TB` : `${gb.toFixed(1)} GB`;

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export function FilesDashboard() {
  const navigate = useNavigate();
  const { files, stats, activityFeed, insights, isLoading, search, setSearch, filterMode, setFilterMode, lastUpdated, refresh } = useFilesDashboardData();

  const navigateToClient = (f: FileRecord) => {
    navigate(`/company/files/client/${encodeURIComponent(f.registered_date_time_ad)}`);
  };

  // Only files that have actually been copied; sort by most recent backup_1_recorded_at; take last 5
  const recentCopiedFiles = useMemo(() => {
    return [...files]
      .filter((f) => !!f.backup_1_recorded_at && !!f.final_generated_path)
      .sort((a, b) => new Date(b.backup_1_recorded_at!).getTime() - new Date(a.backup_1_recorded_at!).getTime())
      .slice(0, 5);
  }, [files]);

  const handleCardClick = (card: CardDef) => {
    if (card.key === "backup") {
      if (filterMode === "backup_done") setFilterMode("backup_remaining");
      else if (filterMode === "backup_remaining") setFilterMode("all");
      else setFilterMode("backup_done");
    } else {
      setFilterMode(filterMode === card.filterMode ? "all" : card.filterMode);
    }
  };

  const getCardDisplay = (key: string) => {
    switch (key) {
      case "today": return { primary: String(stats.todayCopied), secondary: toTB(stats.todayCopiedGB), photoInfo: `📷 ${toTB(stats.todayPhotoGB)}`, videoInfo: `🎬 ${toTB(stats.todayVideoGB)}` };
      case "copied": return { primary: String(stats.totalCopied), secondary: toTB(stats.totalCopiedGB), photoInfo: `📷 ${toTB(stats.totalPhotoGB)}`, videoInfo: `🎬 ${toTB(stats.totalVideoGB)}` };
      case "pending": return { primary: String(stats.filesPending), secondary: undefined as string | undefined, photoInfo: `📷 ${stats.pendingPhotoCount}`, videoInfo: `🎬 ${stats.pendingVideoCount}` };
      case "backup": return { primary: `${stats.doubleBackupDone} Done`, secondary: `${stats.doubleBackupRemaining} Left`, photoInfo: `📷 ${toTB(stats.backupDonePhotoGB)}`, videoInfo: `🎬 ${toTB(stats.backupDoneVideoGB)}` };
      default: return { primary: "0", secondary: undefined as string | undefined, photoInfo: undefined as string | undefined, videoInfo: undefined as string | undefined };
    }
  };

  return (
    <div className="files-dashboard space-y-5 animate-fade-in">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search client, event, freelancer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_CARDS.map((card) => {
          const isCardActive = card.key === "backup"
            ? filterMode === "backup_done" || filterMode === "backup_remaining"
            : filterMode === card.filterMode;
          const display = getCardDisplay(card.key);
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              onClick={() => handleCardClick(card)}
              className={cn(
                "cursor-pointer border bg-card transition-all duration-300 hover:shadow-md",
                isCardActive && "ring-2"
              )}
              style={{ boxShadow: isCardActive ? `0 0 0 2px ${card.color}` : undefined, borderColor: isCardActive ? card.color : undefined }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: card.glowColor }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: card.color }}>{card.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-black text-foreground tabular-nums leading-tight">{display.primary}</p>
                    {display.secondary && <p className="text-xs font-medium text-muted-foreground">{display.secondary}</p>}
                  </div>
                  {(display.photoInfo || display.videoInfo) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {display.photoInfo && <span className="text-[10px] font-semibold text-muted-foreground">{display.photoInfo}</span>}
                      {display.videoInfo && <span className="text-[10px] font-semibold text-muted-foreground">{display.videoInfo}</span>}
                    </div>
                  )}
                </div>
                <TrendingUp className="w-4 h-4" style={{ color: card.color, opacity: 0.4 }} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity + Insights — above file tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border bg-card">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[hsl(175,60%,40%)]" />
              Recent Activity
            </h3>
          </div>
          <ScrollArea className="max-h-[220px] px-4 pb-4">
            <div className="space-y-1.5">
              {activityFeed.map(a => (
                <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(145,65%,42%)] mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground"><span className="font-semibold">{a.clientName}</span> <span className="text-muted-foreground">— {a.action}</span></p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(a.timestamp)}</p>
                  </div>
                </div>
              ))}
              {activityFeed.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No recent activity</p>}
            </div>
          </ScrollArea>
        </Card>

        <Card className="border bg-card">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-[hsl(270,60%,55%)]" />
              Insights
            </h3>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {insights.map((item, i) => {
              const Icon = item.type === "warning" ? ShieldAlert : item.type === "success" ? ShieldCheck : Info;
              const colors = {
                warning: { bg: "hsl(40,95%,50%/0.1)", text: "hsl(35,90%,40%)", icon: "hsl(35,90%,45%)" },
                success: { bg: "hsl(145,65%,42%/0.1)", text: "hsl(145,65%,32%)", icon: "hsl(145,65%,38%)" },
                info: { bg: "hsl(210,90%,55%/0.1)", text: "hsl(210,90%,40%)", icon: "hsl(210,90%,50%)" },
              }[item.type];
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: colors.bg }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: colors.icon }} />
                  <p className="text-xs font-medium" style={{ color: colors.text }}>{item.message}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* File Tracking — last 5 recently copied */}
      <Card className="border bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-[hsl(210,90%,50%)]" />
            Recent File Tracking
            {filterMode !== "all" && <Badge variant="secondary" className="text-[10px]">{filterMode.replace("_", " ")}</Badge>}
          </h3>
          <span className="text-[10px] text-muted-foreground">Last {recentCopiedFiles.length} copies</span>
        </div>
        <ScrollArea className="max-h-[320px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {["Client", "Event", "Date", "Freelancer", "Role", "Card", "Copy", "Backup", "Size", "Storage", "Updated"].map(h => (
                  <TableHead key={h} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-2">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCopiedFiles.map(f => {
                const copied = !!f.final_generated_path;
                const hasB2 = !!f.backup_2_path;
                const nepaliDate = f.event_month && f.event_year
                  ? `${nepaliMonthsEnglish[parseInt(f.event_month) - 1] || f.event_month} ${f.event_day || ""}, ${f.event_year}`
                  : "-";
                return (
                  <TableRow key={f.id} className="cursor-pointer border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs font-medium text-primary max-w-[120px] truncate hover:underline" onClick={() => navigateToClient(f)}>{f.client_name || "-"}</TableCell>
                    <TableCell className="text-xs text-foreground/80 max-w-[100px] truncate">{f.event_name || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{nepaliDate}</TableCell>
                    <TableCell className="text-xs text-foreground/80 max-w-[90px] truncate">{f.freelancer_name || "-"}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground uppercase">{f.freelancer_type || "-"}</TableCell>
                    <TableCell className="text-xs text-foreground/80">{f.card_label || "-"}</TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", copied ? "bg-[hsl(145,65%,42%/0.15)] text-[hsl(145,65%,32%)]" : "bg-[hsl(0,84%,60%/0.15)] text-[hsl(0,75%,45%)]")}>
                        {copied ? "DONE" : "PENDING"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", hasB2 ? "bg-[hsl(145,65%,42%/0.15)] text-[hsl(145,65%,32%)]" : "bg-[hsl(40,95%,50%/0.15)] text-[hsl(35,90%,40%)]")}>
                        {hasB2 ? "DOUBLE" : "SINGLE"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/80 tabular-nums">{Number(f.size_gb) || 0} GB</TableCell>
                    <TableCell className="text-xs text-foreground/80 max-w-[80px] truncate">{f.backup_1_device_name || "-"}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(f.backup_1_recorded_at || f.updated_at)}</TableCell>
                  </TableRow>
                );
              })}
              {recentCopiedFiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                    {isLoading ? "Loading..." : "No recent copies yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
