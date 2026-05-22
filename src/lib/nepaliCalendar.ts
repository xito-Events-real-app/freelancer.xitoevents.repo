// Nepali Date Converter Utilities — based on nepali-date-converter package
import NepaliDate from "nepali-date-converter";

export interface NepaliDateObject {
  year: number;
  month: number; // 1-indexed (1=Baisakh, 12=Chaitra)
  day: number;
}

export const nepaliMonthsEnglish = [
  "Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

const NEPALI_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// BS calendar data for days in each month
const bsDaysInMonth: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2084: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2086: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2088: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2089: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
};

// Convert AD date to BS using nepali-date-converter
export function adToBS(adDate: Date): NepaliDateObject {
  const nepaliDate = new NepaliDate(adDate);
  return {
    year: nepaliDate.getYear(),
    month: nepaliDate.getMonth() + 1, // library is 0-indexed, we use 1-indexed
    day: nepaliDate.getDate(),
  };
}

// Convert BS to AD using nepali-date-converter
export function bsToAD(year: number, month: number, day: number): Date {
  const nepaliDate = new NepaliDate(year, month - 1, day); // library is 0-indexed
  return nepaliDate.toJsDate();
}

// Get current BS date
export function getCurrentBSDate(): NepaliDateObject {
  return adToBS(new Date());
}

// Get days in a BS month
export function getDaysInBSMonth(year: number, month: number): number {
  const yearData = bsDaysInMonth[year];
  if (yearData && month >= 1 && month <= 12) {
    return yearData[month - 1];
  }
  // Fallback: use the library to figure it out
  try {
    // Try incrementing days until month changes
    let day = 28;
    while (day <= 32) {
      try {
        const nd = new NepaliDate(year, month - 1, day + 1);
        if (nd.getMonth() + 1 !== month) return day;
        day++;
      } catch {
        return day;
      }
    }
    return 30;
  } catch {
    return 30;
  }
}

// Get the day of week (0=Sun) for the 1st of a BS month
export function getFirstDayOfBSMonth(year: number, month: number): number {
  const adDate = bsToAD(year, month, 1);
  return adDate.getDay();
}

// Format BS date as string
export function formatBSDate(bs: NepaliDateObject): string {
  return `${bs.day} ${nepaliMonthsEnglish[bs.month - 1]} ${bs.year}`;
}

// Convert BS date to AD date string for DB storage (YYYY-MM-DD)
export function bsToADString(year: number, month: number, day: number): string {
  const ad = bsToAD(year, month, day);
  const y = ad.getFullYear();
  const m = String(ad.getMonth() + 1).padStart(2, '0');
  const d = String(ad.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNepaliDayNames(): string[] {
  return NEPALI_DAYS;
}
