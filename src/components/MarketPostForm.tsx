import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NEPAL_CITIES } from '@/lib/constants';
import { ArrowLeft, Trash2 } from 'lucide-react';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import { adToBS, formatBSDate } from '@/lib/nepaliCalendar';

const FREELANCER_TYPES = [
  'Photographer', 'Videographer', 'Drone Operator', 'FPV Operator', 'Photo Editor', 'Video Editor',
];

interface DateEntry {
  event_date: string;       // AD YYYY-MM-DD for DB
  bs_display: string;       // e.g. "23 Baisakh 2082"
  timings: string;
  city: string;
  area: string;
  min_camera: string;
  freelancer_type: string;
  total_price: string;
}

interface MarketPostFormProps {
  initialData?: {
    event_name: string;
    freelancer_type: string;
    default_city: string;
    default_area: string;
    default_min_camera: string;
    total_price: string;
    dates: { event_date: string; timings: string; city: string; area: string; min_camera: string; freelancer_type: string }[];
  };
  onSubmit: (data: {
    event_name: string;
    freelancer_type: string;
    default_city: string;
    default_area: string;
    default_min_camera: string;
    total_price: string;
    dates: { event_date: string; timings: string; city: string; area: string; min_camera: string; freelancer_type: string }[];
  }) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function MarketPostForm({ initialData, onSubmit, onCancel, submitting }: MarketPostFormProps) {
  const [eventName, setEventName] = useState(initialData?.event_name || '');
  const [activeTab, setActiveTab] = useState(0);

  // Build initial dates with BS display
  const buildInitialDates = (): DateEntry[] => {
    if (initialData?.dates?.length) {
      return initialData.dates.map(d => {
        let bsDisplay = d.event_date;
        try {
          const bs = adToBS(new Date(d.event_date + 'T00:00:00'));
          bsDisplay = formatBSDate(bs);
        } catch { /* keep AD string */ }
        return {
          event_date: d.event_date,
          bs_display: bsDisplay,
          timings: d.timings || '',
          city: d.city || initialData.default_city || '',
          area: d.area || initialData.default_area || '',
          min_camera: d.min_camera || initialData.default_min_camera || '',
          freelancer_type: d.freelancer_type || initialData.freelancer_type || '',
          total_price: initialData.total_price || '',
        };
      });
    }
    return [];
  };

  const [dates, setDates] = useState<DateEntry[]>(buildInitialDates);

  // Set of already-added AD dates for disabling in picker
  const pickedAdDates = useMemo(() => new Set(dates.map(d => d.event_date)), [dates]);

  const addDate = (adDate: string, bsDisplay: string) => {
    const firstTab = dates[0];
    const newEntry: DateEntry = {
      event_date: adDate,
      bs_display: bsDisplay,
      timings: firstTab?.timings || '',
      city: firstTab?.city || '',
      area: firstTab?.area || '',
      min_camera: firstTab?.min_camera || '',
      freelancer_type: firstTab?.freelancer_type || '',
      total_price: firstTab?.total_price || '',
    };
    setDates(prev => [...prev, newEntry]);
    setActiveTab(dates.length); // switch to newly added tab
  };

  const removeDate = (index: number) => {
    if (dates.length <= 1) return;
    setDates(prev => prev.filter((_, i) => i !== index));
    setActiveTab(prev => prev >= dates.length - 1 ? Math.max(0, dates.length - 2) : prev);
  };

  const updateDate = (index: number, field: keyof DateEntry, value: string) => {
    setDates(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const canSubmit = eventName.trim() && dates.length > 0 && dates.every(d => d.event_date);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const firstDate = dates[0];
    onSubmit({
      event_name: eventName,
      freelancer_type: firstDate.freelancer_type,
      default_city: firstDate.city,
      default_area: firstDate.area,
      default_min_camera: firstDate.min_camera,
      total_price: firstDate.total_price,
      dates: dates.map(d => ({
        event_date: d.event_date,
        timings: d.timings,
        city: d.city,
        area: d.area,
        min_camera: d.min_camera,
        freelancer_type: d.freelancer_type,
      })),
    });
  };

  const current = dates[activeTab];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onCancel} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-bold text-foreground">{initialData ? 'Edit Post' : 'New Job Post'}</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg lg:max-w-3xl mx-auto space-y-4">
        {/* Event Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Event Name *</label>
          <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Wedding Photography" className="rounded-xl" />
        </div>

        {/* Add Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Event Dates *</label>
          <NepaliDatePicker
            onDateSelect={(adDate, bsDisplay) => addDate(adDate, bsDisplay)}
            disabledDates={pickedAdDates}
            triggerLabel="+ Add Date (BS)"
          />
        </div>

        {/* Date Tabs */}
        {dates.length > 0 && (
          <>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {dates.map((d, i) => (
                <button
                  key={d.event_date}
                  onClick={() => setActiveTab(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    activeTab === i
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {d.bs_display}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            {current && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{current.bs_display}</span>
                  {dates.length > 1 && (
                    <button onClick={() => removeDate(activeTab)} className="text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Requirement */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Requirement</label>
                  <Select value={current.freelancer_type} onValueChange={v => updateDate(activeTab, 'freelancer_type', v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {FREELANCER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timings */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Timings</label>
                  <Input value={current.timings} onChange={e => updateDate(activeTab, 'timings', e.target.value)} placeholder="e.g. 9 AM - 6 PM" className="rounded-xl" />
                </div>

                {/* Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">City</label>
                    <Select value={current.city} onValueChange={v => updateDate(activeTab, 'city', v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="City" /></SelectTrigger>
                      <SelectContent>
                        {NEPAL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Area</label>
                    <Input value={current.area} onChange={e => updateDate(activeTab, 'area', e.target.value)} placeholder="Area" className="rounded-xl" />
                  </div>
                </div>

                {/* Min Camera */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Min Camera Requirement</label>
                  <Input value={current.min_camera} onChange={e => updateDate(activeTab, 'min_camera', e.target.value)} placeholder="e.g. Sony A7III" className="rounded-xl" />
                </div>

                {/* Total Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Total Price (NPR)</label>
                  <Input value={current.total_price} onChange={e => updateDate(activeTab, 'total_price', e.target.value)} placeholder="e.g. 15000" className="rounded-xl" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full h-12 rounded-xl text-base font-semibold">
          {submitting ? 'Saving...' : initialData ? 'Update Post' : 'Post Job'}
        </Button>
      </div>
    </div>
  );
}
