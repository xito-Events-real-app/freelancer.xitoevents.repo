import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, whatsapp: string) => void;
  eventName?: string;
  eventDate?: string;
}

export function QuickAddFreelancerDialog({ open, onOpenChange, onSave, eventName, eventDate }: Props) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');
    onSave(name.trim(), cleanWhatsapp);

    // Open WhatsApp invite
    if (cleanWhatsapp) {
      const appUrl = window.location.origin;
      const msg = encodeURIComponent(
        `You have been assigned for ${eventName || 'an event'} on ${eventDate || 'upcoming date'}. Sign up at ${appUrl} to get details and manage your bookings.`
      );
      window.open(`https://wa.me/${cleanWhatsapp}?text=${msg}`, '_blank');
    }

    setName('');
    setWhatsapp('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="uppercase font-black text-sm">ADD NEW FREELANCER</DialogTitle>
          <DialogDescription className="text-xs uppercase">
            TEMPORARY ASSIGNMENT — REPLACE LATER WITH REGISTERED FREELANCER
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs font-bold uppercase">NAME</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name..."
              className="h-9 text-sm uppercase"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase">WHATSAPP NUMBER</Label>
            <Input
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="9771234567890"
              className="h-9 text-sm"
              type="tel"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full uppercase font-black text-xs"
          >
            SAVE & SEND WHATSAPP INVITE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
