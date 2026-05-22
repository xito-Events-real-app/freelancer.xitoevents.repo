import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users, CalendarCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useBookingsForDate } from '@/hooks/useBookingsForDate';
import {
  nepaliMonthsEnglish,
  bsToADString,
  getDaysInBSMonth,
} from '@/lib/nepaliCalendar';

interface DateBookingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bsYear: number;
  bsMonth: number;
  bsDay: number;
}

export default function DateBookingsDialog({ open, onOpenChange, bsYear, bsMonth, bsDay }: DateBookingsDialogProps) {
  const navigate = useNavigate();
  const [year, setYear] = useState(bsYear);
  const [month, setMonth] = useState(bsMonth);
  const [day, setDay] = useState(bsDay);

  const adDate = useMemo(() => {
    try { return bsToADString(year, month, day); }
    catch { return null; }
  }, [year, month, day]);

  const { data, isLoading } = useBookingsForDate(adDate);
  const booked = data?.booked || [];
  const available = data?.available || [];

  const monthName = nepaliMonthsEnglish[month - 1] || '';
  const maxDay = getDaysInBSMonth(year, month);

  const goPrev = () => {
    if (day > 1) { setDay(d => d - 1); }
    else {
      let m = month - 1, y = year;
      if (m < 1) { m = 12; y -= 1; }
      const md = getDaysInBSMonth(y, m);
      setYear(y); setMonth(m); setDay(md);
    }
  };

  const goNext = () => {
    if (day < maxDay) { setDay(d => d + 1); }
    else {
      let m = month + 1, y = year;
      if (m > 12) { m = 1; y += 1; }
      setYear(y); setMonth(m); setDay(1);
    }
  };

  const handleProfileClick = (profileId: string) => {
    onOpenChange(false);
    navigate(`/freelancer/${profileId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center gap-3">
              <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-base font-bold min-w-[140px]">
                {monthName} {day}, {year}
              </span>
              <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="booked" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="booked" className="flex-1 gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" />
              Booked ({booked.length})
            </TabsTrigger>
            <TabsTrigger value="available" className="flex-1 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Available ({available.length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="booked" className="flex-1 overflow-y-auto mt-2">
                {booked.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No one is booked on this date</p>
                ) : (
                  <div className="space-y-2">
                    {booked.map(f => (
                      <div
                        key={f.user_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleProfileClick(f.profile_id)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={f.profile_photo_url || ''} />
                          <AvatarFallback>{f.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{f.full_name}</p>
                          {f.main_job && <p className="text-xs text-muted-foreground">{f.main_job}</p>}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{f.event_name}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="available" className="flex-1 overflow-y-auto mt-2">
                {available.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Everyone is booked on this date</p>
                ) : (
                  <div className="space-y-2">
                    {available.map(f => (
                      <div
                        key={f.user_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleProfileClick(f.profile_id)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={f.profile_photo_url || ''} />
                          <AvatarFallback>{f.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{f.full_name}</p>
                          {f.main_job && <p className="text-xs text-muted-foreground">{f.main_job}</p>}
                        </div>
                        <Badge className="text-[10px] shrink-0 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Available</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
