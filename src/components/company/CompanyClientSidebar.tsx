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
    <div className="w-60 min-h-screen flex flex-col border-r border-[#ead9d3] bg-[#faf8f7] text-[#1a1614]">
      {/* Header */}
      <div className="p-3 border-b border-[#ead9d3] bg-white/60 backdrop-blur-sm">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 mb-2 text-[#6b5f5c] hover:text-[#1a1614] hover:bg-[#f5e9e4]"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="px-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#a39390] font-semibold mb-1">
            Client
          </div>
          <div
            className="font-semibold text-lg text-[#1a1614] truncate leading-tight"
            style={{ fontFamily: '"Cormorant Garamond", "DM Serif Display", serif' }}
          >
            {clientName}
          </div>
        </div>

        {showNavigation && totalCount > 1 && (
          <div className="flex items-center justify-between mt-3 px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              disabled={!canGoPrev}
              className="h-7 w-7 rounded-full text-[#a39390] hover:text-[#c97a6a] hover:bg-[#f5e9e4] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-[#6b5f5c] font-medium">
              {currentPosition} / {totalCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!canGoNext}
              className="h-7 w-7 rounded-full text-[#a39390] hover:text-[#c97a6a] hover:bg-[#f5e9e4] disabled:opacity-30"
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
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-[#c97a6a] to-[#d4a574] text-white shadow-[0_3px_12px_hsl(350,80%,65%,.28)]'
                  : 'text-[#6b5f5c] hover:text-[#c97a6a] hover:bg-[#f5e9e4]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className={cn(
                  'text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center',
                  isActive ? 'bg-white/25 text-white' : 'bg-[#f5e9e4] text-[#c97a6a]'
                )}>
                  {commentsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#ead9d3] bg-white/40">
        <div className="text-[10px] text-[#a39390] text-center tracking-wider">Client Detail v2.0</div>
      </div>
    </div>
  );
}
