import { useState, useMemo } from "react";
import { FolderOpen, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFilesManagement } from "@/hooks/useFilesManagement";
import { useStorageDevices } from "@/hooks/useStorageDevices";
import { FilePathBuilderDialog } from "./FilePathBuilderDialog";
import { FileRecord, FileMonthData, getNextCardLabel } from "@/lib/files-api";
import { cn } from "@/lib/utils";

interface Props {
  selectedMonth: { year: string; month: string } | null;
  availableMonths: FileMonthData[];
  onMonthChange: (month: { year: string; month: string }) => void;
}

export function FilesManagementTable({ selectedMonth, availableMonths, onMonthChange }: Props) {
  const { files, isLoading, isEnsuring, update, refresh } = useFilesManagement(selectedMonth);
  const { devices } = useStorageDevices();

  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [editBackupNumber, setEditBackupNumber] = useState<number | undefined>(undefined);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [showAllMonths, setShowAllMonths] = useState(false);

  const clientGroups = useMemo(() => {
    const map = new Map<string, Map<string, FileRecord[]>>();
    for (const f of files) {
      const cName = f.client_name || "Unknown";
      if (!map.has(cName)) map.set(cName, new Map());
      const eventKey = `${f.event_name}||${f.event_date_ad}`;
      const eventMap = map.get(cName)!;
      if (!eventMap.has(eventKey)) eventMap.set(eventKey, []);
      eventMap.get(eventKey)!.push(f);
    }
    const groups: { clientName: string; events: { eventName: string; eventDateAD: string; eventDay: string; files: FileRecord[] }[]; totalFiles: number }[] = [];
    for (const [clientName, eventMap] of map) {
      const events: any[] = [];
      for (const [key, fileList] of eventMap) {
        const [eventName, eventDateAD] = key.split("||");
        events.push({ eventName, eventDateAD: eventDateAD || "", eventDay: fileList[0]?.event_day || "", files: fileList });
      }
      events.sort((a, b) => (a.eventDateAD || "").localeCompare(b.eventDateAD || ""));
      groups.push({ clientName, events, totalFiles: events.reduce((s, e) => s + e.files.length, 0) });
    }
    groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
    return groups;
  }, [files]);

  const toggleClient = (name: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    await update(id, { [field]: value, synced_to_sheet: false });
  };

  const handleFormatChange = async (file: FileRecord, newFormat: string) => {
    const nextLabel = await getNextCardLabel(file.client_name, file.freelancer_name, newFormat);
    await update(file.id, { format_type: newFormat, card_label: nextLabel, synced_to_sheet: false });
  };

  const openPathBuilder = (file: FileRecord, backupNum?: number) => {
    setSelectedFile(file);
    setEditBackupNumber(backupNum);
    setPathDialogOpen(true);
  };

  const visibleMonths = showAllMonths ? availableMonths : availableMonths.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {visibleMonths.map((m) => (
          <button
            key={m.value}
            onClick={() => onMonthChange({ year: m.year, month: m.month })}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              selectedMonth && selectedMonth.year === m.year && selectedMonth.month === m.month
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
            )}
          >
            {m.label}
          </button>
        ))}
        {availableMonths.length > 6 && (
          <button onClick={() => setShowAllMonths(!showAllMonths)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            {showAllMonths ? "Show Less" : `See More (${availableMonths.length - 6})`}
          </button>
        )}
      </div>

      {(isLoading || isEnsuring) && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          {isEnsuring && <span className="ml-3 text-sm text-muted-foreground">Preparing file rows...</span>}
        </div>
      )}

      {!isLoading && !isEnsuring && !selectedMonth && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Select a month to view files</p>
        </div>
      )}

      {!isLoading && !isEnsuring && selectedMonth && clientGroups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No files for this month</p>
        </div>
      )}

      {!isLoading && !isEnsuring && clientGroups.map((group) => {
        const isOpen = expandedClients.has(group.clientName);
        return (
          <Collapsible key={group.clientName} open={isOpen} onOpenChange={() => toggleClient(group.clientName)}>
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-pointer",
                isOpen ? "bg-primary/10 border-primary/30" : "bg-card hover:bg-muted/50 border-border"
              )}>
                {isOpen ? <ChevronDown className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="font-semibold text-sm text-foreground flex-1 text-left">{group.clientName}</span>
                <Badge variant="secondary" className="text-[10px]">{group.events.length} event{group.events.length !== 1 ? "s" : ""}</Badge>
                <Badge variant="outline" className="text-[10px]">{group.totalFiles} file{group.totalFiles !== 1 ? "s" : ""}</Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 mt-2 space-y-3 mb-4">
                {group.events.map((ev, ei) => (
                  <div key={`${ev.eventName}-${ei}`} className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
                      <span className="font-medium text-xs text-foreground">{ev.eventName}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{ev.eventDateAD}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-[10px] w-16">Crew</TableHead>
                            <TableHead className="text-[10px]">Freelancer</TableHead>
                            <TableHead className="text-[10px] w-20">Side</TableHead>
                            <TableHead className="text-[10px] w-16">Card</TableHead>
                            <TableHead className="text-[10px] w-16">Size</TableHead>
                            <TableHead className="text-[10px] w-20">Format</TableHead>
                            <TableHead className="text-[10px] w-20">Copied By</TableHead>
                            <TableHead className="text-[10px] text-center w-8">2x</TableHead>
                            <TableHead className="text-[10px] text-center w-8">3x</TableHead>
                            <TableHead className="text-[10px]">Path</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ev.files.map((file) => (
                            <TableRow key={file.id} className="text-xs">
                              <TableCell><Badge variant="outline" className="text-[10px] px-1.5">{file.freelancer_type}</Badge></TableCell>
                              <TableCell className="font-medium text-xs">{file.freelancer_name}</TableCell>
                              <TableCell>
                                <Select value={file.side || ""} onValueChange={(v) => handleInlineUpdate(file.id, "side", v)}>
                                  <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="BRIDE SIDE">BRIDE</SelectItem>
                                    <SelectItem value="GROOM SIDE">GROOM</SelectItem>
                                    <SelectItem value="OTHER">OTHER</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input className="h-6 text-[10px] w-14 border-0 bg-transparent p-0.5" defaultValue={file.card_label}
                                  onBlur={(e) => { if (e.target.value !== file.card_label) handleInlineUpdate(file.id, "card_label", e.target.value); }} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" className="h-6 text-[10px] w-14 border-0 bg-transparent p-0.5" defaultValue={file.size_gb || ""}
                                  onBlur={(e) => { const v = Number(e.target.value); if (v !== file.size_gb) handleInlineUpdate(file.id, "size_gb", v); }} />
                              </TableCell>
                              <TableCell>
                                <Select value={file.format_type || ""} onValueChange={(v) => handleFormatChange(file, v)}>
                                  <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent>
                                    {["RAW_ONLY", "JPEG_ONLY", "RAW_JPEG", "CF", "NORMAL", "CF_NORMAL"].map((f) => (
                                      <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input className="h-6 text-[10px] w-16 border-0 bg-transparent p-0.5" defaultValue={file.who_copied}
                                  onBlur={(e) => { if (e.target.value !== file.who_copied) handleInlineUpdate(file.id, "who_copied", e.target.value); }} />
                              </TableCell>
                              <TableCell className="text-center text-[10px]">{file.double_backup ? "✓" : "-"}</TableCell>
                              <TableCell className="text-center text-[10px]">{file.triple_backup ? "✓" : "-"}</TableCell>
                              <TableCell>
                                <button onClick={() => openPathBuilder(file)}
                                  className={cn("text-[10px] truncate max-w-[180px] text-left hover:text-primary transition-colors block",
                                    file.final_generated_path ? "text-foreground underline decoration-dotted" : "text-muted-foreground italic"
                                  )}>
                                  {file.final_generated_path || "Set path..."}
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      <FilePathBuilderDialog
        open={pathDialogOpen}
        onOpenChange={setPathDialogOpen}
        fileRecord={selectedFile}
        devices={devices}
        initialBackupNumber={editBackupNumber}
        onSave={async (updates) => {
          if (selectedFile) await update(selectedFile.id, { ...updates, synced_to_sheet: false });
        }}
        onRefresh={async () => { await refresh(); }}
      />
    </div>
  );
}
