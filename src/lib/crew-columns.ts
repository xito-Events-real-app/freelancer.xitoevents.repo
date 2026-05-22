export interface CrewColumn {
  key: string;
  label: string;
  shortCode: string;
  group: 'photo' | 'video' | 'assist' | 'tech';
  /** Field name in freelancer_profiles to filter by, or null for "anyone" */
  profileField: string | null;
}

// Column order matches Xito: PB, VB, PG, VG, EP, EV, Asst, iPhone, Drone, FPV
export const CREW_COLUMNS: CrewColumn[] = [
  { key: 'photographer_bride', label: 'Photographer Bride', shortCode: 'PB', group: 'photo', profileField: 'photographer' },
  { key: 'videographer_bride', label: 'Videographer Bride', shortCode: 'VB', group: 'video', profileField: 'videographer' },
  { key: 'photographer_groom', label: 'Photographer Groom', shortCode: 'PG', group: 'photo', profileField: 'photographer' },
  { key: 'videographer_groom', label: 'Videographer Groom', shortCode: 'VG', group: 'video', profileField: 'videographer' },
  { key: 'editor_photo', label: 'Extra Photographer', shortCode: 'EP', group: 'photo', profileField: 'photo_editor' },
  { key: 'editor_video', label: 'Extra Videographer', shortCode: 'EV', group: 'video', profileField: 'video_editor' },
  { key: 'assistant', label: 'Assistant', shortCode: 'Asst', group: 'assist', profileField: null },
  { key: 'iphone', label: 'iPhone Shooter', shortCode: 'iPhone', group: 'tech', profileField: 'iphone_shooter' },
  { key: 'drone', label: 'Drone Operator', shortCode: 'Drone', group: 'tech', profileField: 'drone_operator' },
  { key: 'fpv', label: 'FPV Operator', shortCode: 'FPV', group: 'tech', profileField: 'fpv_operator' },
];

export const GROUP_COLORS: Record<string, { bg: string; text: string; headerBg: string }> = {
  photo: { bg: 'bg-amber-50', text: 'text-amber-700', headerBg: 'bg-amber-100' },
  video: { bg: 'bg-purple-50', text: 'text-purple-700', headerBg: 'bg-purple-100' },
  assist: { bg: 'bg-emerald-50', text: 'text-emerald-700', headerBg: 'bg-emerald-100' },
  tech: { bg: 'bg-cyan-50', text: 'text-cyan-700', headerBg: 'bg-cyan-100' },
};

export const PILL_STYLES: Record<string, string> = {
  photo: 'bg-amber-50 text-amber-700 border-amber-200',
  video: 'bg-purple-50 text-purple-700 border-purple-200',
  assist: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tech: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

export const GROUP_HEADER_STYLES: Record<string, string> = {
  photo: 'bg-amber-100 text-amber-800 border-amber-200',
  video: 'bg-purple-100 text-purple-800 border-purple-200',
  assist: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  tech: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};
