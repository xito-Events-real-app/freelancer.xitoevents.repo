import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskName(name: string): string {
  return name
    .split(' ')
    .map((word, index) => {
      if (index === 0) {
        return word.length <= 2 ? '*'.repeat(word.length) : word.slice(0, 2) + '*'.repeat(word.length - 2);
      }
      return '*'.repeat(word.length);
    })
    .join(' ');
}

/** Returns agency business_name when applicable, otherwise full_name */
export function getDisplayName(profile: { account_type?: string; business_name?: string | null; full_name?: string } | null | undefined): string {
  if (!profile) return 'Unknown';
  if (profile.account_type === 'agency' && profile.business_name) return profile.business_name;
  return profile.full_name || 'Unknown';
}

/** Returns initial letter based on display name */
export function getDisplayInitial(profile: { account_type?: string; business_name?: string | null; full_name?: string } | null | undefined): string {
  return getDisplayName(profile)[0] || '?';
}
