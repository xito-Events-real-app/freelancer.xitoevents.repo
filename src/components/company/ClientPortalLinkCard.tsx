import { useState } from 'react';
import { Copy, MessageCircle, RefreshCw, Power, ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { type AgencyClient } from '@/hooks/useAgencyClients';
import { buildPortalUrl } from '@/lib/portalUrl';
import { portalAdminApi } from '@/lib/portalClient';
import { openWhatsApp } from '@/lib/whatsapp-utils';

interface Props {
  client: AgencyClient & { portal_token?: string | null; portal_enabled?: boolean | null };
}

export default function ClientPortalLinkCard({ client }: Props) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const enabled = client.portal_enabled !== false;
  const token = (client as any).portal_token as string | undefined;

  if (!token) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No portal token yet. Try refreshing.</p>
      </Card>
    );
  }

  const { url } = buildPortalUrl({ clientId: client.id, clientName: client.client_name, token });

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success('Portal link copied');
  };

  const share = () => {
    const phone = client.whatsapp_number || client.contact_number;
    if (!phone) {
      toast.error('No WhatsApp number saved for this client');
      return;
    }
    const text = `Hi ${client.client_name}, here is your private wedding portal:\n${url}`;
    openWhatsApp(phone, text);
  };

  const regenerate = async () => {
    if (!confirm('Regenerate token? Old link will stop working immediately.')) return;
    setBusy(true);
    try {
      await portalAdminApi.regenerateToken(client.id);
      await qc.invalidateQueries({ queryKey: ['agency-clients'] });
      toast.success('New portal link generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to regenerate');
    } finally { setBusy(false); }
  };

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await portalAdminApi.setEnabled(client.id, next);
      await qc.invalidateQueries({ queryKey: ['agency-clients'] });
      toast.success(next ? 'Portal enabled' : 'Portal disabled');
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Client Portal Link</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Share this private link with the client. No login required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{enabled ? 'Enabled' : 'Disabled'}</span>
          <Switch checked={enabled} disabled={busy} onCheckedChange={toggle} />
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
        <code className="text-xs truncate flex-1">{url}</code>
        <Button size="sm" variant="ghost" onClick={() => window.open(url, '_blank')}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button onClick={copy} variant="secondary"><Copy className="h-4 w-4 mr-1" /> Copy</Button>
        <Button onClick={share} className="bg-green-600 hover:bg-green-700"><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
        <Button onClick={regenerate} variant="outline" disabled={busy}><RefreshCw className="h-4 w-4 mr-1" /> Regenerate</Button>
        <Button onClick={() => toggle(!enabled)} variant="outline" disabled={busy}><Power className="h-4 w-4 mr-1" /> {enabled ? 'Disable' : 'Enable'}</Button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Anyone with this link can view this client's portal. Regenerate or disable any time.
      </p>
    </Card>
  );
}
