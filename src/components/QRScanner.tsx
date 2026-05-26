import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { ArrowLeft, Camera, Image, SwitchCamera, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
  onClose: () => void;
  onResult: (data: string) => void;
}

type PermissionState = 'loading' | 'granted' | 'denied' | 'unavailable';

export default function QRScanner({ onClose, onResult }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [permission, setPermission] = useState<PermissionState>('loading');
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopCamera();

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermission('unavailable');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setPermission('granted');
            setScanning(true);
          });
        };
      }
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermission('denied');
      } else {
        setPermission('unavailable');
      }
    }
  }, [stopCamera]);

  // Start camera immediately on mount — browser will show native permission dialog
  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
    };
  }, []);

  // QR scanning loop
  useEffect(() => {
    if (!scanning) return;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code) {
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
        stopCamera();
        onResult(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scanning, stopCamera, onResult]);

  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const handleRetry = async () => {
    setRetrying(true);
    setPermission('loading');
    await startCamera(facingMode);
    setRetrying(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code) {
          stopCamera();
          onResult(code.data);
        } else {
          toast.error('No QR code found in this image. Try a clearer photo.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Loading / Awaiting Permission ────────────────────────
  if (permission === 'loading') {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: `radial-gradient(ellipse at 50% 30%, hsl(4 60% 12%) 0%, #0a0a0a 60%)` }}
      >
        <div className="px-4 pt-5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span className="text-[13px] text-white font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Back</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
          <div className="relative">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, hsl(4 68% 22%) 0%, hsl(4 60% 12%) 70%)',
                border: '1.5px solid hsl(4 68% 35%)',
                boxShadow: '0 0 40px hsl(4 68% 40% / 0.25)',
              }}
            >
              <Camera className="w-12 h-12" style={{ color: 'hsl(4 68% 65%)' }} />
            </div>
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ border: '1px solid hsl(4 68% 50% / 0.3)', animationDuration: '2s' }}
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-[22px] font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Opening Camera
            </h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins, sans-serif' }}>
              Allow camera access when your browser asks. This is only used to scan your guest QR code.
            </p>
          </div>

          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'hsl(4 68% 60%)', borderTopColor: 'transparent' }}
          />
        </div>

        <div className="px-6 pb-10 pt-4 space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 text-[13px] py-3 rounded-2xl transition-colors"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'Poppins, sans-serif',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Image className="w-4 h-4" />
            Scan from Gallery instead
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>
    );
  }

  // ── Permission Denied ────────────────────────────────────
  if (permission === 'denied' || permission === 'unavailable') {
    const isDenied = permission === 'denied';
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0a' }}>
        <div className="px-4 pt-5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span className="text-[13px] text-white font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Back</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}
          >
            <Camera className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>

          <div className="space-y-2">
            <h2 className="text-[20px] font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {isDenied ? 'Camera Access Denied' : 'Camera Not Available'}
            </h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Poppins, sans-serif' }}>
              {isDenied
                ? 'Camera permission was denied. Enable it in your browser settings to continue.'
                : 'Your browser does not support camera access. Try scanning from your gallery instead.'}
            </p>
          </div>

          {isDenied && (
            <div
              className="w-full rounded-2xl p-4 space-y-3 text-left"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Poppins, sans-serif' }}>
                How to enable on Android
              </p>
              {[
                'Tap the lock icon in the address bar',
                'Tap "Permissions" → Camera',
                'Set to "Allow" and reload the page',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', fontFamily: 'Poppins, sans-serif' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins, sans-serif' }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-10 pt-4 space-y-3">
          {isDenied && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full h-[52px] rounded-2xl flex items-center justify-center gap-2.5 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, hsl(4 68% 56%) 0%, hsl(340 55% 58%) 100%)',
                boxShadow: '0 4px 24px hsl(4 68% 50% / 0.3)',
                color: '#fff',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {retrying ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : (
                <><Settings className="w-4 h-4" /> Try Again</>
              )}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            <Image className="w-4 h-4" />
            Scan from Gallery
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>
    );
  }

  // ── Camera Active ────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0a' }}>
      <div
        className="flex items-center justify-between px-4 py-4 z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <ArrowLeft className="w-4 h-4 text-white" />
          <span className="text-[13px] text-white font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Back</span>
        </button>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins, sans-serif' }}>
            Scan QR Code
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins, sans-serif' }}>
            Point at your access QR code
          </p>
        </div>
        <button
          onClick={handleFlipCamera}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <SwitchCamera className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {flash && <div className="absolute inset-0 z-20 bg-white opacity-60 pointer-events-none" />}

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        <div className="relative z-10 flex flex-col items-center justify-center">
          <div
            className="absolute"
            style={{
              top: '-500px', left: '-500px', right: '-500px', bottom: '-500px',
              background: `radial-gradient(ellipse 220px 220px at center, transparent 100px, rgba(0,0,0,0.55) 150px)`,
              pointerEvents: 'none',
            }}
          />
          <div className="relative" style={{ width: 220, height: 220 }}>
            {[
              { top: 0, left: 0, borderTop: true, borderLeft: true },
              { top: 0, right: 0, borderTop: true, borderRight: true },
              { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
              { bottom: 0, right: 0, borderBottom: true, borderRight: true },
            ].map((corner, i) => (
              <div
                key={i}
                className="absolute w-8 h-8"
                style={{
                  ...corner,
                  borderTopWidth: corner.borderTop ? 3 : 0,
                  borderLeftWidth: corner.borderLeft ? 3 : 0,
                  borderRightWidth: corner.borderRight ? 3 : 0,
                  borderBottomWidth: corner.borderBottom ? 3 : 0,
                  borderStyle: 'solid',
                  borderColor: 'hsl(4 68% 60%)',
                  borderRadius:
                    corner.borderTop && corner.borderLeft ? '6px 0 0 0'
                    : corner.borderTop && corner.borderRight ? '0 6px 0 0'
                    : corner.borderBottom && corner.borderLeft ? '0 0 0 6px'
                    : '0 0 6px 0',
                }}
              />
            ))}
            {scanning && (
              <div
                className="absolute left-2 right-2 h-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(to right, transparent, hsl(4 68% 60%), transparent)',
                  animation: 'scan-line 2s ease-in-out infinite',
                  top: '50%',
                }}
              />
            )}
          </div>
          <p className="mt-5 text-[11px] text-center px-8" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Poppins, sans-serif' }}>
            Hold steady — scanning automatically
          </p>
        </div>
      </div>

      <div
        className="px-6 pb-8 pt-4 space-y-3 z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-12 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          <Image className="w-4 h-4" />
          Scan from Gallery
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <p className="text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Poppins, sans-serif' }}>
          Point your camera at a QR code to scan automatically
        </p>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
