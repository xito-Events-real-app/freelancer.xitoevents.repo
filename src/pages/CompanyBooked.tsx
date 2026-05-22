import { useState, useMemo } from 'react';
import { useAgencyClients } from '@/hooks/useAgencyClients';
import { useAllAgencyEvents } from '@/hooks/useAllAgencyEvents';
import {
  Users, Calendar, Bell, AlertTriangle, Phone, MessageCircle,
  LayoutGrid, Table as TableIcon, RefreshCw, Pencil,
} from 'lucide-react';
import BookingCalendar from '@/components/company/BookingCalendar';
import EditClientDialog from '@/components/company/EditClientDialog';
import Money from '@/components/company/Money';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AgencyClient } from '@/hooks/useAgencyClients';

function getDaysUntil(client: AgencyClient): number | null {
  if (!client.event_date_ad) return null;
  const eventDate = new Date(client.event_date_ad);
  if (isNaN(eventDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getCountdownBadge(days: number | null) {
  if (days === null) return <Badge variant="outline" className="text-muted-foreground">TBD</Badge>;
  if (days <= 0) return <Badge className="bg-red-500 text-white hover:bg-red-500">{days === 0 ? 'TODAY!' : `${Math.abs(days)}d ago`}</Badge>;
  if (days <= 7) return <Badge className="bg-red-500 animate-pulse text-white hover:bg-red-500">{days}d</Badge>;
  if (days <= 30) return <Badge className="bg-orange-500 text-white hover:bg-orange-500">{days}d</Badge>;
  if (days <= 60) return <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400">{days}d</Badge>;
  return <Badge variant="outline" className="text-emerald-600 border-emerald-500">{days}d</Badge>;
}

export default function CompanyBooked() {
  const { data: clients = [], isLoading, refetch } = useAgencyClients();
  const { data: allEvents = [] } = useAllAgencyEvents();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [editingId, setEditingId] = useState<string | null>(null);

  const bookedClients = useMemo(() => clients.filter(c => c.status === 'booked'), [clients]);

  const sortedClients = useMemo(() => {
    // Newest bookings first — sort by created_at desc (fallback id).
    return [...bookedClients].sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tB - tA;
    });
  }, [bookedClients]);

  const urgentClients = sortedClients.filter(c => { const d = getDaysUntil(c); return d !== null && d >= 0 && d <= 7; });
  const upcomingClients = sortedClients.filter(c => { const d = getDaysUntil(c); return d !== null && d > 7 && d <= 30; });
  const missingDateClients = bookedClients.filter(c => !c.event_date_ad);

  const editingClient = clients.find(c => c.id === editingId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Booked Events</h1>
            <p className="text-sm text-muted-foreground">{bookedClients.length} confirmed bookings</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}>
                <LayoutGrid className="h-4 w-4 mr-1" />Cards
              </Button>
              <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
                <TableIcon className="h-4 w-4 mr-1" />Table
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 text-muted-foreground', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold text-blue-700">{bookedClients.length}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Bell className="h-5 w-5 text-red-600 animate-pulse" />
              <div><p className="text-xs text-muted-foreground">Urgent (≤7d)</p><p className="text-xl font-bold text-red-700">{urgentClients.length}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div><p className="text-xs text-muted-foreground">Upcoming (8-30d)</p><p className="text-xl font-bold text-orange-700">{upcomingClients.length}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div><p className="text-xs text-muted-foreground">Missing Dates</p><p className="text-xl font-bold text-amber-700">{missingDateClients.length}</p></div>
            </CardContent>
          </Card>
        </div>
        {/* Booking Calendar */}
        <BookingCalendar events={allEvents} />

        {/* Client List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedClients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No booked events yet</p>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedClients.map(client => {
              const days = getDaysUntil(client);
              return (
                <Card key={client.id} className="hover:border-primary/40 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{client.client_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{client.event_city || 'No location'}</p>
                      </div>
                      {getCountdownBadge(days)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-foreground mb-3">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">{client.event_date_bs || 'Date TBD'}</span>
                    </div>

                    {client.event_name && (
                      <Badge variant="outline" className="text-xs mb-3">
                        {client.event_name}
                      </Badge>
                    )}

                    {client.package_amount > 0 && (
                      <p className="text-xs text-emerald-600 font-medium mb-3"><Money amount={client.package_amount} /></p>
                    )}

                    <div className="flex gap-2">
                      {client.contact_number && (
                        <Button variant="outline" size="sm" className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={() => window.open(`tel:${client.contact_number}`, '_self')}>
                          <Phone className="h-4 w-4 mr-1" />Call
                        </Button>
                      )}
                      {client.whatsapp_number && (
                        <Button variant="outline" size="sm" className="flex-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => window.open(`https://wa.me/${client.whatsapp_number}`, '_blank')}>
                          <MessageCircle className="h-4 w-4 mr-1" />WhatsApp
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="border-amber-200 text-amber-600 hover:bg-amber-50"
                        onClick={() => setEditingId(client.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground">Event Date</TableHead>
                  <TableHead className="text-muted-foreground">Event</TableHead>
                  <TableHead className="text-muted-foreground">Days Left</TableHead>
                  <TableHead className="text-muted-foreground">Location</TableHead>
                  <TableHead className="text-muted-foreground text-right">Package</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map(client => {
                  const days = getDaysUntil(client);
                  return (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{client.client_name}</TableCell>
                      <TableCell className="text-foreground">{client.event_date_bs || '-'}</TableCell>
                      <TableCell className="text-foreground">{client.event_name || '-'}</TableCell>
                      <TableCell>{getCountdownBadge(days)}</TableCell>
                      <TableCell className="text-foreground">{client.event_city || '-'}</TableCell>
                      <TableCell className="text-foreground text-right">
                        {client.package_amount > 0 ? <Money amount={client.package_amount} /> : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {client.contact_number && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`tel:${client.contact_number}`, '_self')}>
                              <Phone className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {client.whatsapp_number && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`https://wa.me/${client.whatsapp_number}`, '_blank')}>
                              <MessageCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(client.id)}>
                            <Pencil className="h-4 w-4 text-amber-600" />
                          </Button>
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

      <EditClientDialog
        client={editingClient}
        open={!!editingId}
        onOpenChange={(o) => { if (!o) setEditingId(null); }}
      />
    </div>
  );
}
