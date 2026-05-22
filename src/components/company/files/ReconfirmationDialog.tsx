import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, MessageCircle, Download } from "lucide-react";
import { FileRecord } from "@/lib/files-api";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { downloadConfirmationPDF } from "@/lib/file-confirmation-pdf";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { useCompanyName } from "@/hooks/useCompanyName";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileRecord | null;
  onConfirm: (fileId: string) => Promise<void>;
  alreadyConfirmed?: boolean;
}

export function ReconfirmationDialog({ open, onOpenChange, file, onConfirm, alreadyConfirmed }: Props) {
  const [isWorking, setIsWorking] = useState(false);
  const companyName = useCompanyName();

  if (!file) return null;

  const nepaliDate = (() => {
    if (file.event_year && file.event_month && file.event_day) {
      const mIdx = parseInt(String(file.event_month));
      const monthName = mIdx >= 1 && mIdx <= 12 ? nepaliMonthsEnglish[mIdx - 1] : file.event_month;
      return `${monthName} ${file.event_day}, ${file.event_year}`;
    }
    return file.registered_date_bs || "-";
  })();

  const backupTime = file.backup_1_recorded_at
    ? new Date(file.backup_1_recorded_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "-";

  const handleConfirmOnly = async () => {
    setIsWorking(true);
    try {
      await onConfirm(file.id);
      toast.success("File confirmed successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setIsWorking(true);
    try {
      // Look up freelancer's WhatsApp number
      let whatsappNo = "";
      const flName = (file.freelancer_name || "").trim();
      if (flName) {
        const { data } = await supabase
          .from("freelancer_profiles")
          .select("whatsapp_number, contact_number")
          .ilike("full_name", flName)
          .limit(1)
          .maybeSingle();
        whatsappNo = (data?.whatsapp_number || data?.contact_number || "").trim();
      }

      const message = `*${companyName} — File Backup Confirmation* ✅

Hi ${file.freelancer_name || ""},
your files have been copied successfully!

📋 *Details:*
• Client: ${file.client_name || "-"}
• Event: ${file.event_name || "-"}
• Date (BS): ${nepaliDate}
• Date (AD): ${file.event_date_ad || "-"}
• Card: ${file.card_label || "-"}
• Format: ${file.format_type || "-"}
• Size: ${file.size_gb ? `${file.size_gb} GB` : "-"}
• No. of Items: ${file.number_of_items || "-"}
• Backed up to: ${file.backup_1_device_name || "-"}
• Path: ${file.final_generated_path || "-"}
• Copied by: ${file.who_copied || "-"}
• Copied on: ${backupTime}

Manage your bookings & files:
https://freelancer.xitoevents.com

Thank you! 🙏`;

      downloadConfirmationPDF(file, companyName);

      if (whatsappNo) {
        openWhatsApp(whatsappNo, message);
      } else {
        toast.info("No WhatsApp number found — PDF downloaded.");
      }

      if (!alreadyConfirmed) {
        await onConfirm(file.id);
      }
      toast.success(alreadyConfirmed ? "WhatsApp opened" : "File confirmed");
      onOpenChange(false);
    } catch {
      toast.error("Failed to send confirmation");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {alreadyConfirmed ? "Backup Confirmation Details" : "Confirm File Backup"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-muted/60 rounded-lg p-3 space-y-2 text-sm border border-border">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Client</span><span className="font-bold">{file.client_name || "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Event</span><span className="font-bold">{file.event_name || "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Date (BS)</span><span className="font-bold">{nepaliDate}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Date (AD)</span><span className="font-bold">{file.event_date_ad || "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Freelancer</span><span className="font-bold">{file.freelancer_name || "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Role</span><Badge variant="outline" className="text-xs font-bold">{file.freelancer_type || "-"}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Card / Format</span><span className="font-bold">{file.card_label || "-"} / {file.format_type || "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Size</span><span className="font-bold">{file.size_gb ? `${file.size_gb} GB` : "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">No. of Items</span><span className="font-bold">{file.number_of_items || "-"}</span></div>
            <div className="h-px bg-border my-1" />
            <div className="flex items-center justify-between"><span className="text-muted-foreground">1st Backup Device</span><span className="font-bold text-emerald-600">{file.backup_1_device_name || "-"}</span></div>
            <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground shrink-0">Path</span><span className="font-mono text-xs truncate max-w-[180px]" title={file.final_generated_path || ""}>{file.final_generated_path || "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Copied By</span><span className="font-bold">{file.who_copied || "-"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Copied At</span><span className="font-bold">{backupTime}</span></div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => downloadConfirmationPDF(file, companyName)}
          >
            <Download className="w-4 h-4" />
            Download PDF Receipt
          </Button>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSendWhatsApp}
            disabled={isWorking}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <MessageCircle className="w-4 h-4" />
            {alreadyConfirmed ? "Send WhatsApp" : "Confirm & Send WhatsApp"}
          </Button>
          {!alreadyConfirmed && (
            <Button
              variant="outline"
              onClick={handleConfirmOnly}
              disabled={isWorking}
              className="w-full gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm Only (Skip)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
