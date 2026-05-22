import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Camera, Video, Plane, Search, Copy, ExternalLink, ChevronDown, ChevronUp, User } from 'lucide-react';
import { useBookingDetail, useUpsertBookingDetail, useAutoSave, useSearchFreelancers } from '@/hooks/useBookingDetails';
import { formatBSDate, type NepaliDateObject } from '@/lib/nepaliCalendar';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  { key: 'photo', label: 'Photo', icon: Camera },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'drone', label: 'Drone', icon: Plane },
] as const;

const SUB_ROLES: Record<string, { key: string; label: string }[]> = {
  photo: [
    { key: 'PB', label: 'PB' },
    { key: 'PG', label: 'PG' },
    { key: 'EP', label: 'EP' },
    { key: 'Assist', label: 'Assist' },
    { key: 'Other', label: 'Other' },
  ],
  video: [
    { key: 'VB', label: 'VB' },
    { key: 'VG', label: 'VG' },
    { key: 'EV', label: 'EV' },
    { key: 'Assist', label: 'Assist' },
    { key: 'iPhone', label: 'iPhone' },
    { key: 'GoPro', label: 'GoPro' },
    { key: 'Other', label: 'Other' },
  ],
  drone: [
    { key: 'Drone Operator', label: 'Drone Op' },
  ],
};

const SUB_ROLE_DESCRIPTIONS: Record<string, string> = {
  PB: 'Photo Bride', PG: 'Photo Groom', EP: 'Extra Photographer',
  VB: 'Video Bride', VG: 'Video Groom', EV: 'Extra Videographer',
};

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingDate: NepaliDateObject;
  existingEventName: string;
}

