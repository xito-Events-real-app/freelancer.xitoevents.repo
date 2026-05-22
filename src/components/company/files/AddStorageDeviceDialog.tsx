import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StorageDevice } from "@/lib/files-api";
import { toast } from "@/hooks/use-toast";
import { HardDrive, Cloud } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDevice: StorageDevice | null;
  onSave: (data: Partial<StorageDevice>) => Promise<void>;
}

export function AddStorageDeviceDialog({ open, onOpenChange, editDevice, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [totalUnit, setTotalUnit] = useState<"TB" | "GB">("TB");
  const [usedUnit, setUsedUnit] = useState<"TB" | "GB">("TB");
  const [form, setForm] = useState({
    device_type: "HARD_DRIVE",
    device_name: "",
    pc_drive_letter: "",
    total_storage: "",
    used_storage: "",
    health_percent: "100",
    safety_status: "SAFE",
    speed_rating: "3",
    purchase_date_ad: "",
    price_npr: "",
    purchased_from: "",
    cloud_type: "",
    expiry_date_ad: "",
  });

  const isCloud = form.device_type === "CLOUD";
  const isPC = form.device_type === "PC";

  useEffect(() => {
    if (editDevice) {
      setForm({
        device_type: editDevice.device_type,
        device_name: editDevice.device_name,
        pc_drive_letter: editDevice.pc_drive_letter || "",
        total_storage: String(editDevice.total_storage_gb / 1024),
        used_storage: String((editDevice.used_storage_gb || 0) / 1024),
        health_percent: String(editDevice.health_percent),
        safety_status: editDevice.safety_status === "SAFE" ? "SAFE" : "RISKY",
        speed_rating: String(editDevice.speed_rating),
        purchase_date_ad: editDevice.purchase_date_ad || "",
        price_npr: String(editDevice.price_npr || ""),
        purchased_from: editDevice.purchased_from || "",
        cloud_type: editDevice.cloud_type || "",
        expiry_date_ad: editDevice.expiry_date_ad || "",
      });
      setTotalUnit("TB");
      setUsedUnit("TB");
    } else {
      setForm({
        device_type: "HARD_DRIVE",
        device_name: "",
        pc_drive_letter: "",
        total_storage: "",
        used_storage: "",
        health_percent: "100",
        safety_status: "SAFE",
        speed_rating: "3",
        purchase_date_ad: "",
        price_npr: "",
        purchased_from: "",
        cloud_type: "",
        expiry_date_ad: "",
      });
    }
  }, [editDevice, open]);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.device_name.trim()) {
      toast({ title: isCloud ? "Cloud name required" : "Device name required", variant: "destructive" });
      return;
    }
    if (isCloud && !form.cloud_type) {
      toast({ title: "Cloud type required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      await onSave({
        device_type: form.device_type,
        device_name: form.device_name,
        pc_drive_letter: form.device_type === "PC" ? form.pc_drive_letter : null,
        total_storage_gb: totalUnit === "TB" ? (Number(form.total_storage) || 0) * 1024 : (Number(form.total_storage) || 0),
        used_storage_gb: usedUnit === "TB" ? (Number(form.used_storage) || 0) * 1024 : (Number(form.used_storage) || 0),
        health_percent: isCloud ? 100 : (Number(form.health_percent) || 100),
        safety_status: isCloud ? "SAFE" : form.safety_status,
        speed_rating: isCloud ? 3 : (Number(form.speed_rating) || 3),
        purchase_date_ad: isCloud ? "" : form.purchase_date_ad,
        price_npr: isCloud ? 0 : (Number(form.price_npr) || 0),
        purchased_from: isCloud ? "" : form.purchased_from,
        cloud_type: isCloud ? form.cloud_type : "",
        expiry_date_ad: isCloud ? form.expiry_date_ad : "",
      });
      toast({ title: editDevice ? "Device updated" : "Device added" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {editDevice ? (isCloud ? "Edit Cloud Storage" : "Edit Device") : (isCloud ? "Add Cloud Storage" : "Add Storage Device")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              {isCloud ? <Cloud className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
              <span>{isCloud ? "Cloud Information" : "Device Information"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Device Type</Label>
                <Select value={form.device_type} onValueChange={(v) => set("device_type", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HARD_DRIVE">Hard Drive</SelectItem>
                    <SelectItem value="SSD">SSD</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="CLOUD">Cloud</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isCloud ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Cloud Type</Label>
                  <Select value={form.cloud_type} onValueChange={(v) => set("cloud_type", v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Drive">Google Drive</SelectItem>
                      <SelectItem value="pCloud">pCloud</SelectItem>
                      <SelectItem value="Dropbox">Dropbox</SelectItem>
                      <SelectItem value="OneDrive">OneDrive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">{isPC ? "PC Name" : "Device Name"}</Label>
                  <Input className="h-10" value={form.device_name} onChange={(e) => set("device_name", e.target.value)} placeholder={isPC ? "e.g. Edit PC" : "e.g. WD 2TB"} />
                </div>
              )}
            </div>

            {isCloud && (
              <div className="space-y-1.5">
                <Label className="text-xs">Cloud Name</Label>
                <Input className="h-10" value={form.device_name} onChange={(e) => set("device_name", e.target.value)} placeholder="e.g. Main Drive" />
              </div>
            )}

            {isPC && (
              <div className="space-y-1.5">
                <Label className="text-xs">Drive Letter</Label>
                <Input className="h-10" value={form.pc_drive_letter} onChange={(e) => set("pc_drive_letter", e.target.value.toUpperCase().slice(0, 1))} placeholder="C, D, E..." />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>Total ({totalUnit})</span>
                  <button type="button" className="text-[10px] font-medium text-primary hover:underline" onClick={() => {
                    const val = Number(form.total_storage) || 0;
                    if (totalUnit === "TB") { set("total_storage", String(val * 1024)); setTotalUnit("GB"); }
                    else { set("total_storage", String(val / 1024)); setTotalUnit("TB"); }
                  }}>Switch</button>
                </Label>
                <Input className="h-10" type="number" value={form.total_storage} onChange={(e) => set("total_storage", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>Used ({usedUnit})</span>
                  <button type="button" className="text-[10px] font-medium text-primary hover:underline" onClick={() => {
                    const val = Number(form.used_storage) || 0;
                    if (usedUnit === "TB") { set("used_storage", String(val * 1024)); setUsedUnit("GB"); }
                    else { set("used_storage", String(val / 1024)); setUsedUnit("TB"); }
                  }}>Switch</button>
                </Label>
                <Input className="h-10" type="number" value={form.used_storage} onChange={(e) => set("used_storage", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Remaining</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                  {(() => {
                    const totalGb = totalUnit === "TB" ? (Number(form.total_storage) || 0) * 1024 : (Number(form.total_storage) || 0);
                    const usedGb = usedUnit === "TB" ? (Number(form.used_storage) || 0) * 1024 : (Number(form.used_storage) || 0);
                    const remGb = Math.max(0, totalGb - usedGb);
                    if (remGb >= 1024) return `${(remGb / 1024).toFixed(2)} TB`;
                    return `${Math.round(remGb)} GB`;
                  })()}
                </div>
              </div>
            </div>

            {isCloud && (
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date (AD)</Label>
                <Input className="h-10" type="date" value={form.expiry_date_ad} onChange={(e) => set("expiry_date_ad", e.target.value)} />
              </div>
            )}

            {!isCloud && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Health %</Label>
                  <Input className="h-10" type="number" value={form.health_percent} onChange={(e) => set("health_percent", e.target.value)} min="0" max="100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Safety</Label>
                  <Select value={form.safety_status} onValueChange={(v) => set("safety_status", v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAFE">SAFE</SelectItem>
                      <SelectItem value="RISKY">RISKY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Speed (1-5)</Label>
                  <Select value={form.speed_rating} onValueChange={(v) => set("speed_rating", v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {!isCloud && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-sm font-semibold text-muted-foreground">Purchase Details (optional)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Purchase Date</Label>
                    <Input className="h-10" type="date" value={form.purchase_date_ad} onChange={(e) => set("purchase_date_ad", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price (NPR)</Label>
                    <Input className="h-10" type="number" value={form.price_npr} onChange={(e) => set("price_npr", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Purchased From</Label>
                  <Input className="h-10" value={form.purchased_from} onChange={(e) => set("purchased_from", e.target.value)} placeholder="Shop name" />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editDevice ? "Update Device" : "Add Device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
