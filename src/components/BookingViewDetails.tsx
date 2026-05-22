import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBookingDetail } from '@/hooks/useBookingDetails';
import { formatBSDate, type NepaliDateObject } from '@/lib/nepaliCalendar';
import { Camera, Video, Plane, MapPin, Clock, Phone, Instagram, User, ExternalLink } from 'lucide-react';

const ROLE_LABELS: Record<string, { label: string; icon: typeof Camera }> = {
  photo: { label: 'Photography', icon: Camera },
  video: { label: 'Videography', icon: Video },
  drone: { label: 'Drone', icon: Plane },
};

const SUB_ROLE_LABELS: Record<string, string> = {
  PB: 'Photo Bride', PG: 'Photo Groom', EP: 'Extra Photographer',
  VB: 'Video Bride', VG: 'Video Groom', EV: 'Extra Videographer',
  Assist: 'Assistant', iPhone: 'iPhone Shooter', GoPro: 'GoPro',
  'Drone Operator': 'Drone Operator',
};

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingDate: NepaliDateObject;
  existingEventName: string;
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: typeof Phone }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1">
      {Icon && <Icon className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-white/80 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function BookingViewDetails({ open, onClose, bookingId, bookingDate, existingEventName }: Props) {
  const { data: detail, isLoading } = useBookingDetail(open ? bookingId : null);

  const bsDateStr = formatBSDate(bookingDate);
  const roleInfo = detail?.role_category ? ROLE_LABELS[detail.role_category] : null;
  const subRoleLabel = detail?.sub_role ? (SUB_ROLE_LABELS[detail.sub_role] || detail.sub_role) : null;

  const hasVenue = detail?.venue_name || detail?.venue_city || detail?.venue_area;
  const hasTiming = detail?.event_start_time || detail?.event_end_time;
  const hasBride = detail?.bride_full_name || detail?.bride_contact || detail?.bride_whatsapp;
  const hasGroom = detail?.groom_full_name || detail?.groom_contact || detail?.groom_whatsapp;
  const hasAnyDetails = hasVenue || hasTiming || hasBride || hasGroom;

  const formatTime = (t: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const isPM = h >= 12;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white border-white/10 p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            📋 Event Details
          </DialogTitle>
          <p className="text-xs text-violet-300">{bsDateStr}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            {/* Event Name */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-base font-bold text-white">{detail?.event_name || existingEventName}</h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {roleInfo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <roleInfo.icon className="w-3.5 h-3.5" />
                    {roleInfo.label}
                  </span>
                )}
                {subRoleLabel && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    {subRoleLabel}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  detail?.is_own_event
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-300'
                }`}>
                  {detail?.is_own_event ? 'Own Event' : 'External Event'}
                </span>
              </div>
            </div>

            {/* Event Owner (if external) */}
            {!detail?.is_own_event && (detail?.event_owner_name || detail?.event_owner_whatsapp) && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Event Owner</p>
                <DetailRow label="Name" value={detail.event_owner_name} icon={User} />
                <DetailRow label="WhatsApp" value={detail.event_owner_whatsapp} icon={Phone} />
              </div>
            )}

            {/* Venue */}
            {hasVenue && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">📍 Venue</p>
                <DetailRow label="Venue" value={detail?.venue_name} icon={MapPin} />
                <DetailRow label="Location" value={[detail?.venue_city, detail?.venue_area].filter(Boolean).join(', ') || null} icon={MapPin} />
                {detail?.venue_map && (
                  <a
                    href={detail.venue_map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in Maps
                  </a>
                )}
              </div>
            )}

            {/* Timing */}
            {hasTiming && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">⏰ Timing</p>
                <div className="flex gap-4">
                  {detail?.event_start_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-xs text-white/80">Start: {formatTime(detail.event_start_time)}</span>
                    </div>
                  )}
                  {detail?.event_end_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-xs text-white/80">End: {formatTime(detail.event_end_time)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bride */}
            {hasBride && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-2">👰 Bride</p>
                <DetailRow label="Name" value={detail?.bride_full_name} icon={User} />
                <DetailRow label="Contact" value={detail?.bride_contact} icon={Phone} />
                <DetailRow label="WhatsApp" value={detail?.bride_whatsapp} icon={Phone} />
                <DetailRow label="Instagram" value={detail?.bride_instagram} icon={Instagram} />
                <DetailRow label="Home" value={[detail?.bride_home_city, detail?.bride_home_area].filter(Boolean).join(', ') || null} icon={MapPin} />
              </div>
            )}

            {/* Groom */}
            {hasGroom && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider mb-2">🤵 Groom</p>
                <DetailRow label="Name" value={detail?.groom_full_name} icon={User} />
                <DetailRow label="Contact" value={detail?.groom_contact} icon={Phone} />
                <DetailRow label="WhatsApp" value={detail?.groom_whatsapp} icon={Phone} />
                <DetailRow label="Instagram" value={detail?.groom_instagram} icon={Instagram} />
                <DetailRow label="Home" value={[detail?.groom_home_city, detail?.groom_home_area].filter(Boolean).join(', ') || null} icon={MapPin} />
              </div>
            )}

            {/* No details yet */}
            {!hasAnyDetails && !roleInfo && (
              <div className="text-center py-8">
                <p className="text-white/30 text-sm">No details added yet</p>
                <p className="text-white/20 text-xs mt-1">Use "Enter Details" to add event information</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
