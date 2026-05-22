import { Calendar } from 'lucide-react';
import type { AgencyClient } from '@/hooks/useAgencyClients';
import Money from '@/components/company/Money';

interface Props {
  client: AgencyClient;
}

export default function AgencyFinanceCard({ client }: Props) {
  return (
    <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{client.client_name}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{client.event_name || 'Event'}</span>
          {client.event_date_bs && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {client.event_date_bs}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-bold text-emerald-400">
        <Money amount={client.package_amount} />
      </p>
    </div>
  );
}
