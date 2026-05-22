import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, DollarSign, User, Phone, Mail, CalendarDays, MapPin, FileText, IndianRupee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMyProfile } from '@/hooks/useProfile';
import { useAgencyClients, useAddAgencyClient, useDeleteAgencyClient } from '@/hooks/useAgencyClients';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import Money from '@/components/company/Money';
import AgencyClientCard from '@/components/AgencyClientCard';
import AgencyFinanceCard from '@/components/AgencyFinanceCard';
import FormSection from '@/components/agency/FormSection';
import { EVENT_TYPES, NEPAL_CITIES } from '@/lib/constants';

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useMyProfile();
  const { data: clients = [], isLoading } = useAgencyClients();
  const addClient = useAddAgencyClient();
  const deleteClient = useDeleteAgencyClient();

  const [activeTab, setActiveTab] = useState<'add' | 'booked' | 'finance'>('add');
  const [clientName, setClientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDateBs, setEventDateBs] = useState('');
  const [eventDateAd, setEventDateAd] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [eventArea, setEventArea] = useState('');
  const [packageAmount, setPackageAmount] = useState('');
  const [notes, setNotes] = useState('');

  const companyName = profile?.business_name || profile?.full_name || 'My Company';

  const resetForm = () => {
    setClientName(''); setContactNumber(''); setWhatsappNumber('');
    setEmail(''); setEventName(''); setEventDateBs(''); setEventDateAd('');
    setEventCity(''); setEventArea(''); setPackageAmount(''); setNotes('');
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast({ title: 'Client name is required', variant: 'destructive' });
      return;
    }
    try {
      await addClient.mutateAsync({
        client_name: clientName.trim(),
        contact_number: contactNumber || null,
        whatsapp_number: whatsappNumber || null,
        email: email || null,
        event_name: eventName || null,
        event_date_bs: eventDateBs || null,
        event_date_ad: eventDateAd || null,
        event_city: eventCity || null,
        event_area: eventArea || null,
        package_amount: parseInt(packageAmount) || 0,
        status: 'booked',
        notes: notes || null,
        source: null,
        handler: null,
        event_location_type: null,
        event_from_city: null,
        event_to_city: null,
        advance_amount: 0,
        description: null,
      });
      toast({ title: 'Client added successfully' });
      resetForm();
    } catch {
      toast({ title: 'Failed to add client', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient.mutateAsync(id);
      toast({ title: 'Client removed' });
    } catch {
      toast({ title: 'Failed to delete client', variant: 'destructive' });
    }
  };

  const handleDateSelect = (adDate: string, bsDisplay: string) => {
    setEventDateAd(adDate);
    setEventDateBs(bsDisplay);
  };

  const totalPackage = clients.reduce((sum, c) => sum + c.package_amount, 0);
  const bookedClients = clients.filter(c => c.status === 'booked');

  const tabs = [
    { key: 'add' as const, icon: Plus, label: 'Add Client' },
    { key: 'booked' as const, icon: Users, label: `Booked (${bookedClients.length})` },
    { key: 'finance' as const, icon: DollarSign, label: 'Finance' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="font-bold text-white truncate">{companyName}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-1 mb-6">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Add Client */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            <FormSection
              icon={<User className="w-4 h-4 text-blue-400" />}
              title="Client Information"
              gradientFrom="from-blue-500/20"
              gradientTo="to-blue-600/10"
              borderColor="border-blue-500/30"
            >
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Client Name *</label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client's full name" className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
              </div>
            </FormSection>

            <FormSection
              icon={<Phone className="w-4 h-4 text-purple-400" />}
              title="Contact Details"
              gradientFrom="from-purple-500/20"
              gradientTo="to-purple-600/10"
              borderColor="border-purple-500/30"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">Contact Number</label>
                  <Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="98XXXXXXXX" className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">WhatsApp</label>
                  <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="98XXXXXXXX" className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
              </div>
            </FormSection>

            <FormSection
              icon={<CalendarDays className="w-4 h-4 text-emerald-400" />}
              title="Event Details"
              gradientFrom="from-emerald-500/20"
              gradientTo="to-emerald-600/10"
              borderColor="border-emerald-500/30"
            >
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Event Type</label>
                <Select value={eventName} onValueChange={setEventName}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Event Date (BS)</label>
                <div className="flex items-center gap-2">
                  <NepaliDatePicker onDateSelect={handleDateSelect} triggerLabel={eventDateBs || 'Pick Date'} />
                  {eventDateBs && <span className="text-sm text-slate-400">{eventDateBs}</span>}
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={<MapPin className="w-4 h-4 text-amber-400" />}
              title="Location"
              gradientFrom="from-amber-500/20"
              gradientTo="to-amber-600/10"
              borderColor="border-amber-500/30"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">City</label>
                  <Select value={eventCity} onValueChange={setEventCity}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {NEPAL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">Area</label>
                  <Input value={eventArea} onChange={e => setEventArea(e.target.value)} placeholder="Area / Landmark" className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={<IndianRupee className="w-4 h-4 text-pink-400" />}
              title="Package & Notes"
              gradientFrom="from-pink-500/20"
              gradientTo="to-pink-600/10"
              borderColor="border-pink-500/30"
            >
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Package Amount (NPR)</label>
                <Input type="number" value={packageAmount} onChange={e => setPackageAmount(e.target.value)} placeholder="0" className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Status</label>
                <Input value="Booked" disabled className="bg-slate-700/30 border-slate-600/50 text-slate-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Notes</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3} className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
              </div>
            </FormSection>

            <button
              onClick={handleSubmit}
              disabled={addClient.isPending}
              className="w-full py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
            >
              {addClient.isPending ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        )}

        {/* Booked Clients */}
        {activeTab === 'booked' && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookedClients.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-sm text-slate-400">No booked clients yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookedClients.map(c => (
                  <AgencyClientCard key={c.id} client={c} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Finance */}
        {activeTab === 'finance' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400"><Money amount={totalPackage} /></p>
                <p className="text-xs text-slate-400 mt-1">Total Package Value</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{clients.length}</p>
                <p className="text-xs text-slate-400 mt-1">Total Clients</p>
              </div>
            </div>

            {clients.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No clients to show</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map(c => (
                  <AgencyFinanceCard key={c.id} client={c} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
