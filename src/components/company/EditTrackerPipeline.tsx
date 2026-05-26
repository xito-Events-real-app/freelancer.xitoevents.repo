import { useMemo, useState, useEffect } from 'react';
import { useVideoEditTracker, usePhotoEditTracker } from '@/hooks/useEditTrackers';
import {
  VIDEO_STAGES, pushVideoToStatus, pushPhotoToStatus, updateVideoField, updatePhotoField,
  toggleVideoPlaying, togglePhotoPlaying,
} from '@/lib/edit-tracker-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Play, Pause, Video as VideoIcon, Image as ImageIcon, ChevronRight, ChevronDown,
  Calendar, Clock, User, Music, Link2, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<string, string> = {
  QUEUE: 'Queue',
  EDIT_LAB: 'Edit Lab',
  EDIT_ON_PROGRESS: 'In Progress',
  EXPORTED: 'Exported',
  CLIENT_REVIEW: 'Client Review',
  RE_EDIT_ON_PROGRESS: 'Re-Edit',
  FINALIZED: 'Finalized',
};

const STAGE_GRADIENTS: Record<string, string> = {
  QUEUE: 'from-slate-500 to-slate-600',
  EDIT_LAB: 'from-indigo-500 to-blue-600',
  EDIT_ON_PROGRESS: 'from-amber-500 to-orange-600',
  EXPORTED: 'from-cyan-500 to-teal-600',
  CLIENT_REVIEW: 'from-purple-500 to-fuchsia-600',
  RE_EDIT_ON_PROGRESS: 'from-rose-500 to-pink-600',
  FINALIZED: 'from-emerald-500 to-green-600',
};

const URGENCY_OPTIONS = ['', 'LOW', 'NORMAL', 'HIGH', 'URGENT'];

