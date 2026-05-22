import { useState, useCallback } from 'react';
import { Save, RotateCcw, User, Phone, FileText, MapPin, CalendarDays, IndianRupee, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAddAgencyClient } from '@/hooks/useAgencyClients';
import { useAddAgencyClientEvents } from '@/hooks/useAgencyClientEvents';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { useAcceptedStaffNames } from '@/hooks/useAgencyStaff';
import { useAddAgencyFinanceBank, useAgencyFinanceBanks, useCreateOpeningClientPayment } from '@/hooks/useAgencyFinance';
import InlineNepaliCalendar from '@/components/company/InlineNepaliCalendar';
import EventDateSelector, { type SelectedDate } from '@/components/company/EventDateSelector';
import CitySearchSelect from '@/components/company/CitySearchSelect';
import FinanceBankSelect from '@/components/company/FinanceBankSelect';
import { VALLEY_CITIES, ALL_NEPAL_CITIES, LOCATION_TYPES, type LocationType } from '@/lib/company-form-data';
import { cn } from '@/lib/utils';
import { formatBSDate, adToBS, type NepaliDateObject } from '@/lib/nepaliCalendar';

let _nextId = 1;
function nextId() { return String(_nextId++); }

function FormSection({ title, icon: Icon, gradient, defaultOpen = true, children }: {
  title: string; icon: React.ElementType; gradient: 'blue' | 'purple' | 'green' | 'amber' | 'pink' | 'indigo';
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const gMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/5 border-green-500/30',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/30',
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30',
  };
  const iMap: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-500/20', purple: 'text-purple-500 bg-purple-500/20',
    green: 'text-green-500 bg-green-500/20', amber: 'text-amber-500 bg-amber-500/20',
    pink: 'text-pink-500 bg-pink-500/20', indigo: 'text-indigo-500 bg-indigo-500/20',
  };
  return (
    <div className={cn('border-2 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 bg-gradient-to-br', gMap[gradient], open && 'shadow-md')}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl', iMap[gradient])}><Icon className="w-4 h-4" /></div>
          <h3 className="font-bold text-foreground tracking-tight">{title}</h3>
        </div>
        <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-all duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden"><div className="p-4 space-y-4">{children}</div></div>
      </div>
    </div>
  );
}

