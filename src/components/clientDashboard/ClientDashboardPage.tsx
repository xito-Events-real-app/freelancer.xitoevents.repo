import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type AgencyClient, useAgencyClients } from '@/hooks/useAgencyClients';
import { useClientDashboardData } from '@/hooks/useClientDashboardData';
import { useUpsertCrewAssignment } from '@/hooks/useCrewAssignments';
import {
  clearFinanceSession,
  getStoredFinanceSession,
  useVerifyFinanceSession,
} from '@/hooks/useAgencyFinance';
import FinanceEditDialog from '@/components/company/FinanceEditDialog';
import FinancePinGate from '@/components/company/FinancePinGate';
import EditClientDialog from '@/components/company/EditClientDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { adToBS } from '@/lib/nepaliCalendar';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  client: AgencyClient;
}

const RECENT_KEY = 'wtn:recent-client-ids';
function pushRecent(id: string) {
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [id, ...cur.filter(x => x !== id)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}
function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function parseBSMonthYear(value?: string | null): { year: number; month: number } | null {
  if (!value) return null;
  const normalized = value
    .replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)))
    .toLowerCase();
  const year = Number(normalized.match(/20\d{2}/)?.[0]);
  const monthNames = [
    ['baisakh', 'baishakh', 'बैशाख', 'वैशाख'],
    ['jestha', 'jeth', 'जेठ'],
    ['ashar', 'ashadh', 'असार'],
    ['shrawan', 'sawan', 'श्रावण', 'साउन'],
    ['bhadra', 'भाद्र', 'भदौ'],
    ['ashwin', 'aswin', 'asoj', 'आश्विन', 'असोज'],
    ['kartik', 'कार्तिक', 'कात्तिक'],
    ['mangsir', 'margashirsha', 'मंसिर'],
    ['poush', 'paush', 'पुष', 'पौष'],
    ['magh', 'माघ'],
    ['falgun', 'falgoon', 'फाल्गुण', 'फागुन'],
    ['chaitra', 'चैत'],
  ];
  const month = monthNames.findIndex(names => names.some(name => normalized.includes(name))) + 1;
  if (year && month) return { year, month };
  const numeric = normalized.match(/(20\d{2})[-/\s]+(\d{1,2})[-/\s]+\d{1,2}/);
  if (numeric) return { year: Number(numeric[1]), month: Number(numeric[2]) };
  return null;
}