function elapsedLabel(start: string | null) {
  if (!start) return '';
  const ms = Date.now() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function PipelineShell({ kind }: { kind: 'video' | 'photo' }) {
  const isVideo = kind === 'video';
  const v = useVideoEditTracker();
  const p = usePhotoEditTracker();
  const { data: rows = [], isLoading } = isVideo ? v : p;
  const [activeStage, setActiveStage] = useState<string>('QUEUE');
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];

  // Sort: event date ASC, then client created ASC
  const sortedRows = useMemo(() => {
    return [...rows].sort((a: any, b: any) => {
      const da = a.event_date_ad || '9999-12-31';
      const db = b.event_date_ad || '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      return (a.client_created_at || '').localeCompare(b.client_created_at || '');
    });
  }, [rows]);

  const byStage = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const s of VIDEO_STAGES) m[s] = [];
    for (const r of sortedRows) {
      const status = (isVideo ? (r as any).video_edit_status : (r as any).photo_edit_status) || 'QUEUE';
      // Hide future-event QUEUE rows
      if (status === 'QUEUE' && r.event_date_ad && r.event_date_ad > today) continue;
      if (!m[status]) m[status] = [];
      if (search) {
        const hay = `${r.client_name || ''} ${r.event_name || ''} ${r.edit_type || ''} ${r.editor || ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) continue;
      }
      m[status].push(r);
    }
    return m;
  }, [sortedRows, isVideo, today, search]);

  const Icon = isVideo ? VideoIcon : ImageIcon;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{isVideo ? 'Video Edit Tracker' : 'Photo Edit Tracker'}</h1>
            <p className="text-xs text-muted-foreground">7-stage editing pipeline · auto-synced with deliverables</p>
          </div>
        </div>
        <Input placeholder="Search client, event, editor…" value={search} onChange={e => setSearch(e.target.value)}
          className="max-w-xs h-9" />
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {VIDEO_STAGES.map(s => {
          const count = byStage[s]?.length || 0;
          const active = activeStage === s;
          return (
            <button key={s} onClick={() => setActiveStage(s)}
              className={cn(
                'shrink-0 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all border',
                active
                  ? `bg-gradient-to-r text-white border-transparent shadow-md ${STAGE_GRADIENTS[s]}`
                  : 'bg-card hover:bg-accent text-foreground border-border'
              )}
            >
              <div className="flex items-center gap-2">
                <span>{STAGE_LABELS[s]}</span>
                <Badge variant={active ? 'secondary' : 'outline'} className={active ? 'bg-white/25 text-white border-0' : ''}>{count}</Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active stage list */}
      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!isLoading && (byStage[activeStage]?.length || 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No items in <span className="font-semibold">{STAGE_LABELS[activeStage]}</span>.
          </div>
        )}
        {(byStage[activeStage] || []).map((r: any) => (
          <TrackerCard key={r.id} row={r} kind={kind} />
        ))}
      </div>
    </div>
  );
}

function TrackerCard({ row, kind }: { row: any; kind: 'video' | 'photo' }) {
  const isVideo = kind === 'video';
  const [expanded, setExpanded] = useState(false);
  const status = isVideo ? row.video_edit_status : row.photo_edit_status;
  const stageIdx = VIDEO_STAGES.indexOf(status as any);
  const nextStage = stageIdx >= 0 && stageIdx < VIDEO_STAGES.length - 1 ? VIDEO_STAGES[stageIdx + 1] : null;

  // tick to re-render timer
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!row.is_playing) return;
    const i = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(i);
  }, [row.is_playing]);

  const push = isVideo ? pushVideoToStatus : pushPhotoToStatus;
  const updateField = isVideo ? updateVideoField : updatePhotoField;
  const togglePlay = isVideo ? toggleVideoPlaying : togglePhotoPlaying;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="p-4 grid grid-cols-12 gap-3 items-start">
        {/* Client / event */}
        <div className="col-span-12 md:col-span-3 min-w-0">
          <div className="text-sm font-bold text-foreground truncate uppercase tracking-wide">
            {row.client_name || 'Unknown'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {row.event_name} · {row.edit_type}
            {row.sub_event_name && ` · ${row.sub_event_name}`}
            {!isVideo && row.photographer_role && (
              <span className="ml-1 text-primary font-semibold">[{row.photographer_role} {row.photographer_name}]</span>
            )}
          </div>
          {row.event_date_bs && (
            <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {row.event_date_bs}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="col-span-6 md:col-span-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1"><User className="w-3 h-3" />Editor</label>
          <Input value={row.editor || ''} onChange={e => updateField(row.id, 'editor' as any, e.target.value)}
            placeholder="Assign…" className="h-7 text-xs mt-1" />
        </div>

        {/* Urgency */}
        <div className="col-span-6 md:col-span-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Urgency</label>
          <Select value={row.urgency || ''} onValueChange={v => updateField(row.id, 'urgency' as any, v)}>
            <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map(u => <SelectItem key={u} value={u || '_'}>{u || '—'}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Deadline */}
        <div className="col-span-6 md:col-span-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" />Deadline</label>
          <Input type="date" value={row.deadline ? String(row.deadline).slice(0, 10) : ''}
            onChange={e => updateField(row.id, 'deadline' as any, e.target.value || null)}
            className="h-7 text-xs mt-1" />
        </div>

        {/* Timer + actions */}
        <div className="col-span-6 md:col-span-3 flex flex-col gap-1.5 items-end">
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant={row.is_playing ? 'default' : 'outline'} className="h-7 px-2"
              onClick={() => togglePlay(row.id, row.is_playing)}>
              {row.is_playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            {row.is_playing && row.playing_since && (
              <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />{elapsedLabel(row.playing_since)}
              </span>
            )}
            {nextStage && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => push(row.id, nextStage)}>
                {STAGE_LABELS[nextStage]} <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Select value={status} onValueChange={v => push(row.id, v)}>
            <SelectTrigger className="h-7 text-xs w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VIDEO_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Expand */}
        <div className="col-span-12">
          <button onClick={() => setExpanded(e => !e)} className="text-[11px] text-primary font-semibold flex items-center gap-1">
            <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {expanded && (
          <>
            <FieldArea label="Company Notes" icon={<FileText className="w-3 h-3" />} value={row.company_notes} onChange={v => updateField(row.id, 'company_notes' as any, v)} />
            <FieldArea label="Client Demand" icon={<FileText className="w-3 h-3" />} value={row.client_demand} onChange={v => updateField(row.id, 'client_demand' as any, v)} />
            <FieldArea label="Reference" icon={<Link2 className="w-3 h-3" />} value={row.reference} onChange={v => updateField(row.id, 'reference' as any, v)} />
            {isVideo && (
              <>
                <FieldArea label="Songs" icon={<Music className="w-3 h-3" />} value={row.songs} onChange={v => updateField(row.id, 'songs' as any, v)} />
                <FieldArea label="YouTube Link" icon={<Link2 className="w-3 h-3" />} value={row.youtube_link} onChange={v => updateField(row.id, 'youtube_link' as any, v)} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FieldArea({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void }) {
  return (
    <div className="col-span-12 md:col-span-6">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">{icon}{label}</label>
      <Textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={label} className="text-xs mt-1 min-h-[55px]" />
    </div>
  );
}

export function CompanyVideoEditTracker() { return <PipelineShell kind="video" />; }
export function CompanyPhotoEditTracker() { return <PipelineShell kind="photo" />; }
