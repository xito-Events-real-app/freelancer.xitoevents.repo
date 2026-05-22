import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileManagementSidebar } from "@/components/company/files/FileManagementSidebar";
import { StorageDevicesSection } from "@/components/company/files/StorageDevicesSection";
import { FilesDashboard } from "@/components/company/files/FilesDashboard";
import { FullScreenFilesTable } from "@/components/company/files/FullScreenFilesTable";
import { FileReminderPopup } from "@/components/company/files/FileReminderPopup";
import { Button } from "@/components/ui/button";
import {
  FileText, HardDrive, FolderOpen, Database, BarChart3,
  ChevronLeft, Plus, Monitor, Disc, Cloud,
} from "lucide-react";
import { getAvailableFileMonths, FileMonthData } from "@/lib/files-api";
import { getCurrentBSDate } from "@/lib/nepaliCalendar";

type ActiveSection = "dashboard" | "storage" | "files";

const SECTIONS: { key: ActiveSection; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "storage", label: "Storage", icon: HardDrive },
  { key: "files", label: "Files", icon: FileText },
];

const DEVICE_TYPES: { key: string | null; label: string; icon: React.ElementType }[] = [
  { key: null, label: "All", icon: Database },
  { key: "HARD_DRIVE", label: "HDD", icon: HardDrive },
  { key: "SSD", label: "SSD", icon: Disc },
  { key: "PC", label: "PC", icon: Monitor },
  { key: "CLOUD", label: "Cloud", icon: Cloud },
];

export default function CompanyFileManagement() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const goBack = useSmartBack('/company');
  const [searchParams] = useSearchParams();
  const initialSection = (searchParams.get("section") as ActiveSection) || "dashboard";
  const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string | null>(null);
  const [addDeviceDrawerOpen, setAddDeviceDrawerOpen] = useState(false);

  const [availableMonths, setAvailableMonths] = useState<FileMonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<{ year: string; month: string } | null>(() => {
    // Default to the current BS month so the user always lands somewhere instead of a blank screen.
    const bs = getCurrentBSDate();
    return { year: String(bs.year), month: String(bs.month) };
  });

  useEffect(() => {
    getAvailableFileMonths().then((months) => {
      setAvailableMonths(months);
    }).catch(() => {});
  }, []);

  const handleAddDevice = useCallback(() => {
    setActiveSection("storage");
    setAddDeviceDrawerOpen(true);
  }, []);

  // ─── Mobile Layout ───
  if (isMobile) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <header className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={goBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base text-foreground truncate">File Management</h1>
            <p className="text-[10px] text-muted-foreground">Storage & file tracking</p>
          </div>
        </header>

        <div className="sticky top-[57px] z-30 bg-background border-b px-4 py-2 flex gap-2 overflow-x-auto">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeSection === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {activeSection === "storage" && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b bg-background">
            {DEVICE_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setDeviceTypeFilter(key)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  deviceTypeFilter === key ? "bg-cyan-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        <main className="p-4">
          {activeSection === "dashboard" && (
            <div className="files-dashboard rounded-xl bg-background p-4">
              <FilesDashboard />
            </div>
          )}

          {activeSection === "storage" && (
            <StorageDevicesSection
              deviceTypeFilter={deviceTypeFilter}
              drawerOpen={addDeviceDrawerOpen}
              onDrawerOpenChange={setAddDeviceDrawerOpen}
            />
          )}

          {activeSection === "files" && (
            <FullScreenFilesTable
              onClose={() => setActiveSection("dashboard")}
              selectedMonthFilter={selectedMonth}
              onMonthFilterChange={setSelectedMonth}
            />
          )}
        </main>

        {activeSection === "storage" && (
          <button
            onClick={handleAddDevice}
            className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        <FileReminderPopup />
      </div>
    );
  }

  // ─── Desktop Layout ───
  return (
    <div className="min-h-screen bg-muted/30">
      <FileManagementSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        deviceTypeFilter={deviceTypeFilter}
        onDeviceTypeFilter={setDeviceTypeFilter}
        onAddDevice={handleAddDevice}
        selectedMonth={selectedMonth}
        onMonthFilter={setSelectedMonth}
        availableMonths={availableMonths}
      />

      <div className="ml-64 min-h-screen transition-all duration-300">
        <header className="h-14 flex items-center px-6 border-b bg-background">
          <div className="flex items-center gap-2">
            {activeSection === "dashboard" && <BarChart3 className="w-5 h-5 text-muted-foreground" />}
            {activeSection === "storage" && <HardDrive className="w-5 h-5 text-muted-foreground" />}
            {activeSection === "files" && <FileText className="w-5 h-5 text-muted-foreground" />}
            <h2 className="text-lg font-bold text-foreground">
              {activeSection === "dashboard" && "Dashboard"}
              {activeSection === "storage" && "Storage Devices"}
              {activeSection === "files" && "Files Management"}
            </h2>
          </div>
        </header>

        <main className="p-6">
          {activeSection === "dashboard" && (
            <div className="files-dashboard rounded-xl bg-background p-6">
              <FilesDashboard />
            </div>
          )}

          {activeSection === "storage" && (
            <StorageDevicesSection
              deviceTypeFilter={deviceTypeFilter}
              drawerOpen={addDeviceDrawerOpen}
              onDrawerOpenChange={setAddDeviceDrawerOpen}
            />
          )}

          {activeSection === "files" && (
            <FullScreenFilesTable
              onClose={() => setActiveSection("dashboard")}
              selectedMonthFilter={selectedMonth}
              onMonthFilterChange={setSelectedMonth}
            />
          )}
        </main>
      </div>

      <FileReminderPopup />
    </div>
  );
}