export default function ClientDashboardPage({ client }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const navigate = useNavigate();
  const { data, isFetching, isLoading } = useClientDashboardData(client.id);
  const { data: allClients = [] } = useAgencyClients();
  const verifySession = useVerifyFinanceSession();
  const upsertCrew = useUpsertCrewAssignment();
  const queryClient = useQueryClient();
  const companyName = useCompanyName();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [waPinOpen, setWaPinOpen] = useState(false);
  const [contractPinOpen, setContractPinOpen] = useState(false);
  const [editPinOpen, setEditPinOpen] = useState(false);
  const [crewPinOpen, setCrewPinOpen] = useState(false);
  const pendingCrewRef = useRef<{ eventId: string; role: string; freelancer: string | null } | null>(null);

  const initialSrc = useMemo(() => {
    const params = new URLSearchParams({ name: client.client_name || '' });
    return `/wtn-dashboard.html?${params.toString()}`;
  }, []);

  useEffect(() => { pushRecent(client.id); }, [client.id]);

  const sendWaPaymentToIframe = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'WTN_SEND_WA_PAYMENT' }, '*');
  };

  // Send hydration & clients list to iframe.
  useEffect(() => {
    const post = (msg: any) => iframeRef.current?.contentWindow?.postMessage(msg, '*');
    const sendAll = () => {
      if (data) post({ type: 'WTN_HYDRATE', payload: { ...data, companyName } });
      post({
        type: 'WTN_CLIENTS',
        clients: allClients.map(c => {
          let bs_year: number | null = null, bs_month: number | null = null;
          const parsedBS = parseBSMonthYear(c.event_date_bs);
          if (parsedBS) {
            bs_year = parsedBS.year;
            bs_month = parsedBS.month;
          }
          if (c.event_date_ad) {
            try {
              const d = new Date(c.event_date_ad);
              if (!isNaN(d.getTime()) && (!bs_year || !bs_month)) {
                const bs = adToBS(d);
                bs_year = bs.year; bs_month = bs.month;
              }
            } catch {}
          }
          return {
            id: c.id,
            client_name: c.client_name,
            event_name: c.event_name,
            event_date_bs: c.event_date_bs,
            event_date_ad: c.event_date_ad,
            event_city: c.event_city,
            status: c.status,
            bs_year, bs_month,
          };
        }),
        recent: readRecent(),
      });
    };
    if (readyRef.current) sendAll();

    const onMsg = (e: MessageEvent) => {
      const m = e?.data; if (!m || typeof m !== 'object') return;
      if (m.type === 'WTN_READY') { readyRef.current = true; sendAll(); return; }
      if (m.type === 'WTN_NAV_CLIENT' && m.clientId) { navigate(`/company/clients/${m.clientId}`); return; }
      if (m.type === 'WTN_OPEN_CONTRACT') {
        const stored = getStoredFinanceSession();
        if (stored?.token) {
          verifySession.mutate(stored.token, {
            onSuccess: (valid) => {
              if (valid) setFinanceOpen(true);
              else { clearFinanceSession(); setContractPinOpen(true); }
            },
            onError: () => { clearFinanceSession(); setContractPinOpen(true); },
          });
        } else {
          setContractPinOpen(true);
        }
        return;
      }
      if (m.type === 'WTN_REQUEST_WA_PAYMENT') {
        // If finance session already valid, just send.
        const stored = getStoredFinanceSession();
        if (stored?.token) {
          verifySession.mutate(stored.token, {
            onSuccess: (valid) => {
              if (valid) sendWaPaymentToIframe();
              else { clearFinanceSession(); setWaPinOpen(true); }
            },
            onError: () => { clearFinanceSession(); setWaPinOpen(true); },
          });
        } else {
          setWaPinOpen(true);
        }
        return;
      }
      if (m.type === 'WTN_EDIT_CLIENT') {
        const stored = getStoredFinanceSession();
        if (stored?.token) {
          verifySession.mutate(stored.token, {
            onSuccess: (valid) => {
              if (valid) setEditOpen(true);
              else { clearFinanceSession(); setEditPinOpen(true); }
            },
            onError: () => { clearFinanceSession(); setEditPinOpen(true); },
          });
        } else {
          setEditPinOpen(true);
        }
        return;
      }
      if (m.type === 'WTN_ASSIGN_CREW' && m.eventId && m.role) {
        const payload = { eventId: m.eventId as string, role: m.role as string, freelancer: (m.freelancer ?? null) as string | null };
        const doAssign = () => {
          upsertCrew.mutate(payload, {
            onSuccess: () => {
              toast.success(payload.freelancer ? 'Crew assigned' : 'Crew unassigned');
              queryClient.invalidateQueries({ queryKey: ['client-dashboard-bundle'] });
            },
            onError: (err: any) => toast.error(err?.message || 'Failed to update crew'),
          });
        };
        const stored = getStoredFinanceSession();
        if (stored?.token) {
          verifySession.mutate(stored.token, {
            onSuccess: (valid) => {
              if (valid) doAssign();
              else { clearFinanceSession(); pendingCrewRef.current = payload; setCrewPinOpen(true); }
            },
            onError: () => { clearFinanceSession(); pendingCrewRef.current = payload; setCrewPinOpen(true); },
          });
        } else {
          pendingCrewRef.current = payload;
          setCrewPinOpen(true);
        }
        return;
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [data, client.id, allClients, navigate, verifySession, companyName, upsertCrew, queryClient]);

  useEffect(() => {
    if (data && (data as any)?.client?.id === client.id) setShowSkeleton(false);
    else setShowSkeleton(true);
  }, [data, client.id]);

  const overlay = showSkeleton || isLoading || (isFetching && (data as any)?.client?.id !== client.id);

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 4rem)' }}>
      <iframe
        ref={iframeRef}
        src={initialSrc}
        title="Client Dashboard"
        className="block w-full h-full border-0 bg-[#faf8f7]"
      />
      {overlay && <DashboardSkeleton clientName={client.client_name} />}

      <FinanceEditDialog
        client={client}
        open={financeOpen}
        onOpenChange={setFinanceOpen}
        onSaved={() => { /* react-query auto invalidates */ }}
      />

      <Dialog open={waPinOpen} onOpenChange={setWaPinOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <FinancePinGate
            compact
            title="Verify Finance PIN"
            onUnlocked={() => { setWaPinOpen(false); sendWaPaymentToIframe(); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={contractPinOpen} onOpenChange={setContractPinOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <FinancePinGate
            compact
            title="Verify Finance PIN"
            onUnlocked={() => { setContractPinOpen(false); setFinanceOpen(true); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editPinOpen} onOpenChange={setEditPinOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <FinancePinGate
            compact
            title="Verify Finance PIN"
            onUnlocked={() => { setEditPinOpen(false); setEditOpen(true); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={crewPinOpen} onOpenChange={(o) => { setCrewPinOpen(o); if (!o) pendingCrewRef.current = null; }}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <FinancePinGate
            compact
            title="Verify Finance PIN"
            onUnlocked={() => {
              setCrewPinOpen(false);
              const p = pendingCrewRef.current; pendingCrewRef.current = null;
              if (p) upsertCrew.mutate(p, {
                onSuccess: () => { toast.success(p.freelancer ? 'Crew assigned' : 'Crew unassigned'); queryClient.invalidateQueries({ queryKey: ['client-dashboard-bundle'] }); },
                onError: (err: any) => toast.error(err?.message || 'Failed to update crew'),
              });
            }}
          />
        </DialogContent>
      </Dialog>

      <EditClientDialog
        client={client}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

function DashboardSkeleton({ clientName }: { clientName: string }) {
  return (
    <div className="absolute inset-0 bg-[#faf8f7] overflow-hidden animate-fade-in">
      <div className="max-w-7xl mx-auto p-6 space-y-5">
        <div className="rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm p-6 shadow-[0_2px_16px_rgba(180,140,130,.07)]">
          <div className="flex items-start gap-5">
            <div className="w-[88px] h-[114px] rounded-xl shimmer" />
            <div className="flex-1 space-y-3 pt-2">
              <div
                className="text-2xl font-semibold text-[#1a1614]/40"
                style={{ fontFamily: '"Cormorant Garamond", serif' }}
              >
                {clientName || 'Loading…'}
              </div>
              <div className="h-3 w-40 rounded-full shimmer" />
              <div className="flex gap-2">
                <div className="h-6 w-24 rounded-full shimmer" />
                <div className="h-6 w-20 rounded-full shimmer" />
                <div className="h-6 w-28 rounded-full shimmer" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="rounded-xl border border-[#ead9d3] bg-white/70 p-4 h-20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-16 rounded-full shimmer" />
                <div className="h-4 w-10 rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .shimmer { background: linear-gradient(90deg,#f0e3dd 0%,#faf2ee 50%,#f0e3dd 100%); background-size: 200% 100%; animation: wtnShimmer 1.4s ease-in-out infinite; }
        @keyframes wtnShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}
