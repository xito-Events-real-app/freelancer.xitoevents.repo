import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import { useMyCompanies } from '@/hooks/useMyCompanies';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { Badge } from '@/components/ui/badge';
import { ALL_ROLES, type StaffRole } from '@/hooks/useStaffPermissions';

const ROLE_LABEL: Record<StaffRole, string> = ALL_ROLES.reduce(
  (acc, r) => ({ ...acc, [r.role]: r.label }),
  {} as Record<StaffRole, string>,
);

export default function MyCompaniesSection() {
  const { data: companies = [], isLoading } = useMyCompanies();
  const { setActiveAgencyId } = useActiveCompany();
  const navigate = useNavigate();

  if (isLoading) return null;

  return (
    <section className="space-y-3" id="companies">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">My Companies</h3>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">You have no companies yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {companies.map(c => {
            const name = c.business_name || c.full_name || 'Company';
            return (
              <button
                key={c.agency_user_id}
                onClick={() => {
                  setActiveAgencyId(c.agency_user_id);
                  navigate('/company');
                }}
                className="text-left p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-muted transition group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                    {c.profile_photo_url ? (
                      <img src={c.profile_photo_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground">Staff member</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
                </div>
                {c.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {c.roles.map(r => (
                      <Badge key={r} variant="secondary" className="text-[10px]">
                        {ROLE_LABEL[r] || r}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No roles assigned yet</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