export default function CompanyQuickAdd() {
  const { toast } = useToast();
  const addClient = useAddAgencyClient();
  const addEvents = useAddAgencyClientEvents();
  const createOpeningPayment = useCreateOpeningClientPayment();
  const addBank = useAddAgencyFinanceBank();
  const { data: financeBanks = [] } = useAgencyFinanceBanks();
  const { data: settings } = useAgencySettings();

  const [clientName, setClientName] = useState('');
  const [source, setSource] = useState('');
  const [sourceWhatsappHandler, setSourceWhatsappHandler] = useState('');
  const [sourceOldClientName, setSourceOldClientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [handler, setHandler] = useState('');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState<LocationType | ''>('');
  const [eventCity, setEventCity] = useState('');
  const [eventFromCity, setEventFromCity] = useState('');
  const [eventToCity, setEventToCity] = useState('');
  const [selectedDates, setSelectedDates] = useState<SelectedDate[]>([]);
  const [packageAmount, setPackageAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceBankId, setAdvanceBankId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const selectedAdDates = new Set(selectedDates.map(d => d.adDate));

  const handleToggleDate = useCallback((adDate: string, bsDisplay: string, _bs: NepaliDateObject) => {
    setSelectedDates(prev => {
      const hasDate = prev.some(d => d.adDate === adDate);
      if (hasDate) return prev.filter(d => d.adDate !== adDate);
      return [...prev, { id: nextId(), adDate, bsDisplay, eventName: '' }];
    });
  }, []);

  const handleChangeEventName = (id: string, eventName: string) => {
    setSelectedDates(prev => prev.map(d => d.id === id ? { ...d, eventName } : d));
  };

  const handleRemoveEvent = (id: string) => {
    setSelectedDates(prev => prev.filter(d => d.id !== id));
  };

  const handleAddEvent = (adDate: string, bsDisplay: string) => {
    setSelectedDates(prev => [...prev, { id: nextId(), adDate, bsDisplay, eventName: '' }]);
  };

  const resetForm = () => {
    setClientName(''); setSource(''); setSourceWhatsappHandler(''); setSourceOldClientName('');
    setContactNumber(''); setWhatsappNumber(''); setHandler(''); setDescription('');
    setLocationType(''); setEventCity(''); setEventFromCity(''); setEventToCity('');
    setSelectedDates([]); setPackageAmount(''); setAdvanceAmount(''); setAdvanceBankId(null); setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) { toast({ title: 'Client name is required', variant: 'destructive' }); return; }

    let finalSource = source;
    if (source === 'WHATSAPP' && sourceWhatsappHandler) finalSource = `WHATSAPP (${sourceWhatsappHandler})`;
    if (source === 'OLD CLIENT' && sourceOldClientName) finalSource = `OLD CLIENT: ${sourceOldClientName}`;

    const firstDate = selectedDates[0];

    try {
      const result = await addClient.mutateAsync({
        client_name: clientName.trim(),
        contact_number: contactNumber || null,
        whatsapp_number: whatsappNumber || null,
        email: null,
        event_name: firstDate?.eventName || null,
        event_date_bs: firstDate?.bsDisplay || null,
        event_date_ad: firstDate?.adDate || null,
        event_city: eventCity || null,
        event_area: null,
        package_amount: parseInt(packageAmount) || 0,
        advance_amount: parseInt(advanceAmount) || 0,
        status: 'booked',
        notes: notes || null,
        source: finalSource || null,
        handler: handler || null,
        event_location_type: locationType || null,
        event_from_city: eventFromCity || null,
        event_to_city: eventToCity || null,
        description: description || null,
      });

      if (selectedDates.length > 0 && result?.id) {
        await addEvents.mutateAsync(
          selectedDates.map(d => ({
            client_id: result.id,
            event_date_bs: d.bsDisplay,
            event_date_ad: d.adDate,
            event_name: d.eventName,
          }))
        );
      }

      const parsedAdvance = parseInt(advanceAmount) || 0;
      if (parsedAdvance > 0 && result?.id) {
        const today = new Date();
        await createOpeningPayment.mutateAsync({
          clientId: result.id,
          amount: parsedAdvance,
          paymentDate: today.toISOString().slice(0, 10),
          paymentDateBS: formatBSDate(adToBS(today)),
          bankId: advanceBankId,
          note: 'Opening advance payment',
        });
      }

      toast({ title: 'Client added successfully!' });
      resetForm();
    } catch {
      toast({ title: 'Failed to add client', variant: 'destructive' });
    }
  };

  const { data: staffNames = [] } = useAcceptedStaffNames();
  const handlers = staffNames;
  const sources = settings?.sources ?? [];

  // City lists based on location type
  const getCityList = () => {
    if (locationType === 'INSIDE VALLEY') return VALLEY_CITIES;
    if (locationType === 'OUTSIDE VALLEY') return ALL_NEPAL_CITIES;
    return [];
  };

  const getFromCities = () => {
    if (locationType === 'MIXED' || locationType === 'OUT TO IN') return ALL_NEPAL_CITIES;
    if (locationType === 'IN TO OUT') return VALLEY_CITIES;
    return [];
  };

  const getToCities = () => {
    if (locationType === 'MIXED' || locationType === 'IN TO OUT') return ALL_NEPAL_CITIES;
    if (locationType === 'OUT TO IN') return VALLEY_CITIES;
    return [];
  };

  const showSingleCity = locationType === 'INSIDE VALLEY' || locationType === 'OUTSIDE VALLEY';
  const showDualCity = locationType === 'MIXED' || locationType === 'IN TO OUT' || locationType === 'OUT TO IN';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Add New Client</h1>
            <p className="text-sm text-gray-500">Fill in the details to register a new booked client</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={resetForm} className="shadow-sm">
              <RotateCcw className="w-4 h-4 mr-2" />Reset
            </Button>
            <Button onClick={handleSubmit} disabled={addClient.isPending || !clientName.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
              {addClient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Client
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-5">
            <FormSection title="Client Details" icon={User} gradient="blue">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Client Name *</label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Enter client name" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Source</label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                  <SelectContent>
                    {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {source === 'WHATSAPP' && handlers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Whose WhatsApp?</label>
                  <Select value={sourceWhatsappHandler} onValueChange={setSourceWhatsappHandler}>
                    <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                    <SelectContent>
                      {handlers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {source === 'OLD CLIENT' && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Old Client Name</label>
                  <Input value={sourceOldClientName} onChange={e => setSourceOldClientName(e.target.value)} placeholder="Name of old client" />
                </div>
              )}
            </FormSection>

            <FormSection title="Contact Details" icon={Phone} gradient="purple">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Number</label>
                  <Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="98XXXXXXXX" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">WhatsApp</label>
                  <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="98XXXXXXXX" />
                </div>
              </div>
            </FormSection>

            <FormSection title="Inquiry Details" icon={FileText} gradient="green">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Handler</label>
                <Select value={handler} onValueChange={setHandler}>
                  <SelectTrigger><SelectValue placeholder="Assign a handler" /></SelectTrigger>
                  <SelectContent>
                    {handlers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                {handlers.length === 0 && <p className="text-xs text-muted-foreground mt-1">Add company staffs in Settings first</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Client inquiry details..." rows={3} />
              </div>
            </FormSection>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            <FormSection title="Event Location" icon={MapPin} gradient="amber">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Location Type</label>
                <Select value={locationType} onValueChange={val => { setLocationType(val as LocationType); setEventCity(''); setEventFromCity(''); setEventToCity(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select location type" /></SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {showSingleCity && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">City</label>
                  <CitySearchSelect cities={getCityList()} value={eventCity} onChange={setEventCity} placeholder="Search city..." />
                </div>
              )}
              {showDualCity && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">From City</label>
                    <CitySearchSelect cities={getFromCities()} value={eventFromCity} onChange={setEventFromCity} placeholder="From city..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">To City</label>
                    <CitySearchSelect cities={getToCities()} value={eventToCity} onChange={setEventToCity} placeholder="To city..." />
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection title="Event Dates" icon={CalendarDays} gradient="pink">
              <InlineNepaliCalendar selectedDates={selectedAdDates} onToggleDate={handleToggleDate} />
              <div className="border-t border-pink-500/20 pt-3">
                <EventDateSelector dates={selectedDates} onChangeEventName={handleChangeEventName} onRemoveEvent={handleRemoveEvent} onAddEvent={handleAddEvent} />
              </div>
            </FormSection>

            <FormSection title="Package & Advance" icon={IndianRupee} gradient="indigo">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Package Amount (NPR)</label>
                  <Input type="number" value={packageAmount} onChange={e => setPackageAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Advance Amount (NPR)</label>
                  <Input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="0" />
                </div>
              </div>
              {(parseInt(advanceAmount) || 0) > 0 && (
                <div className="animate-in fade-in zoom-in-95">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Advance Bank / Payment Method</label>
                  <FinanceBankSelect
                    banks={financeBanks}
                    value={advanceBankId}
                    onChange={setAdvanceBankId}
                    onAddBank={(bankName, accountHolderName) => addBank.mutateAsync({ bankName, accountHolderName })}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
                <Input value="Booked" disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3} />
              </div>
            </FormSection>
          </div>
        </form>
      </div>
    </div>
  );
}
