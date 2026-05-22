import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  aspect: number;
  onComplete: (croppedFile: File) => void;
  onCancel: () => void;
  open: boolean;
}

function createCroppedImage(imageSrc: string, pixelCrop: Area): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        img,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Crop failed'));
          resolve(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
  });
}

export default function ImageCropper({ imageSrc, aspect, onComplete, onCancel, open }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const file = await createCroppedImage(imageSrc, croppedArea);
      onComplete(file);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  const aspectLabel = aspect === 1 ? '1:1' : aspect > 1 ? '16:9' : '4:5';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="relative w-full" style={{ height: '65vh' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border bg-background">
          <span className="text-xs text-muted-foreground">Crop {aspectLabel}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={processing}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
