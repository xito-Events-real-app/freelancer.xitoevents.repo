import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBookingDetailByToken, useUpdateBookingDetailByToken } from '@/hooks/useBookingDetails';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User, Phone, MapPin, Instagram, Send, CheckCircle2, Loader2, ExternalLink, Clock, Building } from 'lucide-react';
import { toast } from 'sonner';

function sanitizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}

export default function EventForm() {
  const { token } = useParams<{ token: string }>();
  const { data: detail, isLoading } = useBookingDetailByToken(token || null);
  const updateMutation = useUpdateBookingDetailByToken();

  const [eventName, setEventName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueArea, setVenueArea] = useState('');
  const [venueMap, setVenueMap] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');

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

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (detail) {
      setEventName(detail.event_name || '');
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
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      await updateMutation.mutateAsync({
        token,
        updates: {
          event_name: eventName,
          venue_name: venueName,
          venue_city: venueCity,
          venue_area: venueArea,
          venue_map: venueMap,
          event_start_time: eventStartTime,
          event_end_time: eventEndTime,
          bride_full_name: brideFullName,
          bride_contact: brideContact,
          bride_whatsapp: brideWhatsapp,
          bride_instagram: brideInstagram,
          bride_home_city: brideHomeCity,
          bride_home_area: brideHomeArea,
          groom_full_name: groomFullName,
          groom_contact: groomContact,
          groom_whatsapp: groomWhatsapp,
          groom_instagram: groomInstagram,
          groom_home_city: groomHomeCity,
          groom_home_area: groomHomeArea,
        },
      });
      setSubmitted(true);
      toast.success('Details submitted successfully!');
    } catch {
      toast.error('Failed to submit. Please try again.');
    }
  };

  const handleShareWithFreelancer = () => {
    const formUrl = `${window.location.origin}/event-form/${token}`;
    const msg = encodeURIComponent(
      `Hey! Here are the details for the event. Check it out:\n\n${formUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-0 shadow-2xl bg-white/90 backdrop-blur">
          <CardContent className="pt-12 pb-10 px-8">
            <Loader2 className="w-12 h-12 animate-spin text-rose-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading event form...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-0 shadow-2xl bg-white/90 backdrop-blur">
          <CardContent className="pt-12 pb-10 px-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Form Not Found</h2>
            <p className="text-gray-600">This form link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur mb-6">
            <CardContent className="pt-10 pb-8 px-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
              <p className="text-gray-600 text-sm">Your event details have been submitted successfully.</p>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-gray-400">Powered by XITO</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-rose-600 bg-clip-text text-transparent">
            Event Details Form
          </h1>
          <p className="text-gray-500 text-xs mt-1">Please fill in the details for this event</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Event Info */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Event & Venue</h3>
                  <p className="text-violet-100 text-xs">Event name, venue & timing</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-gradient-to-b from-violet-50/50 to-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Event Name</Label>
                <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Wedding" className="h-12 bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Venue Name</Label>
                <Input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Hotel Yak & Yeti" className="h-12 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">City</Label>
                  <Input value={venueCity} onChange={e => setVenueCity(e.target.value)} placeholder="Kathmandu" className="h-12 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Area</Label>
                  <Input value={venueArea} onChange={e => setVenueArea(e.target.value)} placeholder="Durbar Marg" className="h-12 bg-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Google Maps Link</Label>
                <Input value={venueMap} onChange={e => setVenueMap(e.target.value)} placeholder="https://maps.google.com/..." className="h-12 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Start Time</Label>
                  <Input type="time" value={eventStartTime} onChange={e => setEventStartTime(e.target.value)} className="h-12 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> End Time</Label>
                  <Input type="time" value={eventEndTime} onChange={e => setEventEndTime(e.target.value)} className="h-12 bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bride */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Bride's Details</h3>
                  <p className="text-rose-100 text-xs">Contact & location information</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-gradient-to-b from-rose-50/50 to-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Full Name</Label>
                <Input value={brideFullName} onChange={e => setBrideFullName(e.target.value)} placeholder="Enter full name" className="h-12 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> Contact</Label>
                  <Input type="tel" maxLength={10} value={brideContact} onChange={e => setBrideContact(sanitizePhone(e.target.value))} placeholder="98XXXXXXXX" className="h-12 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">WhatsApp</Label>
                  <Input value={brideWhatsapp} onChange={e => setBrideWhatsapp(e.target.value)} placeholder="98XXXXXXXX" className="h-12 bg-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Instagram className="w-4 h-4 text-gray-400" /> Instagram</Label>
                <Input value={brideInstagram} onChange={e => setBrideInstagram(e.target.value)} placeholder="username" className="h-12 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Home City</Label>
                  <Input value={brideHomeCity} onChange={e => setBrideHomeCity(e.target.value)} placeholder="Kathmandu" className="h-12 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Home Area</Label>
                  <Input value={brideHomeArea} onChange={e => setBrideHomeArea(e.target.value)} placeholder="Baneshwor" className="h-12 bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Groom */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-500 text-white py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Groom's Details</h3>
                  <p className="text-sky-100 text-xs">Contact & location information</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-gradient-to-b from-sky-50/50 to-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Full Name</Label>
                <Input value={groomFullName} onChange={e => setGroomFullName(e.target.value)} placeholder="Enter full name" className="h-12 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> Contact</Label>
                  <Input type="tel" maxLength={10} value={groomContact} onChange={e => setGroomContact(sanitizePhone(e.target.value))} placeholder="98XXXXXXXX" className="h-12 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">WhatsApp</Label>
                  <Input value={groomWhatsapp} onChange={e => setGroomWhatsapp(e.target.value)} placeholder="98XXXXXXXX" className="h-12 bg-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Instagram className="w-4 h-4 text-gray-400" /> Instagram</Label>
                <Input value={groomInstagram} onChange={e => setGroomInstagram(e.target.value)} placeholder="username" className="h-12 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Home City</Label>
                  <Input value={groomHomeCity} onChange={e => setGroomHomeCity(e.target.value)} placeholder="Kathmandu" className="h-12 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Home Area</Label>
                  <Input value={groomHomeArea} onChange={e => setGroomHomeArea(e.target.value)} placeholder="Baneshwor" className="h-12 bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Share with freelancers */}
          <button
            type="button"
            onClick={handleShareWithFreelancer}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-50 text-violet-600 text-sm font-semibold hover:bg-violet-100 transition-colors border border-violet-200"
          >
            <ExternalLink className="w-4 h-4" />
            Share this form with other freelancers via WhatsApp
          </button>

          {/* Submit */}
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 hover:from-rose-600 hover:via-pink-600 hover:to-rose-600 shadow-lg shadow-rose-200"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-5 h-5" /> Submit Details
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-gray-500">
            Your information is kept confidential and used only for event coordination.
          </p>
        </form>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 py-3">
        <div className="text-center text-xs text-gray-500">Powered by XITO</div>
      </footer>
    </div>
  );
}
