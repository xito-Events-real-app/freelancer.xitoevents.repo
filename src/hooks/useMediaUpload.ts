import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type MediaCategory = 'avatars' | 'posts' | 'cover' | 'media';

interface UploadResult {
  url: string;
  path: string;
  category: string;
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async (
    file: File,
    category: MediaCategory = 'media'
  ): Promise<UploadResult | null> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('action', 'upload');

      const { data, error } = await supabase.functions.invoke('upload-media', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');

      return { url: data.url, path: data.path, category: data.category };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('file_path', filePath);

      const { data, error } = await supabase.functions.invoke('upload-media', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Delete failed');

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error(message);
      return false;
    }
  };

  return { upload, deleteFile, uploading };
}
