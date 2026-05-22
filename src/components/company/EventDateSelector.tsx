import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface SelectedDate {
  id: string;
  adDate: string;
  bsDisplay: string;
  eventName: string;
}

interface Props {
  dates: SelectedDate[];
  onChangeEventName: (id: string, eventName: string) => void;
  onRemoveEvent: (id: string) => void;
  onAddEvent: (adDate: string, bsDisplay: string) => void;
}

export default function EventDateSelector({ dates, onChangeEventName, onRemoveEvent, onAddEvent }: Props) {
  if (dates.length === 0) return <p className="text-sm text-muted-foreground">No dates selected yet. Pick from the calendar above.</p>;

  // Group by adDate
  const grouped = dates.reduce<Record<string, SelectedDate[]>>((acc, d) => {
    (acc[d.adDate] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([adDate, entries]) => (
        <div key={adDate} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{entries[0].bsDisplay}</span>
            <Button type="button" variant="ghost" size="sm"
              className="h-7 text-xs text-pink-500 hover:text-pink-400 hover:bg-pink-500/10"
              onClick={() => onAddEvent(adDate, entries[0].bsDisplay)}>
              <Plus className="h-3 w-3 mr-1" /> Add Event
            </Button>
          </div>
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 bg-white/5 border border-pink-500/20 rounded-xl p-2.5">
              <Input
                value={entry.eventName}
                onChange={e => onChangeEventName(entry.id, e.target.value)}
                placeholder="Event name (e.g. Wedding, Reception)"
                className="flex-1 h-8 text-sm"
              />
              <Button type="button" variant="ghost" size="icon"
                className="h-7 w-7 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => onRemoveEvent(entry.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
