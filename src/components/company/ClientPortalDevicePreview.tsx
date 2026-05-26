import { useState } from 'react';
import { RefreshCw, ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  url: string;
}

/**
 * iPhone 17 Pro Max styled device frame that embeds the client portal URL
 * in an iframe so the photographer sees exactly what the client sees.
 */
export default function ClientPortalDevicePreview({ url }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mt-6 space-y-4">
      {/* Header / toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold leading-tight">Live Preview</h3>
            <p className="text-xs text-muted-foreground">Exactly what your client sees on their phone</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(url, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-1" /> Open
          </Button>
        </div>
      </div>

      {/* Device wrapper */}
      <div className="flex justify-center py-6">
        <div
          className="relative"
          style={{
            width: 380,
            height: 800,
          }}
        >
          {/* Titanium frame */}
          <div
            className="absolute inset-0 rounded-[58px] shadow-2xl"
            style={{
              background:
                'linear-gradient(135deg, #3a3a3d 0%, #1c1c1e 25%, #0a0a0a 50%, #1c1c1e 75%, #3a3a3d 100%)',
              padding: 4,
            }}
          >
            {/* Inner bezel */}
            <div
              className="w-full h-full rounded-[55px] bg-black overflow-hidden relative"
              style={{ padding: 10 }}
            >
              {/* Screen */}
              <div className="w-full h-full rounded-[46px] overflow-hidden bg-white relative">
                <iframe
                  key={refreshKey}
                  src={url}
                  title="Client Portal Preview"
                  className="w-full h-full border-0"
                  loading="lazy"
                  allow="clipboard-write; fullscreen; geolocation"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
                />

                {/* Dynamic Island */}
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-black rounded-full pointer-events-none z-10"
                  style={{ width: 115, height: 34 }}
                />
              </div>
            </div>
          </div>

          {/* Side buttons */}
          {/* Action button (left top) */}
          <div
            className="absolute -left-[3px] rounded-l-sm"
            style={{
              top: 95,
              width: 4,
              height: 28,
              background: 'linear-gradient(90deg, #1c1c1e, #3a3a3d)',
            }}
          />
          {/* Volume up */}
          <div
            className="absolute -left-[3px] rounded-l-sm"
            style={{
              top: 145,
              width: 4,
              height: 55,
              background: 'linear-gradient(90deg, #1c1c1e, #3a3a3d)',
            }}
          />
          {/* Volume down */}
          <div
            className="absolute -left-[3px] rounded-l-sm"
            style={{
              top: 215,
              width: 4,
              height: 55,
              background: 'linear-gradient(90deg, #1c1c1e, #3a3a3d)',
            }}
          />
          {/* Power button (right) */}
          <div
            className="absolute -right-[3px] rounded-r-sm"
            style={{
              top: 170,
              width: 4,
              height: 90,
              background: 'linear-gradient(270deg, #1c1c1e, #3a3a3d)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
