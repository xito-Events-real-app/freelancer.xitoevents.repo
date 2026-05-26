import type { CrewAssignment } from '@/hooks/useCrewAssignments';

export interface PhotographerInfo { code: string; name: string; key: string; role: string }

const PHOTO_ROLES: { code: string; role: string }[] = [
  { code: 'PB', role: 'photographer_bride' },
  { code: 'PG', role: 'photographer_groom' },
  { code: 'EP', role: 'editor_photo' }, // Extra Photographer
];

export function getPhotographersForEvent(eventId: string, assignments: CrewAssignment[]): PhotographerInfo[] {
  const list: PhotographerInfo[] = [];
  for (const { code, role } of PHOTO_ROLES) {
    const match = assignments.find(a => a.event_id === eventId && a.role === role && a.assigned_freelancer);
    if (!match) continue;
    const names = (match.assigned_freelancer || '').split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
    for (const name of names) list.push({ code, name, role, key: `${code}::${name}` });
  }
  return list;
}
