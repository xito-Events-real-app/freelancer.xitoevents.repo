import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSmartBack } from '@/hooks/useSmartBack';
import { Phone, MessageCircle, Mail, MapPin, Calendar, DollarSign, User, Tag, Clock, Pencil, ArrowLeft, Star, Trash2, Plus, RefreshCw, Lock } from 'lucide-react';
import { useAgencyClients, type AgencyClient } from '@/hooks/useAgencyClients';
import { useAgencyClientEvents } from '@/hooks/useAgencyClientEvents';
import { useCrewAssignments } from '@/hooks/useCrewAssignments';
import { CREW_COLUMNS } from '@/lib/crew-columns';
import CompanyClientSidebar, { type SectionType } from '@/components/company/CompanyClientSidebar';
import EditClientDialog from '@/components/company/EditClientDialog';
import ClientPortalLinkCard from '@/components/company/ClientPortalLinkCard';
import ClientPortalDevicePreview from '@/components/company/ClientPortalDevicePreview';
import { buildPortalUrl } from '@/lib/portalUrl';
import DeliverablesSection from '@/components/company/DeliverablesSection';
import ClientDashboardPage from '@/components/clientDashboard/ClientDashboardPage';
import Money from '@/components/company/Money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CompanyClientDetail() {
  const navigate = useNavigate();
  const goBack = useSmartBack('/company');
  const { clientId } = useParams<{ clientId: string }>();
  const { data: clients = [], isLoading } = useAgencyClients();
  const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
  const isMobile = useIsMobile();

  const currentIndex = useMemo(() => {
    if (!clientId) return 0;
    const idx = clients.findIndex((c) => c.id === clientId);
    return idx >= 0 ? idx : 0;
  }, [clients, clientId]);

  const client = clients[currentIndex] as AgencyClient | undefined;

  useEffect(() => {
    if (!isLoading && clients.length > 0 && !clientId) {
      navigate(`/company/clients/${clients[0].id}`, { replace: true });
    }
  }, [isLoading, clients, clientId, navigate]);

  const goTo = useCallback(
    (idx: number) => {
      if (clients[idx]) {
        navigate(`/company/clients/${clients[idx].id}`, { replace: true });
        setActiveSection('dashboard');
      }
    },
    [clients, navigate]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft' && currentIndex > 0) goTo(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < clients.length - 1) goTo(currentIndex + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, clients.length, goTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No clients yet</p>
        <Button onClick={() => navigate('/company/quick-add')}>
          Add Client
        </Button>
      </div>
    );
  }

  if (!client) return null;

  const mobileSections: { id: SectionType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'events', label: 'Events' },
    { id: 'details', label: 'Client' },
    { id: 'notes', label: 'Notes' },
    { id: 'financials', label: 'Financials' },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f7] text-[#1a1614] flex fixed inset-0 z-50">
      {/* Left Sidebar - Hidden on mobile */}
      {!isMobile && (
        <CompanyClientSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onBack={goBack}
          clientName={client.client_name}
          showNavigation
          currentPosition={currentIndex + 1}
          totalCount={clients.length}
          onPrev={() => goTo(currentIndex - 1)}
          onNext={() => goTo(currentIndex + 1)}
          canGoPrev={currentIndex > 0}
          canGoNext={currentIndex < clients.length - 1}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        {isMobile && (
          <div className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-[#ead9d3] p-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="rounded-full text-[#6b5f5c] hover:text-[#c97a6a] hover:bg-[#f5e9e4]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span
                className="text-[#1a1614] font-semibold flex-1 truncate"
                style={{ fontFamily: '"Cormorant Garamond", serif' }}
              >
                {client.client_name}
              </span>
            </div>
          </div>
        )}

        {/* Mobile Section Tabs */}
        {isMobile && (
          <div className="px-4 py-3 border-b border-[#ead9d3] bg-white/60">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="inline-flex gap-2">
                {mobileSections.map((section) => {
                  const active = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'rounded-full text-sm px-3 py-1.5 font-medium transition-colors border',
                        active
                          ? 'bg-gradient-to-r from-[#c97a6a] to-[#d4a574] text-white border-transparent shadow-sm'
                          : 'text-[#6b5f5c] border-[#ead9d3] bg-white/60 hover:bg-[#f5e9e4] hover:text-[#c97a6a]'
                      )}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}


        {/* Section Content */}
        <div className={activeSection === 'dashboard' ? '' : 'p-4 md:p-6 animate-fade-in'}>
          {activeSection === 'dashboard' && <ClientDashboardPage client={client} />}
          {activeSection === 'events' && <EventsSection clientId={client.id} clientName={client.client_name} handler={client.handler} />}
          {activeSection === 'details' && <DetailsSection client={client} />}
          {activeSection === 'notes' && <NotesSection client={client} />}
          {activeSection === 'financials' && <FinancialsSection client={client} />}
          {activeSection === 'link' && (
            <>
              <ClientPortalLinkCard client={client as any} />
              {(client as any).portal_token && (client as any).portal_enabled !== false && (
                <ClientPortalDevicePreview
                  url={buildPortalUrl({
                    clientId: client.id,
                    clientName: client.client_name,
                    token: (client as any).portal_token,
                  }).url}
                />
              )}
            </>
          )}
          {activeSection === 'deliverables' && <DeliverablesSection clientId={client.id} />}
          {['freelancers','registration','inquiry','sales','activity','comments','benzo','files','edit','album'].includes(activeSection) && (
            <ComingSoonSection label={activeSection} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard (Hero Section) ─── */
function DashboardSection({ client }: { client: AgencyClient }) {
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { data: events = [] } = useAgencyClientEvents(client.id);
  const eventIds = useMemo(() => events.map(e => e.id), [events]);
  const { data: assignments = [] } = useCrewAssignments(eventIds);

  const assignmentsByEvent = useMemo(() => {
    const m = new Map<string, { role: string; name: string }[]>();
    assignments.forEach(a => {
      if (!a.assigned_freelancer) return;
      const list = m.get(a.event_id) ?? [];
      list.push({ role: a.role, name: a.assigned_freelancer });
      m.set(a.event_id, list);
    });
    return m;
  }, [assignments]);

  const status = (client.status || 'BOOKED').toUpperCase();
  const statusPill = status.includes('BOOKED')
    ? 'bg-emerald-500/90 text-white'
    : status.includes('INQUIRY')
    ? 'bg-amber-500/90 text-white'
    : status.includes('CANCEL')
    ? 'bg-red-500/90 text-white'
    : 'bg-slate-500/90 text-white';

  const commentText = client.description?.trim();
  const commentCount = commentText ? 1 : 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 p-5 md:p-7 shadow-2xl space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <h1 className="text-xl md:text-2xl font-extrabold text-emerald-300 tracking-wide uppercase">
              {client.client_name}
            </h1>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-slate-800/60 border border-slate-700">
            {[0,1,2,3,4].map(i => (
              <Star key={i} className="h-3.5 w-3.5 text-slate-500" />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] font-bold tracking-widest px-3 py-1 rounded-full', statusPill)}>
            {status}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
              {(client.handler || 'BK').slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs text-slate-300">Benzo Keep</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => setEditing(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <EditClientDialog
        client={client}
        open={editing}
        onOpenChange={setEditing}
        onDeleted={() => navigate('/company')}
      />

      {/* Info pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300">
          <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">?</span>
          <span><span className="text-slate-500">Added:</span> Unknown</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300">
          <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">?</span>
          <span><span className="text-slate-500">Handler:</span> {client.handler || 'Not Assigned'}</span>
        </div>
      </div>

      {/* Status button */}
      <div>
        <Button className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2 shadow-lg h-8 px-4 text-xs font-semibold">
          <RefreshCw className="h-3.5 w-3.5" />
          Status
        </Button>
      </div>

      {/* Quotation + Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Final Fixed Quotation */}
        <div className="relative rounded-xl bg-gradient-to-br from-emerald-600/30 via-teal-600/20 to-emerald-700/30 border border-emerald-500/30 p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
              <Lock className="h-3 w-3" />
              Final Fixed Quotation
            </div>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[11px] text-emerald-300 hover:text-emerald-200"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold tracking-wider text-purple-300 uppercase mb-2">
            Premium
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            <Money amount={client.package_amount} withSuffix />
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-xl bg-slate-800/70 border border-slate-700 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700 bg-slate-800/80">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-300 uppercase">
              <MessageCircle className="h-3 w-3" />
              Comments ({commentCount})
            </div>
            <button className="h-6 w-6 rounded-full bg-slate-700/70 hover:bg-slate-600 text-slate-300 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 flex-1">
            {commentText ? (
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-200 uppercase tracking-wide leading-snug flex-1">
                  {commentText}
                </p>
                <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                  {relativeFromCreated(client.created_at)}
                </span>
              </div>
            ) : (
              <p className="text-sm italic text-slate-500">No comments yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700 overflow-hidden">
        <div className="px-4 py-2.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase border-b border-slate-700 bg-slate-800/80">
          Event Details
        </div>
        {events.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 italic">No events configured</div>
        ) : (
          <div className="divide-y divide-slate-700">
            {events.map(ev => {
              const assigned = assignmentsByEvent.get(ev.id) ?? [];
              const bsLabel = formatBsLabel(ev.event_date_bs);
              return (
                <div key={ev.id} className="grid grid-cols-12 gap-3 px-4 py-4 items-start">
                  {/* Date / Event name */}
                  <div className="col-span-12 md:col-span-2">
                    <div className="text-emerald-400 font-extrabold text-base tracking-wide leading-tight">
                      {bsLabel || 'No date'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1 font-semibold">
                      {(ev.event_name || 'Event').toUpperCase()}
                    </div>
                  </div>

                  {/* Venue + Parlour */}
                  <div className="col-span-12 md:col-span-5 text-xs space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 text-[11px] mt-0.5">Venue:</span>
                      <div className="flex-1">
                        <span className="text-slate-200 font-semibold">—</span>{' '}
                        <span className="text-slate-400">Venue not set</span>
                        <MapPin className="inline-block h-3 w-3 ml-1 text-slate-500" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 text-[11px] mt-0.5">Parlour:</span>
                      <span className="italic text-slate-500">Not set</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="col-span-12 md:col-span-2 text-xs">
                    <span className="text-slate-400">—</span>
                  </div>

                  {/* Assigned crew */}
                  <div className="col-span-12 md:col-span-3">
                    {assigned.length === 0 ? (
                      <div className="text-[11px] italic text-slate-500">No crew assigned</div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {assigned.map((a, i) => {
                          const col = CREW_COLUMNS.find(c => c.key === a.role);
                          const code = col?.shortCode ?? a.role.slice(0, 2).toUpperCase();
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold min-w-7 text-center', roleBadgeClass(code))}>
                                {code}
                              </span>
                              <span className="text-[11px] text-slate-200 font-semibold uppercase tracking-wide">{a.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Notes */}
      <div className="rounded-xl bg-gradient-to-r from-amber-900/30 via-slate-800/40 to-slate-800/20 border-l-4 border-amber-500/70 p-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-2xl leading-none font-serif">"</span>
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-widest text-amber-400 uppercase mb-1">Client Notes</div>
            <div className="text-sm text-slate-200">
              {client.description?.trim() ? client.description : <span className="italic text-slate-500">No notes added</span>}
            </div>
          </div>
          <span className="text-amber-400 text-2xl leading-none font-serif self-end">"</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Coming Soon placeholder ─── */
function ComingSoonSection({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm p-12 text-center shadow-[0_2px_16px_rgba(180,140,130,.07)]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#a39390] font-semibold mb-2">{label}</div>
      <h3
        className="text-xl font-semibold text-[#1a1614] mb-1"
        style={{ fontFamily: '"Cormorant Garamond", serif' }}
      >
        Coming soon
      </h3>
      <p className="text-sm text-[#6b5f5c]">This section is not wired up yet.</p>
    </div>
  );
}

function relativeFromCreated(created: string | null | undefined): string {
  if (!created) return '';
  const diff = Date.now() - new Date(created).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

/* ─── Events ─── */
function EventsSection({ clientId, clientName, handler }: { clientId: string; clientName: string; handler: string | null }) {
  const { data: events = [], isLoading } = useAgencyClientEvents(clientId);
  const eventIds = useMemo(() => events.map(e => e.id), [events]);
  const { data: assignments = [] } = useCrewAssignments(eventIds);

  const assignmentsByEvent = useMemo(() => {
    const m = new Map<string, { role: string; name: string }[]>();
    assignments.forEach(a => {
      if (!a.assigned_freelancer) return;
      const list = m.get(a.event_id) ?? [];
      list.push({ role: a.role, name: a.assigned_freelancer });
      m.set(a.event_id, list);
    });
    return m;
  }, [assignments]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 px-1 border-b border-[#ead9d3] mb-2">
        <h2
          className="text-2xl font-semibold text-[#1a1614]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          {clientName}
        </h2>
        {handler && (
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[hsl(38,70%,88%)] text-[hsl(38,70%,38%)] border border-[hsl(38,55%,78%)]">
            Handler: {handler}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-[#6b5f5c]">Loading event details...</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#ead9d3] bg-white/60 text-center text-[#6b5f5c] py-12">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50 text-[#c97a6a]" />
          <p>No events configured for this client</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm overflow-hidden shadow-[0_2px_16px_rgba(180,140,130,.07)]">
          <div className="px-4 pt-3 pb-2 text-[10px] font-semibold tracking-[0.2em] text-[#a39390] uppercase border-b border-[#f0e3dd] bg-white/40">
            Event Details
          </div>
          <div className="divide-y divide-[#f0e3dd]">
            {events.map(ev => {
              const requiredCrew = (ev.required_crew ?? '').split(',').filter(Boolean);
              const assigned = assignmentsByEvent.get(ev.id) ?? [];
              const bsLabel = formatBsLabel(ev.event_date_bs);
              return (
                <div key={ev.id} className="p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[#c97a6a] font-semibold text-xl leading-tight"
                      style={{ fontFamily: '"Cormorant Garamond", serif' }}
                    >
                      {bsLabel || 'No date'}
                    </div>
                    <div className="text-[10px] text-[#a39390] uppercase tracking-[0.18em] font-semibold mt-0.5">
                      {ev.event_name || 'Event'}
                    </div>
                    {ev.event_date_ad && (
                      <div className="text-[11px] text-[#a39390] mt-1">AD: {ev.event_date_ad}</div>
                    )}
                    {requiredCrew.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-[11px] text-[#6b5f5c] mr-1 self-center">Required:</span>
                        {requiredCrew.map(key => {
                          const col = CREW_COLUMNS.find(c => c.key === key);
                          if (!col) return null;
                          return (
                            <span key={key} className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', roleBadgeClass(col.shortCode))}>
                              {col.shortCode}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: assigned crew */}
                  <div className="md:w-64 shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#a39390] font-semibold mb-1.5 md:text-right">Assigned Crew</div>
                    {assigned.length === 0 ? (
                      <div className="text-sm text-[#a39390] italic md:text-right">No crew assigned</div>
                    ) : (
                      <div className="flex flex-col gap-1.5 md:items-end">
                        {assigned.map((a, i) => {
                          const col = CREW_COLUMNS.find(c => c.key === a.role);
                          const code = col?.shortCode ?? a.role.slice(0, 2).toUpperCase();
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', roleBadgeClass(code))}>
                                {code}
                              </span>
                              <span className="text-sm text-[#1a1614] font-medium">{a.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBsLabel(bs: string | null): string {
  if (!bs) return '';
  // Expecting formats like "2081-01-16" or "Baisakh 16" — normalize to "MONTH DAY"
  const months = ['BAISAKH','JESTHA','ASHADH','SHRAWAN','BHADRA','ASHWIN','KARTIK','MANGSIR','POUSH','MAGH','FALGUN','CHAITRA'];
  const m = bs.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    return `${months[mo - 1] ?? ''} ${d}`.trim();
  }
  return bs.toUpperCase();
}

function roleBadgeClass(code: string): string {
  const c = code.toUpperCase();
  if (c === 'PG' || c === 'PB') return 'bg-[hsl(280,55%,92%)] text-[hsl(280,55%,38%)] border border-[hsl(280,45%,82%)]';
  if (c === 'VB' || c === 'VG') return 'bg-[hsl(260,55%,93%)] text-[hsl(260,50%,42%)] border border-[hsl(260,45%,84%)]';
  if (c === 'EP') return 'bg-[hsl(350,60%,92%)] text-[hsl(350,55%,42%)] border border-[hsl(350,55%,82%)]';
  if (c === 'EV') return 'bg-[hsl(210,60%,92%)] text-[hsl(210,55%,38%)] border border-[hsl(210,50%,82%)]';
  if (c.startsWith('DRONE') || c === 'FPV') return 'bg-[hsl(195,60%,92%)] text-[hsl(195,55%,34%)] border border-[hsl(195,50%,80%)]';
  return 'bg-[hsl(140,50%,92%)] text-[hsl(140,45%,32%)] border border-[hsl(140,40%,80%)]';
}

/* ─── Client Details ─── */
function DetailsSection({ client }: { client: AgencyClient }) {
  return (
    <div className="space-y-4">
      <h2
        className="text-2xl font-semibold text-[#1a1614] mb-4"
        style={{ fontFamily: '"Cormorant Garamond", serif' }}
      >
        Client Details
      </h2>
      <div className="rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm overflow-hidden shadow-[0_2px_16px_rgba(180,140,130,.07)]">
        <div className="p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#c97a6a] to-[#d4a574] shadow-[0_3px_14px_hsl(350,80%,65%,.26)]">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <div
                className="font-semibold text-lg text-[#1a1614]"
                style={{ fontFamily: '"Cormorant Garamond", serif' }}
              >
                Client Details
              </div>
              <div className="text-sm text-[#6b5f5c]">Contact & location information</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DetailField icon={Phone} label="Contact Number" value={client.contact_number} />
            <DetailField icon={MessageCircle} label="WhatsApp" value={client.whatsapp_number} />
            <DetailField icon={Mail} label="Email" value={client.email} />
            <DetailField icon={Tag} label="Source" value={client.source} />
            <DetailField icon={User} label="Handler" value={client.handler} />
            <DetailField icon={MapPin} label="Event City" value={client.event_city} />
            <DetailField icon={MapPin} label="Event Area" value={client.event_area} />
            <DetailField icon={MapPin} label="Location Type" value={client.event_location_type} />
            <DetailField icon={MapPin} label="From City" value={client.event_from_city} />
            <DetailField icon={MapPin} label="To City" value={client.event_to_city} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Notes ─── */
function NotesSection({ client }: { client: AgencyClient }) {
  return (
    <div className="space-y-4">
      <h2
        className="text-2xl font-semibold text-[#1a1614] mb-4"
        style={{ fontFamily: '"Cormorant Garamond", serif' }}
      >
        Notes
      </h2>

      <div className="rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm p-4 shadow-[0_2px_16px_rgba(180,140,130,.07)]">
        <div className="text-[10px] text-[#a39390] mb-2 uppercase tracking-[0.2em] font-semibold">Description</div>
        <div className="text-sm text-[#1a1614] whitespace-pre-wrap">
          {client.description || <span className="text-[#a39390] italic">No description</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm p-4 shadow-[0_2px_16px_rgba(180,140,130,.07)]">
        <div className="text-[10px] text-[#a39390] mb-2 uppercase tracking-[0.2em] font-semibold">Notes</div>
        <div className="text-sm text-[#1a1614] whitespace-pre-wrap">
          {client.notes || <span className="text-[#a39390] italic">No notes</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Financials ─── */
function FinancialsSection({ client }: { client: AgencyClient }) {
  const remaining = client.package_amount - client.advance_amount;
  const paidPercentage = client.package_amount > 0
    ? Math.round((client.advance_amount / client.package_amount) * 100)
    : 0;

  const statCard = "rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm p-6 text-center shadow-[0_2px_16px_rgba(180,140,130,.07)]";

  return (
    <div className="space-y-4">
      <h2
        className="text-2xl font-semibold text-[#1a1614] mb-4"
        style={{ fontFamily: '"Cormorant Garamond", serif' }}
      >
        Financials
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={statCard}>
          <DollarSign className="w-8 h-8 mx-auto text-[#a39390] mb-2" />
          <div className="text-[10px] text-[#a39390] uppercase tracking-[0.2em] font-semibold mb-1">Package Amount</div>
          <div
            className="text-3xl font-semibold text-[#1a1614]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            <Money amount={client.package_amount} />
          </div>
        </div>
        <div className={statCard}>
          <DollarSign className="w-8 h-8 mx-auto text-[hsl(140,55%,42%)] mb-2" />
          <div className="text-[10px] text-[#a39390] uppercase tracking-[0.2em] font-semibold mb-1">Advance Paid</div>
          <div
            className="text-3xl font-semibold text-[hsl(140,55%,38%)]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            <Money amount={client.advance_amount} />
          </div>
        </div>
        <div className={statCard}>
          <DollarSign className={cn('w-8 h-8 mx-auto mb-2', remaining > 0 ? 'text-[#c97a6a]' : 'text-[hsl(140,55%,42%)]')} />
          <div className="text-[10px] text-[#a39390] uppercase tracking-[0.2em] font-semibold mb-1">Remaining</div>
          <div
            className={cn('text-3xl font-semibold', remaining > 0 ? 'text-[#c97a6a]' : 'text-[hsl(140,55%,38%)]')}
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            <Money amount={remaining} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-[#ead9d3] bg-white/70 backdrop-blur-sm p-4 shadow-[0_2px_16px_rgba(180,140,130,.07)]">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#6b5f5c]">Payment Progress</span>
          <span className="text-[#1a1614] font-semibold">{paidPercentage}%</span>
        </div>
        <div className="w-full h-3 bg-[#f5e9e4] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c97a6a] to-[#d4a574] rounded-full transition-all duration-500"
            style={{ width: `${paidPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function DetailField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="p-3 rounded-xl bg-white/60 border border-[#f0e3dd]">
      <div className="flex items-center gap-2 text-[10px] text-[#a39390] uppercase tracking-[0.18em] font-semibold mb-1">
        <Icon className="h-3.5 w-3.5 text-[#c97a6a]" />
        {label}
      </div>
      <div className="text-sm text-[#1a1614] font-medium">{value}</div>
    </div>
  );
}

function getEventTypeColor(eventName: string): string {
  const upper = eventName.toUpperCase();
  if (upper.includes('WEDDING')) return 'bg-primary/10 text-primary border-primary/30';
  if (upper.includes('RECEPTION')) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (upper.includes('ENGAGEMENT')) return 'bg-pink-100 text-pink-700 border-pink-200';
  if (upper.includes('MEHNDI')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (upper.includes('PRE')) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-muted text-muted-foreground border-border';
}
