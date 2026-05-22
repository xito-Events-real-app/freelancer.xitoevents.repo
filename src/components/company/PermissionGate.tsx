import { ReactNode } from 'react';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { useStaffPermissions, type SectionKey } from '@/hooks/useStaffPermissions';
import AccessDeniedCard from './AccessDeniedCard';
import { Loader2 } from 'lucide-react';

interface Props {
  section: SectionKey;
  children: ReactNode;
  /** Reserved for future use; the Phase-1 staff banner has been removed. */
  showStaffBanner?: boolean;
}

export default function PermissionGate({ section, children }: Props) {
  const { activeAgencyId, loading: ctxLoading, switching } = useActiveCompany();
  const { allowedSections, loading } = useStaffPermissions(activeAgencyId);

  if (ctxLoading || loading || switching) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowedSections.has(section)) {
    return <AccessDeniedCard />;
  }

  return <>{children}</>;
}
