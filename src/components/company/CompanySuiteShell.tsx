import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSmartBack } from '@/hooks/useSmartBack';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutGrid,
  UserPlus,
  CalendarCheck,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, FolderOpen, Contact } from 'lucide-react';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { useStaffPermissions, type SectionKey } from '@/hooks/useStaffPermissions';
import { useMyCompanies } from '@/hooks/useMyCompanies';
import { FinanceVisibilityProvider } from '@/contexts/FinanceVisibilityContext';

interface ModuleDef {
  path: string;
  icon: any;
  label: string;
  exact?: boolean;
  gradient?: string;
  subtitle?: string;
  section: SectionKey;
}

const modules: ModuleDef[] = [
  { path: '/company',                icon: LayoutGrid,    label: 'Home',             exact: true, section: 'dashboard' },
  { path: '/company/all-clients',    icon: Users,         label: 'Event Management', gradient: 'from-violet-500 to-purple-600', subtitle: 'Monthly Crew View', section: 'event_management' },
  { path: '/company/clients',        icon: Contact,       label: 'All Clients',      gradient: 'from-rose-500 to-pink-600', section: 'all_clients' },
  { path: '/company/my-freelancers', icon: UserCheck,     label: 'My Freelancers',   gradient: 'from-cyan-500 to-teal-600', section: 'my_freelancers' },
  { path: '/company/quick-add',      icon: UserPlus,      label: 'Add Client',       gradient: 'from-blue-500 to-indigo-600', section: 'add_client' },
  { path: '/company/booked',         icon: CalendarCheck, label: 'Booked Clients',   gradient: 'from-green-500 to-emerald-600', section: 'booked' },
  { path: '/company/finance',        icon: DollarSign,    label: 'Finance Manager',  gradient: 'from-emerald-500 to-green-600', section: 'finance' },
  { path: '/company/files',          icon: FolderOpen,    label: 'File Management',  gradient: 'from-amber-500 to-orange-600', subtitle: 'Storage & Backups', section: 'file_management' },
  { path: '/company/settings',       icon: Settings,      label: 'Settings',         gradient: 'from-slate-500 to-slate-600', section: 'settings' },
];

export default function CompanySuiteShell() {
  const navigate = useNavigate();
  const goBack = useSmartBack('/');
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const qc = useQueryClient();

  const { activeCompany, activeAgencyId, setActiveAgencyId, isOwner } = useActiveCompany();
  const { allowedSections } = useStaffPermissions(activeAgencyId);
  const { data: myCompanies = [] } = useMyCompanies();

  // Owner's own + companies they're staff in (for switcher)
  const switcherCompanies = useMemo(() => {
    const list: { id: string; name: string; photo: string | null; isOwn: boolean }[] = [];
    if (isOwner && activeCompany) {
      list.push({ id: activeCompany.agency_user_id, name: activeCompany.business_name || activeCompany.full_name || 'My Company', photo: activeCompany.profile_photo_url, isOwn: true });
    }
    for (const c of myCompanies) {
      if (list.find(l => l.id === c.agency_user_id)) continue;
      list.push({ id: c.agency_user_id, name: c.business_name || c.full_name || 'Company', photo: c.profile_photo_url, isOwn: false });
    }
    return list;
  }, [isOwner, activeCompany, myCompanies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      qc.prefetchQuery({
        queryKey: ['files', 'all'],
        queryFn: async () => {
          const { data, error } = await (supabase as any)
            .from('files_management').select('*').eq('deleted_or_not', false)
            .order('updated_at', { ascending: false });
          if (error) throw error;
          return data ?? [];
        },
        staleTime: 30_000,
        meta: { persist: true },
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [qc]);

  const companyName = activeCompany?.business_name || activeCompany?.full_name || 'My Company';

  // Filter visible modules by permission
  const visibleModules = modules.filter(m => allowedSections.has(m.section));

  return (
    <div className="min-h-screen flex bg-gray-50 w-full">
      {/* Left Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen border-r z-40 flex flex-col transition-all duration-300',
          'bg-[hsl(220,25%,10%)] text-[hsl(220,15%,95%)] border-[hsl(220,20%,18%)]',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className={cn('h-14 flex items-center border-b border-[hsl(220,20%,18%)] px-3 gap-2', collapsed ? 'justify-center' : 'justify-start')}>
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className={cn('text-white/70 hover:text-white hover:bg-white/10', collapsed ? 'w-10 h-10 p-0' : 'gap-2')}
          >
            <LayoutGrid className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm">Back to Crew</span>}
          </Button>
        </div>

        {/* Active company header */}
        <div className={cn('px-4 py-3 border-b border-[hsl(220,20%,18%)]', collapsed && 'px-2')}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                {activeCompany?.profile_photo_url ? (
                  <img src={activeCompany.profile_photo_url} alt={companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-sm leading-tight text-white truncate">{companyName}</h1>
                {!isOwner ? (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-white/15 text-white border-0 rounded">Staff</Badge>
                ) : (
                  <p className="text-[10px] text-white/60">Business Suite</p>
                )}
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center overflow-hidden">
              {activeCompany?.profile_photo_url ? (
                <img src={activeCompany.profile_photo_url} alt={companyName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-xs">{companyName.charAt(0)}</span>
              )}
            </div>
          )}
        </div>

        {/* Module Nav */}
        <ScrollArea className="flex-1 py-3">
          <div className="px-3 space-y-1">
            {visibleModules.map((mod) => {
              const Icon = mod.icon;
              const active = mod.exact
                ? location.pathname === mod.path
                : location.pathname.startsWith(mod.path);
              return (
                <button
                  key={mod.path}
                  onClick={() => navigate(mod.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group',
                    active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    mod.gradient ? `bg-gradient-to-br ${mod.gradient}` : 'bg-white/10'
                  )}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1">
                      <span className="text-sm font-medium">{mod.label}</span>
                      {mod.subtitle && <p className="text-[9px] text-white/50 leading-tight">{mod.subtitle}</p>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Switcher (when user has multiple companies) */}
          {!collapsed && switcherCompanies.length > 1 && (
            <div className="px-3 mt-4 pt-4 border-t border-white/10 space-y-1">
              <p className="px-3 text-[10px] uppercase tracking-wider text-white/50 mb-1">Switch Company</p>
              {switcherCompanies.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveAgencyId(c.id);
                    navigate('/company');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition',
                    c.id === activeAgencyId ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <div className="w-6 h-6 rounded bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3" />}
                  </div>
                  <span className="text-xs truncate flex-1">{c.name}</span>
                  {c.isOwn && <Badge className="h-4 px-1 text-[8px] bg-emerald-600/30 text-emerald-200 border-0">Owner</Badge>}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border border-border shadow-sm hover:bg-muted p-0"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>
      </aside>

      <div className={cn('flex-1 min-w-0 transition-all duration-300', collapsed ? 'ml-16' : 'ml-60')}>
        <FinanceVisibilityProvider>
          <Outlet />
        </FinanceVisibilityProvider>
      </div>
    </div>
  );
}
