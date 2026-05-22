import { adToBS, formatBSDate } from '@/lib/nepaliCalendar';

interface Props {
  value?: string | null; // YYYY-MM-DD (AD)
  size?: 'sm' | 'md';
  className?: string;
  stacked?: boolean;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function NepaliEnglishDate({ value, size = 'sm', stacked = true, className }: Props) {
  if (!value) return <span className={className} style={{ color: 'var(--cp-text-3)' }}>—</span>;
  let ad: Date;
  try { ad = new Date(value); if (isNaN(ad.getTime())) throw 0; } catch { return <span>{value}</span>; }
  const bs = adToBS(ad);
  const adLabel = `${WEEKDAY[ad.getDay()]}, ${ad.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const bsLabel = formatBSDate(bs) + ' BS';
  const fs = size === 'md' ? 13 : 11;

  if (stacked) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.25 }}>
        <span style={{ fontSize: fs, fontWeight: 500, color: 'var(--cp-text)' }}>{bsLabel}</span>
        <span style={{ fontSize: fs - 1, color: 'var(--cp-text-3)' }}>{adLabel}</span>
      </div>
    );
  }
  return (
    <span className={className} style={{ fontSize: fs, color: 'var(--cp-text)' }}>
      {bsLabel} · {adLabel}
    </span>
  );
}
