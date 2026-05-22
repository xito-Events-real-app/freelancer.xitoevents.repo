// Nepali Date Converter Utilities
// Ported from Xito Business Suite for File Management module
import NepaliDate from "nepali-date-converter";

export interface NepaliDateObject {
  year: number;
  month: number;
  day: number | string;
}

export function isUnknownDay(day: number | string): day is string {
  return typeof day === "string" && day.startsWith("**");
}

export function getDayDisplay(day: number | string): string {
  if (typeof day === "string" && day.startsWith("**")) return "**";
  return String(day);
}

export function getDayForStorage(day: number | string): string {
  if (typeof day === "string" && day.startsWith("**")) return "**";
  return String(day);
}

export interface DateConversion {
  ad: Date;
  bs: NepaliDateObject;
  bsFormatted: string;
}

export const nepaliMonths = [
  "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत",
];

export const nepaliMonthsEnglish = [
  "Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

export function adToBS(adDate: Date): NepaliDateObject {
  const nepaliDate = new NepaliDate(adDate);
  return {
    year: nepaliDate.getYear(),
    month: nepaliDate.getMonth() + 1,
    day: nepaliDate.getDate(),
  };
}

export function bsToAD(year: number, month: number, day: number | string): Date | string {
  if (typeof day === "string" && day.startsWith("**")) {
    const nepaliDate = new NepaliDate(year, month - 1, 1);
    const jsDate = nepaliDate.toJsDate();
    const adYear = jsDate.getFullYear();
    const adMonth = String(jsDate.getMonth() + 1).padStart(2, "0");
    return `${adYear}-${adMonth}-**`;
  }
  const nepaliDate = new NepaliDate(year, month - 1, day as number);
  return nepaliDate.toJsDate();
}

export function formatBSDate(bs: NepaliDateObject): string {
  const monthName = nepaliMonthsEnglish[bs.month - 1];
  return `${getDayDisplay(bs.day)} ${monthName} ${bs.year}`;
}

export function formatBSDateForSheet(bs: NepaliDateObject): string {
  return `${bs.year} ${bs.month} ${getDayForStorage(bs.day)}`;
}

export function formatBSDateNepali(bs: NepaliDateObject): string {
  const monthName = nepaliMonths[bs.month - 1];
  return `${bs.day} ${monthName} ${bs.year}`;
}

export function getCurrentBSDate(): NepaliDateObject {
  return adToBS(new Date());
}

const bsDaysInMonth: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2084: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2086: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
};

export function getDaysInBSMonth(year: number, month: number): number {
  const yearData = bsDaysInMonth[year];
  if (yearData && month >= 1 && month <= 12) return yearData[month - 1];
  return month === 2 || month === 4 ? 32 : month >= 7 && month <= 9 ? 29 : 30;
}

export function getBSYearsRange(startOffset = -5, endOffset = 5): number[] {
  const currentYear = getCurrentBSDate().year;
  const years: number[] = [];
  for (let i = currentYear + startOffset; i <= currentYear + endOffset; i++) years.push(i);
  return years;
}

export function isSameBSDate(a: NepaliDateObject, b: NepaliDateObject): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function convertDateForDisplay(adDate: Date): DateConversion {
  const bs = adToBS(adDate);
  return { ad: adDate, bs, bsFormatted: formatBSDate(bs) };
}

export function isBSDatePast(year: number | string, month: number | string, day: number | string): boolean {
  try {
    const bsYear = typeof year === "string" ? parseInt(year) : year;
    const bsMonth = typeof month === "string" ? parseInt(month) : month;
    const bsDay = typeof day === "string" ? parseInt(day) : day;
    if (isNaN(bsDay) || String(day).includes("*")) return false;
    const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
    const eventDate = nepaliDate.toJsDate();
    eventDate.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  } catch {
    return false;
  }
}
