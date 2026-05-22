import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, Trash2, X, Save, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import FinancePinGate from '@/components/company/FinancePinGate';
import XitoDatePicker, { makeXitoDateValue, type XitoDateValue } from '@/components/company/XitoDatePicker';
import {
  type AgencyClient,
  useUpdateAgencyClient,
  useDeleteAgencyClient,
} from '@/hooks/useAgencyClients';
import {
  useAgencyClientEvents,
  useAddAgencyClientEvents,
  useDeleteAgencyClientEvent,
} from '@/hooks/useAgencyClientEvents';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { useAcceptedStaffNames } from '@/hooks/useAgencyStaff';
import { LOCATION_TYPES } from '@/lib/company-form-data';
import { adToBS, formatBSDate } from '@/lib/nepaliCalendar';
import {
  getStoredFinanceSession,
  useVerifyFinanceSession,
} from '@/hooks/useAgencyFinance';

interface Props {
  client: AgencyClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

const STATUS_OPTIONS = ['booked', 'inquiry', 'cancelled', 'completed'];

export default function EditClientDialog({ client, open, onOpenChange, onDeleted }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const verifySession = useVerifyFinanceSession();

  // Try to reuse existing finance session each time the dialog opens.
  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      return;
    }
    const stored = getStoredFinanceSession();
    if (!stored?.token) return;
    verifySession.mutate(stored.token, {
      onSuccess: (valid) => { if (valid) setUnlocked(true); },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unlocked ? `Edit Client — ${client?.client_name ?? ''}` : 'Locked'}</DialogTitle>
          <DialogDescription>
            {unlocked
              ? 'Update client info, manage events, or delete this client. Changes apply everywhere.'
              : 'Enter your finance PIN to edit this client.'}
          </DialogDescription>
        </DialogHeader>

        {!unlocked ? (
          <FinancePinGate compact title="Edit Locked" onUnlocked={() => setUnlocked(true)} />
        ) : client ? (
          <EditorBody
            client={client}
            onClose={() => onOpenChange(false)}
            onDeleted={() => { onOpenChange(false); onDeleted?.(); }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditorBody({
  client, onClose, onDeleted,
}: { client: AgencyClient; onClose: () => void; onDeleted: () => void }) {
  const updateClient = useUpdateAgencyClient();
  const deleteClient = useDeleteAgencyClient();
  const addEvents = useAddAgencyClientEvents();
  const deleteEvent = useDeleteAgencyClientEvent();
  const { data: settings } = useAgencySettings();
  const { data: staffNames = [] } = useAcceptedStaffNames();
  const { data: subEvents = [] } = useAgencyClientEvents(client.id);

  // Handler options: accepted company staff + the currently-saved handler (so it always pre-fills).
  const handlerOptions = useMemo(() => {
    const set = new Set<string>();
    (staffNames ?? []).forEach(n => n && set.add(n));
    if (client.handler) set.add(client.handler);
    return Array.from(set);
  }, [staffNames, client.handler]);

  // Form state
  const [clientName, setClientName] = useState(client.client_name);
  const [contactNumber, setContactNumber] = useState(client.contact_number ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(client.whatsapp_number ?? '');
  const [email, setEmail] = useState(client.email ?? '');
  const [source, setSource] = useState(client.source ?? '');
  const [handler, setHandler] = useState(client.handler ?? '');
  const [status, setStatus] = useState(client.status || 'booked');
  const [eventName, setEventName] = useState(client.event_name ?? '');
  const [eventCity, setEventCity] = useState(client.event_city ?? '');
  const [eventArea, setEventArea] = useState(client.event_area ?? '');
  const [locationType, setLocationType] = useState(client.event_location_type ?? '');
  const [eventFromCity, setEventFromCity] = useState(client.event_from_city ?? '');
  const [eventToCity, setEventToCity] = useState(client.event_to_city ?? '');
  const [packageAmount, setPackageAmount] = useState(String(client.package_amount ?? 0));
  const [advanceAmount, setAdvanceAmount] = useState(String(client.advance_amount ?? 0));
  const [notes, setNotes] = useState(client.notes ?? '');
  const [description, setDescription] = useState(client.description ?? '');

  const initialDate: XitoDateValue = useMemo(() => {
    if (client.event_date_ad) {
      const d = new Date(`${client.event_date_ad}T00:00:00`);
      if (!isNaN(d.getTime())) return { adDate: client.event_date_ad, bsDisplay: formatBSDate(adToBS(d)) };
    }
    return makeXitoDateValue();
  }, [client.event_date_ad]);
  const [eventDate, setEventDate] = useState<XitoDateValue>(initialDate);
  const [hasDate, setHasDate] = useState<boolean>(!!client.event_date_ad);

  // New sub-event drafts
  const [newSubEvents, setNewSubEvents] = useState<{ tmpId: string; date: XitoDateValue; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!clientName.trim()) {
      toast({ title: 'Client name is required', variant: 'destructive' });
      return;
    }
    const pkg = Number(packageAmount) || 0;
    const adv = Number(advanceAmount) || 0;
    if (pkg < 0 || adv < 0) {
      toast({ title: 'Amounts must be ≥ 0', variant: 'destructive' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Invalid email', variant: 'destructive' });
      return;
    }

    try {
      await updateClient.mutateAsync({
        id: client.id,
        patch: {
          client_name: clientName.trim(),
          contact_number: contactNumber.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          email: email.trim() || null,
          source: source || null,
          handler: handler || null,
          status,
          event_name: eventName.trim() || null,
          event_date_ad: hasDate ? eventDate.adDate : null,
          event_date_bs: hasDate ? eventDate.bsDisplay : null,
          event_city: eventCity.trim() || null,
          event_area: eventArea.trim() || null,
          event_location_type: locationType || null,
          event_from_city: eventFromCity.trim() || null,
          event_to_city: eventToCity.trim() || null,
          package_amount: pkg,
          advance_amount: adv,
          notes: notes.trim() || null,
          description: description.trim() || null,
        },
      });

      if (newSubEvents.length > 0) {
        await addEvents.mutateAsync(newSubEvents.map(s => ({
          client_id: client.id,
          event_date_ad: s.date.adDate,
          event_date_bs: s.date.bsDisplay,
          event_name: s.name.trim() || 'Event',
        })));
      }

      toast({ title: 'Client updated' });
      onClose();
    } catch (e) {
      toast({ title: 'Failed to save', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent.mutateAsync(id);
      toast({ title: 'Event removed' });
    } catch {
      toast({ title: 'Failed to remove event', variant: 'destructive' });
    }
  };

  const handleDeleteClient = async () => {
    try {
      await deleteClient.mutateAsync(client.id);
      toast({ title: 'Client deleted', description: 'All events, payments, and crew assignments removed.' });
      onDeleted();
    } catch (e) {
      toast({ title: 'Failed to delete', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Section title="Client & Contact">
        <Field label="Client Name *">
          <Input value={clientName} onChange={e => setClientName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Contact Number">
            <Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
          </Field>
          <Field label="WhatsApp Number">
            <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
      </Section>

      {/* Source / Handler / Status */}
      <Section title="Source · Handler · Status">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Source">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {(settings?.sources ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Handler">
            <Select value={handler} onValueChange={setHandler}>
              <SelectTrigger><SelectValue placeholder="Select handler" /></SelectTrigger>
              <SelectContent>
                {handlerOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      {/* Primary Event */}
      <Section title="Primary Event">
        <Field label="Event Name">
          <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Wedding, Reception" />
        </Field>
        <div className="flex items-center gap-2 mb-2">
          <input
            id="hasDate"
            type="checkbox"
            checked={hasDate}
            onChange={e => setHasDate(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="hasDate" className="text-sm cursor-pointer">Set event date</Label>
        </div>
        {hasDate && <XitoDatePicker value={eventDate} onChange={setEventDate} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Field label="Event City">
            <Input value={eventCity} onChange={e => setEventCity(e.target.value)} />
          </Field>
          <Field label="Event Area">
            <Input value={eventArea} onChange={e => setEventArea(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Field label="Location Type">
            <Select value={locationType} onValueChange={setLocationType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="From City">
            <Input value={eventFromCity} onChange={e => setEventFromCity(e.target.value)} />
          </Field>
          <Field label="To City">
            <Input value={eventToCity} onChange={e => setEventToCity(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Additional Events */}
      <Section title="Additional Events">
        {subEvents.length === 0 && newSubEvents.length === 0 && (
          <p className="text-sm text-muted-foreground">No additional events.</p>
        )}
        {subEvents.map(ev => (
          <div key={ev.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ev.event_name || 'Event'}</p>
              <p className="text-xs text-muted-foreground">{ev.event_date_bs || ev.event_date_ad}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50"
              onClick={() => handleDeleteEvent(ev.id)} disabled={deleteEvent.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {newSubEvents.map(s => (
          <div key={s.tmpId} className="space-y-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-emerald-700">New Event</span>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setNewSubEvents(prev => prev.filter(x => x.tmpId !== s.tmpId))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Event name"
              value={s.name}
              onChange={e => setNewSubEvents(prev => prev.map(x => x.tmpId === s.tmpId ? { ...x, name: e.target.value } : x))}
            />
            <XitoDatePicker
              value={s.date}
              onChange={v => setNewSubEvents(prev => prev.map(x => x.tmpId === s.tmpId ? { ...x, date: v } : x))}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setNewSubEvents(prev => [...prev, { tmpId: crypto.randomUUID(), date: makeXitoDateValue(), name: '' }])}
        >
          <Plus className="h-4 w-4 mr-1" /> Add event
        </Button>
      </Section>

      {/* Financials */}
      <Section title="Financials">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Package Amount (Rs.)">
            <Input type="number" min={0} value={packageAmount} onChange={e => setPackageAmount(e.target.value)} />
          </Field>
          <Field label="Advance Amount (Rs.)">
            <Input type="number" min={0} value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          For full payment ledger, use the Finance Manager.
        </p>
      </Section>

      {/* Notes */}
      <Section title="Notes & Description">
        <Field label="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </Field>
      </Section>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete Client
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateClient.isPending || addEvents.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {updateClient.isPending || addEvents.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete this client?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{client.client_name}</strong>, all their events, payments,
              and crew assignments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteClient}
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? 'Deleting...' : 'Delete forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
