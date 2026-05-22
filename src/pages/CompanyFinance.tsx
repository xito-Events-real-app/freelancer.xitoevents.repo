import { useState, useMemo, useCallback } from 'react';
import { useAgencyClients } from '@/hooks/useAgencyClients';
import { useAllAgencyEvents } from '@/hooks/useAllAgencyEvents';
import {
  Users, DollarSign, TrendingUp, Wallet, ArrowDownCircle,
  LayoutGrid, Table as TableIcon, RefreshCw, ChevronLeft, ChevronRight, X,
  Phone, MessageCircle, Calendar, Pencil, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { adToBS, getCurrentBSDate, nepaliMonthsEnglish, type NepaliDateObject } from '@/lib/nepaliCalendar';
import FinanceEditDialog from '@/components/company/FinanceEditDialog';
import Money from '@/components/company/Money';
import { useFinanceVisibility } from '@/contexts/FinanceVisibilityContext';

const toUpper = (value?: string | null) => (value || '-').toUpperCase();

function parseClientBSDate(date?: string | null): NepaliDateObject | null {
  if (!date) return null;
  const normalized = date.replace(/,/g, '').trim();
  const parts = normalized.split(/\s+/);
  const day = Number(parts[0]);
  const month = nepaliMonthsEnglish.findIndex(m => m.toLowerCase() === parts[1]?.toLowerCase()) + 1;
  const year = Number(parts[2]);
  return day && month && year ? { day, month, year } : null;
}

export default function CompanyFinance() {
  return <CompanyFinanceContent />;
}

function CompanyFinanceContent() {
  const { data: clients = [], isLoading, refetch } = useAgencyClients();
  const { data: allEvents = [] } = useAllAgencyEvents();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const editingClient = useMemo(
    () => clients.find(c => c.id === editingClientId) ?? null,
    [clients, editingClientId],
  );
  const { revealed: amountsVisible, unlock, lock } = useFinanceVisibility();
  const setAmountsVisible = useCallback((next: boolean | ((v: boolean) => boolean)) => {
    const target = typeof next === 'function' ? (next as (v: boolean) => boolean)(amountsVisible) : next;
    if (target) unlock(); else lock();
  }, [amountsVisible, unlock, lock]);
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [bsYear, setBsYear] = useState<number | null>(currentBS.year);
  const [bsMonth, setBsMonth] = useState<number | null>(currentBS.month);

  const fmt = useCallback(
    (n: number) => <Money amount={n} />,
    [],
  );

  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => currentBS.year - 2 + i), [currentBS.year]);

  const prevMonth = () => {
    const month = bsMonth ?? currentBS.month;
    const year = bsYear ?? currentBS.year;
    if (month === 1) { setBsMonth(12); setBsYear(year - 1); } else { setBsMonth(month - 1); setBsYear(year); }
  };

  const nextMonth = () => {
    const month = bsMonth ?? currentBS.month;
    const year = bsYear ?? currentBS.year;
    if (month === 12) { setBsMonth(1); setBsYear(year + 1); } else { setBsMonth(month + 1); setBsYear(year); }
  };

  const eventMap = useMemo(() => {
    const map = new Map<string, Array<{ date: NepaliDateObject | null; eventName: string | null }>>();
    allEvents.forEach(event => {
      const date = event.event_date_ad ? adToBS(new Date(`${event.event_date_ad}T00:00:00`)) : parseClientBSDate(event.event_date_bs);
      const events = map.get(event.client_id) || [];
      events.push({ date, eventName: event.event_name });
      map.set(event.client_id, events);
    });
    return map;
  }, [allEvents]);

  const getClientEvents = useCallback((client: (typeof clients)[number]) => {
    const events = eventMap.get(client.id) || [];
    if (events.length > 0) return events.sort((a, b) => (a.date?.day || 0) - (b.date?.day || 0));
    return [{ date: parseClientBSDate(client.event_date_bs), eventName: client.event_name }];
  }, [eventMap]);

  const filteredClients = useMemo(() => {
    if (!bsYear || !bsMonth) return clients;
    return clients.filter(client => getClientEvents(client).some(event => event.date?.year === bsYear && event.date.month === bsMonth));
  }, [clients, getClientEvents, bsYear, bsMonth]);

  const totalValue = useMemo(() => filteredClients.reduce((sum, c) => sum + c.package_amount, 0), [filteredClients]);
  const totalAdvance = useMemo(() => filteredClients.reduce((sum, c) => sum + (c.advance_amount || 0), 0), [filteredClients]);
  const totalRemaining = totalValue - totalAdvance;

  const sortedClients = useMemo(() => [...filteredClients].sort((a, b) => b.package_amount - a.package_amount), [filteredClients]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-emerald-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Finance Manager</h1>
            <p className="text-sm text-emerald-400">{filteredClients.length} clients tracked</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAmountsVisible((v) => !v)}
              className={cn(
                'gap-1.5 border',
                amountsVisible
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white',
              )}
              title={amountsVisible ? 'Hide amounts' : 'Show amounts'}
            >
              {amountsVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{amountsVisible ? 'Hide' : 'Show'} amounts</span>
            </Button>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}>
                <LayoutGrid className="h-4 w-4 mr-1" />Cards
              </Button>
              <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
                <TableIcon className="h-4 w-4 mr-1" />Table
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 text-slate-400', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className="bg-blue-500/20 border-blue-500/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="h-5 w-5 text-blue-400" /></div>
                <div><p className="text-xs text-blue-300">Total Clients</p><p className="text-xl font-bold text-blue-100">{filteredClients.length}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/20 border-emerald-500/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg"><TrendingUp className="h-5 w-5 text-emerald-400" /></div>
                <div><p className="text-xs text-emerald-300">Total Value</p><p className="text-xl font-bold text-emerald-100">{fmt(totalValue)}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-500/20 border-cyan-500/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg"><ArrowDownCircle className="h-5 w-5 text-cyan-400" /></div>
                <div><p className="text-xs text-cyan-300">Total Advance</p><p className="text-xl font-bold text-cyan-100">{fmt(totalAdvance)}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/20 border-amber-500/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg"><Wallet className="h-5 w-5 text-amber-400" /></div>
                <div><p className="text-xs text-amber-300">Remaining</p><p className="text-xl font-bold text-amber-100">{fmt(totalRemaining)}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/20 border-purple-500/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg"><DollarSign className="h-5 w-5 text-purple-400" /></div>
                <div><p className="text-xs text-purple-300">Avg Package</p><p className="text-xl font-bold text-purple-100">{fmt(filteredClients.length > 0 ? totalValue / filteredClients.length : 0)}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-slate-800/60 p-3 shadow-lg shadow-emerald-950/20">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold uppercase tracking-wide text-white">Filters</span>
          <Select value={bsYear ? String(bsYear) : 'all'} onValueChange={v => setBsYear(v === 'all' ? null : Number(v))}>
            <SelectTrigger className="h-9 w-28 bg-white/10 border-white/20 text-white [&>svg]:text-white">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={bsMonth ? String(bsMonth) : 'all'} onValueChange={v => setBsMonth(v === 'all' ? null : Number(v))}>
            <SelectTrigger className="h-9 w-40 bg-white/10 border-white/20 text-white [&>svg]:text-white">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="all">All Months</SelectItem>
              {nepaliMonthsEnglish.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-auto border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={() => { setBsYear(null); setBsMonth(null); }}>
            <X className="mr-1 h-4 w-4" /> All Records
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-3 gap-4">
            {sortedClients.map(client => {
              const advance = client.advance_amount || 0;
              const remaining = client.package_amount - advance;
              return (
                <Card key={client.id} className="bg-slate-800/60 border-slate-700/50 hover:border-emerald-500/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white truncate">{toUpper(client.client_name)}</h3>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingClientId(client.id)}>
                              <Pencil className="h-3.5 w-3.5 text-cyan-400" />
                            </Button>
                          </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                           <Calendar className="h-3 w-3" /><span>{getClientEvents(client)[0]?.date ? `${getClientEvents(client)[0].date!.day} ${nepaliMonthsEnglish[getClientEvents(client)[0].date!.month - 1]} ${getClientEvents(client)[0].date!.year}` : 'DATE TBD'}</span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">{fmt(client.package_amount)}</Badge>
                    </div>
                    <div className="flex gap-3 text-xs mb-3">
                      <span className="text-cyan-400">Advance: {fmt(advance)}</span>
                      <span className="text-amber-400">Due: {fmt(remaining)}</span>
                    </div>
                    <div className="flex gap-2">
                      {client.contact_number && (
                        <Button variant="outline" size="sm" className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          onClick={() => window.open(`tel:${client.contact_number}`, '_self')}>
                          <Phone className="h-4 w-4 mr-1" />Call
                        </Button>
                      )}
                      {client.whatsapp_number && (
                        <Button variant="outline" size="sm" className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={() => window.open(`https://wa.me/${client.whatsapp_number}`, '_blank')}>
                          <MessageCircle className="h-4 w-4 mr-1" />WhatsApp
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400">Client</TableHead>
                  <TableHead className="text-slate-400">Event</TableHead>
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Location</TableHead>
                  <TableHead className="text-slate-400 text-right">Package</TableHead>
                  <TableHead className="text-slate-400 text-right">Advance</TableHead>
                  <TableHead className="text-slate-400 text-right">Remaining</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map(client => {
                  const advance = client.advance_amount || 0;
                  const remaining = client.package_amount - advance;
                  return (
                    <TableRow key={client.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span>{toUpper(client.client_name)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingClientId(client.id)}>
                            <Pencil className="h-3.5 w-3.5 text-cyan-400" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{toUpper(client.event_name)}</TableCell>
                      <TableCell className="text-slate-300">
                        <div className="space-y-1">
                          {getClientEvents(client).map((event, index) => (
                            <div key={`${client.id}-${index}`} className="whitespace-nowrap">
                              {event.date ? `${event.date.day} ${nepaliMonthsEnglish[event.date.month - 1]} ${event.date.year}` : '-'} {event.eventName ? `(${toUpper(event.eventName)})` : ''}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{toUpper(client.event_city)}</TableCell>
                      <TableCell className="text-emerald-400 font-semibold text-right">{fmt(client.package_amount)}</TableCell>
                      <TableCell className="text-cyan-400 text-right">{fmt(advance)}</TableCell>
                      <TableCell className="text-amber-400 text-right">{fmt(remaining)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {client.contact_number && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`tel:${client.contact_number}`, '_self')}>
                              <Phone className="h-4 w-4 text-blue-400" />
                            </Button>
                          )}
                          {client.whatsapp_number && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`https://wa.me/${client.whatsapp_number}`, '_blank')}>
                              <MessageCircle className="h-4 w-4 text-green-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      <FinanceEditDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClientId(null)}
        onSaved={() => refetch()}
      />
    </div>
  );
}
