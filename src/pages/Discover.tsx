import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFreelancers, FreelancerProfile } from '@/hooks/useProfile';
import { useFreelancerBookingCounts, useBookedFreelancersOnDates } from '@/hooks/useFreelancerBookings';
import { SKILLS, NEPAL_CITIES } from '@/lib/constants';
import { maskName } from '@/lib/utils';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  nepaliMonthsEnglish,
  bsToADString,
  adToBS,
} from '@/lib/nepaliCalendar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, ChevronRight, Filter, CalendarDays, X } from 'lucide-react';
import DateSearchPicker from '@/components/DateSearchPicker';
import InlineFollowButton from '@/components/InlineFollowButton';
import { Helmet } from 'react-helmet-async';

export default function Discover() {
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [searchDates, setSearchDates] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = !user;

  const { data: freelancers, isLoading } = useFreelancers({
    search: search || undefined,
    skill: skill && skill !== 'all' ? skill : undefined,
    city: city && city !== 'all' ? city : undefined,
  });

  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const dateRanges = useMemo(() => {
    const thisMonthStart = bsToADString(currentBS.year, currentBS.month, 1);
    const thisMonthEnd = bsToADString(currentBS.year, currentBS.month, getDaysInBSMonth(currentBS.year, currentBS.month));
    
    const nextMonth = currentBS.month === 12 ? 1 : currentBS.month + 1;
    const nextYear = currentBS.month === 12 ? currentBS.year + 1 : currentBS.year;
    const nextMonthStart = bsToADString(nextYear, nextMonth, 1);
    const nextMonthEnd = bsToADString(nextYear, nextMonth, getDaysInBSMonth(nextYear, nextMonth));

    return [
      { start: thisMonthStart, end: thisMonthEnd },
      { start: nextMonthStart, end: nextMonthEnd },
    ];
  }, [currentBS]);

  const userIds = useMemo(() => (freelancers || []).map(f => f.user_id), [freelancers]);
  const { data: bookingCounts } = useFreelancerBookingCounts(userIds, dateRanges);

  const { data: bookedUserIds } = useBookedFreelancersOnDates(searchDates);

  const handleDateConfirm = (adDates: string[]) => {
    setSearchDates(adDates);
  };

  const handleRemoveDate = (d: string) => {
    setSearchDates(prev => prev.filter(x => x !== d));
  };

  const nextMonthName = nepaliMonthsEnglish[currentBS.month === 12 ? 0 : currentBS.month];
  const thisMonthName = nepaliMonthsEnglish[currentBS.month - 1];

  const filteredFreelancers = useMemo(() => {
    if (!freelancers) return [];
    if (searchDates.length === 0 || !bookedUserIds) return freelancers;
    return freelancers.filter(f => !bookedUserIds.has(f.user_id));
  }, [freelancers, searchDates, bookedUserIds]);

  return (
    <>
    <Helmet>
      <title>Discover Wedding Photographers & Videographers in Nepal | Xito</title>
      <meta name="description" content="Browse and book Nepal's top wedding photographers, videographers, decorators and event creatives. Filter by skill, city and availability on Xito." />
      <link rel="canonical" href="https://photography.xitoevents.com/discover" />
      <meta property="og:title" content="Discover Wedding Creatives in Nepal — Xito" />
      <meta property="og:description" content="Browse and book Nepal's top wedding photographers, videographers and event creatives." />
      <meta property="og:url" content="https://photography.xitoevents.com/discover" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Discover Wedding Creatives in Nepal",
        "url": "https://photography.xitoevents.com/discover",
        "about": "Wedding photographers, videographers and event freelancers in Nepal"
      })}</script>
    </Helmet>
    <div className="min-h-screen bg-background pb-6">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 bg-card border-b border-border">
        <div className="max-w-xl lg:max-w-4xl mx-auto space-y-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Discover</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="pl-10 h-11 rounded-xl bg-muted border-0"
            />
          </div>
          <div className="flex gap-2">
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger className="h-9 rounded-xl text-xs flex-1">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue placeholder="All Skills" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {SKILLS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-9 rounded-xl text-xs flex-1">
                <MapPin className="w-3 h-3 mr-1" />
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {NEPAL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date search button */}
          <div className="space-y-2">
            <button
              onClick={() => setDatePickerOpen(true)}
              className="w-full h-10 rounded-xl bg-muted border border-border flex items-center gap-2 px-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span>{searchDates.length > 0 ? `${searchDates.length} date${searchDates.length > 1 ? 's' : ''} selected` : 'Search by Date'}</span>
            </button>

            {searchDates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {searchDates.map(d => {
                  const bs = adToBS(new Date(d + 'T00:00:00'));
                  return (
                    <Badge key={d} variant="secondary" className="rounded-full text-xs px-2.5 py-1 flex items-center gap-1">
                      {bs.day} {nepaliMonthsEnglish[bs.month - 1]} {bs.year}
                      <button onClick={() => handleRemoveDate(d)} className="ml-0.5 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
                <button onClick={() => setSearchDates([])} className="text-xs text-destructive hover:underline">
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 max-w-xl lg:max-w-4xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredFreelancers.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredFreelancers.map(f => {
              const skills = SKILLS.filter(s => f[s.key] === 'YES');
              const counts = bookingCounts?.[f.user_id];
               const rawName = (f.account_type === 'agency' && f.business_name) ? f.business_name : f.full_name;
               const displayName = isGuest ? maskName(rawName) : rawName;
              return (
                <button
                  key={f.id}
                  onClick={() => navigate(`/freelancer/${f.id}`)}
                  className="w-full bg-card rounded-2xl border border-border p-4 text-left transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {isGuest ? (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground bg-gradient-to-br from-primary/20 to-accent/20">
                          ?
                        </div>
                      ) : f.profile_photo_url ? (
                        <img src={f.profile_photo_url} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                          {rawName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
                        {f.account_type === 'agency' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full shrink-0">Agency / Studio</Badge>
                        )}
                      </div>
                      {f.main_job && <span className="text-xs font-semibold text-primary">{f.main_job}</span>}
                      {f.city && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />{f.city}
                        </div>
                      )}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {skills.map(s => (
                            <Badge key={s.key} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">{s.label}</Badge>
                          ))}
                        </div>
                      )}
                      {counts && (
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-semibold">
                            {thisMonthName}: {f.hide_booking_dates ? '**' : counts.thisMonth}
                          </span>
                          <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-semibold">
                            {nextMonthName}: {f.hide_booking_dates ? '**' : counts.nextMonth}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <InlineFollowButton targetUserId={f.user_id} variant="button" />
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              {searchDates.length > 0 ? 'No freelancers available on selected dates' : 'No freelancers found'}
            </p>
          </div>
        )}
      </div>

      <DateSearchPicker
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={handleDateConfirm}
      />
    </div>
    </>
  );
}
