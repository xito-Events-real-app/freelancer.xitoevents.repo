import { differenceInDays, parseISO } from 'date-fns';
import { Phone, MessageSquare, Trash2, Calendar } from 'lucide-react';
import type { AgencyClient } from '@/hooks/useAgencyClients';
import Money from '@/components/company/Money';

function countdownBadge(dateAd: string | null) {
  if (!dateAd) return null;
  const days = differenceInDays(parseISO(dateAd), new Date());
  if (days < 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-600/60 text-slate-300">
        Past
      </span>
    );
  const style =
    days < 7
      ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
      : days < 30
      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      : days < 60
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style}`}>
      {days}d to go
    </span>
  );
}

interface Props {
  client: AgencyClient;
  onDelete?: (id: string) => void;
}

export default function AgencyClientCard({ client, onDelete }: Props) {
  const waLink = client.whatsapp_number
    ? `https://wa.me/${client.whatsapp_number.replace(/[^0-9]/g, '')}`
    : null;

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">{client.client_name}</h3>
            {countdownBadge(client.event_date_ad)}
          </div>
          {client.event_name && (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {client.event_name}
            </span>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(client.id)}
            className="text-slate-500 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Event info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {client.event_date_bs && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {client.event_date_bs}
          </span>
        )}
        {client.event_city && (
          <span>
            {client.event_city}
            {client.event_area ? `, ${client.event_area}` : ''}
          </span>
        )}
      </div>

      {/* Package amount */}
      {client.package_amount > 0 && (
        <p className="text-sm font-semibold text-emerald-400">
          <Money amount={client.package_amount} />
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {client.contact_number && (
          <a
            href={`tel:${client.contact_number}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <Phone className="w-3 h-3" /> Call
          </a>
        )}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <MessageSquare className="w-3 h-3" /> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
