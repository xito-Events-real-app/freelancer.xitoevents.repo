import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function AccessDeniedCard({ message }: { message?: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4 border border-border rounded-2xl p-8 bg-card">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            {message || "You don't have access to this section."}
          </p>
        </div>
        <Button onClick={() => navigate('/company')} className="w-full">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
