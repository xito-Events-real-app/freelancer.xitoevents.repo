import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  ClipboardList,
  HelpCircle,
  DollarSign,
  Activity,
  MessageSquare,
  CreditCard,
  Wallet,
  FolderOpen,
  Package,
  Pencil,
  Image as ImageIcon,
  Link2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SectionType =
  | 'dashboard'
  | 'events'
  | 'freelancers'
  | 'details'
  | 'registration'
  | 'inquiry'
  | 'sales'
  | 'activity'
  | 'comments'
  | 'financials'
  | 'benzo'
  | 'files'
  | 'deliverables'
  | 'edit'
  | 'album'
  | 'link'
  | 'notes';

interface CompanyClientSidebarProps {
  activeSection: SectionType;
  onSectionChange: (section: SectionType) => void;
  onBack: () => void;
  clientName: string;
  showNavigation?: boolean;
  currentPosition?: number;
  totalCount?: number;
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  commentsCount?: number;
}

const sidebarItems: { id: SectionType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'events', label: 'Event Details', icon: Calendar },
  { id: 'freelancers', label: 'Freelancers', icon: Users },
  { id: 'details', label: 'Client Details', icon: UserCircle },
  { id: 'registration', label: 'Registration', icon: ClipboardList },
  { id: 'inquiry', label: 'Inquiry', icon: HelpCircle },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'financials', label: 'Financials', icon: CreditCard },
  { id: 'benzo', label: 'Benzo Keep', icon: Wallet },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'deliverables', label: 'Deliverables', icon: Package },
  { id: 'edit', label: 'Edit', icon: Pencil },
  { id: 'album', label: 'Album', icon: ImageIcon },
  { id: 'link', label: 'Client Link', icon: Link2 },
];

export default function CompanyClientSidebar({
  activeSection,
  onSectionChange,
  onBack,
  clientName,
  showNavigation = false,
  currentPosition = 0,
  totalCount = 0,
  onPrev,
  onNext,
  canGoPrev = false,
  canGoNext = false,
  commentsCount = 0,
}: CompanyClientSidebarProps) {
  return (
    <div className="w-60 min-h-screen bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 mb-2 text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="px-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Client</div>
          <div className="font-bold text-lg text-white truncate">{clientName}</div>
        </div>

        {showNavigation && totalCount > 1 && (
          <div className="flex items-center justify-between mt-2 px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              disabled={!canGoPrev}
              className="h-7 w-7 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-400">
              {currentPosition} / {totalCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!canGoNext}
              className="h-7 w-7 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const showBadge = item.id === 'comments' && commentsCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className={cn(
                  'text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center',
                  isActive ? 'bg-white/25 text-white' : 'bg-orange-500/20 text-orange-300'
                )}>
                  {commentsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="text-[10px] text-slate-600 text-center">Client Detail v2.0</div>
      </div>
    </div>
  );
}