export default function BookingDetailPopup({ open, onClose, bookingId, bookingDate, existingEventName }: Props) {
  const { data: detail, isLoading } = useBookingDetail(open ? bookingId : null);
  const upsert = useUpsertBookingDetail();

  const [eventName, setEventName] = useState('');
  const [roleCategory, setRoleCategory] = useState<string | null>(null);
  const [subRole, setSubRole] = useState<string | null>(null);
  const [isOwnEvent, setIsOwnEvent] = useState(true);
  const [ownerName, setOwnerName] = useState('');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Venue
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueArea, setVenueArea] = useState('');
  const [venueMap, setVenueMap] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');

  // Bride/Groom
  const [brideFullName, setBrideFullName] = useState('');
  const [brideContact, setBrideContact] = useState('');
  const [brideWhatsapp, setBrideWhatsapp] = useState('');
  const [brideInstagram, setBrideInstagram] = useState('');
  const [brideHomeCity, setBrideHomeCity] = useState('');
  const [brideHomeArea, setBrideHomeArea] = useState('');
  const [groomFullName, setGroomFullName] = useState('');
  const [groomContact, setGroomContact] = useState('');
  const [groomWhatsapp, setGroomWhatsapp] = useState('');
  const [groomInstagram, setGroomInstagram] = useState('');
  const [groomHomeCity, setGroomHomeCity] = useState('');
  const [groomHomeArea, setGroomHomeArea] = useState('');

  const { data: searchResults = [] } = useSearchFreelancers(ownerSearch);

  // Load existing detail
  useEffect(() => {
    if (detail) {
      setEventName(detail.event_name || existingEventName);
      setRoleCategory(detail.role_category);
      setSubRole(detail.sub_role);
      setIsOwnEvent(detail.is_own_event);
      setOwnerName(detail.event_owner_name || '');
      setOwnerWhatsapp(detail.event_owner_whatsapp || '');
      setVenueName(detail.venue_name || '');
      setVenueCity(detail.venue_city || '');
      setVenueArea(detail.venue_area || '');
      setVenueMap(detail.venue_map || '');
      setEventStartTime(detail.event_start_time || '');
      setEventEndTime(detail.event_end_time || '');
      setBrideFullName(detail.bride_full_name || '');
      setBrideContact(detail.bride_contact || '');
      setBrideWhatsapp(detail.bride_whatsapp || '');
      setBrideInstagram(detail.bride_instagram || '');
      setBrideHomeCity(detail.bride_home_city || '');
      setBrideHomeArea(detail.bride_home_area || '');
      setGroomFullName(detail.groom_full_name || '');
      setGroomContact(detail.groom_contact || '');
      setGroomWhatsapp(detail.groom_whatsapp || '');
      setGroomInstagram(detail.groom_instagram || '');
      setGroomHomeCity(detail.groom_home_city || '');
      setGroomHomeArea(detail.groom_home_area || '');
    } else if (!isLoading && open) {
      setEventName(existingEventName);
    }
  }, [detail, isLoading, open, existingEventName]);

  const doSave = useCallback((updates: Record<string, unknown>) => {
    upsert.mutate({ bookingId, updates });
  }, [bookingId, upsert]);

  const autoSave = useAutoSave(doSave);

  const updateField = (field: string, value: unknown) => {
    autoSave({ [field]: value });
  };

  const formUrl = detail?.form_token
    ? `${window.location.origin}/event-form/${detail.form_token}`
    : null;

  const bsDateStr = formatBSDate(bookingDate);

  const handleCopyLink = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl);
      toast.success('Link copied!');
    }
  };

  const handleSendWhatsApp = () => {
    if (!ownerWhatsapp || !formUrl) return;
    const phone = ownerWhatsapp.replace(/\D/g, '');
    const fullPhone = phone.startsWith('977') ? phone : `977${phone}`;
    const msg = encodeURIComponent(
      `Hello ${ownerName || 'there'}, hope you're doing well! Could you please fill in the event details for the ${bsDateStr} event? Here's the form:\n\n${formUrl}\n\nThank you! 🙏`
    );
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const handleShareWithFreelancer = () => {
    if (!formUrl) return;
    const msg = encodeURIComponent(
      `Hey! Here are the details for our ${bsDateStr} event. Check it out:\n\n${formUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white border-white/10 p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            📅 {bsDateStr}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-5">
            {/* Event Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Event Name</label>
              <input
                value={eventName}
                onChange={e => { setEventName(e.target.value); updateField('event_name', e.target.value); }}
                placeholder="e.g. Wedding at Kathmandu"
                className="w-full h-10 rounded-xl bg-white/10 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Your Role</label>
              <div className="flex gap-2">
                {ROLE_OPTIONS.map(r => {
                  const Icon = r.icon;
                  const isActive = roleCategory === r.key;
                  return (
                    <button
                      key={r.key}
                      onClick={() => {
                        const newVal = isActive ? null : r.key;
                        setRoleCategory(newVal);
                        setSubRole(null);
                        updateField('role_category', newVal);
                        updateField('sub_role', null);
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all text-xs font-semibold
                        ${isActive
                          ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    >
                      <Icon className="w-5 h-5" />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-role */}
            {roleCategory && SUB_ROLES[roleCategory] && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
                  Specific Role
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUB_ROLES[roleCategory].map(sr => {
                    const isActive = subRole === sr.key;
                    return (
                      <button
                        key={sr.key}
                        onClick={() => {
                          const newVal = isActive ? null : sr.key;
                          setSubRole(newVal);
                          updateField('sub_role', newVal);
                        }}
                        title={SUB_ROLE_DESCRIPTIONS[sr.key] || sr.key}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${isActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/15'}`}
                      >
                        {sr.label}
                      </button>
                    );
                  })}
                </div>
                {subRole && SUB_ROLE_DESCRIPTIONS[subRole] && (
                  <p className="text-[10px] text-violet-400">{SUB_ROLE_DESCRIPTIONS[subRole]}</p>
                )}
              </div>
            )}

            {/* Is Own Event */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Is this your own event?</label>
              <div className="flex gap-2">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => {
                      setIsOwnEvent(val);
                      updateField('is_own_event', val);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                      ${isOwnEvent === val
                        ? val ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400' : 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-400'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Owner (if not own) */}
            {!isOwnEvent && (
              <div className="space-y-3 bg-white/5 rounded-xl p-3 border border-white/10">
                <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Whose event is this?</label>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                  <input
                    value={ownerSearch}
                    onChange={e => setOwnerSearch(e.target.value)}
                    placeholder="Search name or number..."
                    className="w-full h-9 rounded-lg bg-white/10 border border-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && ownerSearch.length >= 2 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {searchResults.map(r => (
                      <button
                        key={r.user_id}
                        onClick={() => {
                          setOwnerName(r.full_name);
                          setOwnerWhatsapp(r.whatsapp_number || r.contact_number);
                          setOwnerSearch('');
                          updateField('event_owner_name', r.full_name);
                          updateField('event_owner_whatsapp', r.whatsapp_number || r.contact_number);
                          updateField('event_owner_user_id', r.user_id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-violet-500/30 flex items-center justify-center">
                          {r.profile_photo_url ? (
                            <img src={r.profile_photo_url} className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-violet-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{r.full_name}</p>
                          <p className="text-[10px] text-white/40">{r.whatsapp_number || r.contact_number}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual Input */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40">Name</label>
                    <input
                      value={ownerName}
                      onChange={e => { setOwnerName(e.target.value); updateField('event_owner_name', e.target.value); }}
                      placeholder="Full name"
                      className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40">WhatsApp</label>
                    <input
                      value={ownerWhatsapp}
                      onChange={e => { setOwnerWhatsapp(e.target.value); updateField('event_owner_whatsapp', e.target.value); }}
                      placeholder="98XXXXXXXX"
                      className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* WhatsApp / Copy Link buttons */}
                {ownerName && formUrl && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendWhatsApp}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600/30 text-green-300 text-xs font-semibold hover:bg-green-600/40 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Send via WhatsApp
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white/60 text-xs font-semibold hover:bg-white/15 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Event Details Collapsible - only show when own event */}
            {isOwnEvent && (
              <>
                <button
                  onClick={() => setShowEventDetails(!showEventDetails)}
                  className="w-full flex items-center justify-between py-2 text-xs font-semibold text-violet-300 uppercase tracking-wider"
                >
                  Event Details
                  {showEventDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showEventDetails && (
                  <div className="space-y-4">
                    {/* Venue */}
                    <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
                      <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Venue Details</label>
                      <input
                        value={venueName}
                        onChange={e => { setVenueName(e.target.value); updateField('venue_name', e.target.value); }}
                        placeholder="Venue name"
                        className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={venueCity}
                          onChange={e => { setVenueCity(e.target.value); updateField('venue_city', e.target.value); }}
                          placeholder="City"
                          className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                        <input
                          value={venueArea}
                          onChange={e => { setVenueArea(e.target.value); updateField('venue_area', e.target.value); }}
                          placeholder="Area"
                          className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                      <input
                        value={venueMap}
                        onChange={e => { setVenueMap(e.target.value); updateField('venue_map', e.target.value); }}
                        placeholder="Google Maps link"
                        className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>

                    {/* Event Timing */}
                    <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
                      <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Event Timing</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40">Start</label>
                          <input
                            type="time"
                            value={eventStartTime}
                            onChange={e => { setEventStartTime(e.target.value); updateField('event_start_time', e.target.value); }}
                            className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40">End</label>
                          <input
                            type="time"
                            value={eventEndTime}
                            onChange={e => { setEventEndTime(e.target.value); updateField('event_end_time', e.target.value); }}
                            className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bride Details */}
                    <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
                      <label className="text-xs font-semibold text-rose-300 uppercase tracking-wider">👰 Bride Details</label>
                      <input value={brideFullName} onChange={e => { setBrideFullName(e.target.value); updateField('bride_full_name', e.target.value); }} placeholder="Full name" className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={brideContact} onChange={e => { setBrideContact(e.target.value); updateField('bride_contact', e.target.value); }} placeholder="Contact" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400" />
                        <input value={brideWhatsapp} onChange={e => { setBrideWhatsapp(e.target.value); updateField('bride_whatsapp', e.target.value); }} placeholder="WhatsApp" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input value={brideInstagram} onChange={e => { setBrideInstagram(e.target.value); updateField('bride_instagram', e.target.value); }} placeholder="Instagram" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400" />
                        <input value={brideHomeCity} onChange={e => { setBrideHomeCity(e.target.value); updateField('bride_home_city', e.target.value); }} placeholder="City" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400" />
                        <input value={brideHomeArea} onChange={e => { setBrideHomeArea(e.target.value); updateField('bride_home_area', e.target.value); }} placeholder="Area" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400" />
                      </div>
                    </div>

                    {/* Groom Details */}
                    <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
                      <label className="text-xs font-semibold text-sky-300 uppercase tracking-wider">🤵 Groom Details</label>
                      <input value={groomFullName} onChange={e => { setGroomFullName(e.target.value); updateField('groom_full_name', e.target.value); }} placeholder="Full name" className="w-full h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-400" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={groomContact} onChange={e => { setGroomContact(e.target.value); updateField('groom_contact', e.target.value); }} placeholder="Contact" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-400" />
                        <input value={groomWhatsapp} onChange={e => { setGroomWhatsapp(e.target.value); updateField('groom_whatsapp', e.target.value); }} placeholder="WhatsApp" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input value={groomInstagram} onChange={e => { setGroomInstagram(e.target.value); updateField('groom_instagram', e.target.value); }} placeholder="Instagram" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-400" />
                        <input value={groomHomeCity} onChange={e => { setGroomHomeCity(e.target.value); updateField('groom_home_city', e.target.value); }} placeholder="City" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-400" />
                        <input value={groomHomeArea} onChange={e => { setGroomHomeArea(e.target.value); updateField('groom_home_area', e.target.value); }} placeholder="Area" className="h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-400" />
                      </div>
                    </div>

                    {/* Share with freelancers */}
                    {formUrl && (
                      <button
                        onClick={handleShareWithFreelancer}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500/20 text-violet-300 text-xs font-semibold hover:bg-violet-500/30 transition-colors border border-violet-500/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Share event details with other freelancers
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
