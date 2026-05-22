import { useEffect, useState } from 'react';

export function to12(hhmm: string): { h: number; m: number; p: 'AM' | 'PM' } | null {
  if (!hhmm) return null;
  const [H, M] = hhmm.split(':').map(Number);
  if (isNaN(H) || isNaN(M)) return null;
  const p: 'AM' | 'PM' = H >= 12 ? 'PM' : 'AM';
  let h = H % 12;
  if (h === 0) h = 12;
  return { h, m: M, p };
}

export function to24(h: number, m: number, p: 'AM' | 'PM'): string {
  let H = h % 12;
  if (p === 'PM') H += 12;
  return `${String(H).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmt12(hhmm?: string | null): string {
  if (!hhmm) return '—';
  const t = to12(hhmm);
  if (!t) return '—';
  return `${t.h}:${String(t.m).padStart(2, '0')} ${t.p}`;
}

function minsOf(hhmm: string): number {
  const [H, M] = hhmm.split(':').map(Number);
  return H * 60 + M;
}

export function durationLabel(start?: string | null, end?: string | null): string {
  if (!start || !end) return '';
  const diff = minsOf(end) - minsOf(start);
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h${m ? ' ' + m + 'm' : ''}`;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function inferStartPeriod(h: number): 'AM' | 'PM' {
  return h >= 6 && h <= 11 ? 'AM' : 'PM';
}

function inferEndPeriod(endH: number, endM: number, startTime: string): 'AM' | 'PM' {
  const sp = to12(startTime);
  if (!sp) return endH >= 6 && endH <= 11 ? 'AM' : 'PM';
  const startMins = minsOf(startTime);
  const tryP: 'AM' | 'PM' = sp.p;
  const cand = minsOf(to24(endH, endM, tryP));
  if (cand > startMins) return tryP;
  return tryP === 'AM' ? 'PM' : 'AM';
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind: 'start' | 'end';
  startTime?: string;
}

function TimeField({ label, value, onChange, kind, startTime }: FieldProps) {
  const parsed = to12(value);
  const [h, setH] = useState<number | null>(parsed?.h ?? null);
  const [m, setM] = useState<number>(parsed?.m ?? 0);
  const [p, setP] = useState<'AM' | 'PM' | null>(parsed?.p ?? null);
  const [periodTouched, setPeriodTouched] = useState<boolean>(!!parsed);

  useEffect(() => {
    const np = to12(value);
    if (np) {
      setH(np.h); setM(np.m); setP(np.p); setPeriodTouched(true);
    } else if (!value) {
      setH(null); setM(0); setP(null); setPeriodTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (nh: number | null, nm: number, np: 'AM' | 'PM' | null) => {
    if (nh != null && np) onChange(to24(nh, nm, np));
  };

  const pickHour = (hh: number) => {
    let np: 'AM' | 'PM' = p ?? 'AM';
    if (!periodTouched) {
      np = kind === 'start' ? inferStartPeriod(hh) : (startTime ? inferEndPeriod(hh, m, startTime) : inferStartPeriod(hh));
      setP(np);
    }
    setH(hh);
    commit(hh, m, np);
  };
  const pickMin = (mm: number) => {
    setM(mm);
    commit(h, mm, p);
  };
  const pickPeriod = (np: 'AM' | 'PM') => {
    setPeriodTouched(true);
    setP(np);
    commit(h, m, np);
  };

  return (
    <div style={{ border: '1px solid var(--cp-border)', borderRadius: 10, padding: 10, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-text-2, #475569)', letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rose)' }}>
          {h != null && p ? `${h}:${String(m).padStart(2, '0')} ${p}` : '—'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 6 }}>
        {HOURS.map((hh) => (
          <button
            key={hh}
            type="button"
            onClick={() => pickHour(hh)}
            style={{
              padding: '7px 0', fontSize: 12, fontWeight: 600,
              border: '1px solid', borderColor: h === hh ? 'var(--rose)' : 'var(--cp-border)',
              background: h === hh ? 'var(--rose)' : '#fff',
              color: h === hh ? '#fff' : '#334155',
              borderRadius: 7, cursor: 'pointer',
            }}
          >{hh}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 30].map((mm) => (
          <button
            key={mm}
            type="button"
            onClick={() => pickMin(mm)}
            style={{
              flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
              border: '1px solid', borderColor: m === mm ? 'var(--rose)' : 'var(--cp-border)',
              background: m === mm ? 'var(--rose)' : '#fff',
              color: m === mm ? '#fff' : '#334155',
              borderRadius: 7, cursor: 'pointer',
            }}
          >:{String(mm).padStart(2, '0')}</button>
        ))}
        {(['AM', 'PM'] as const).map((np) => (
          <button
            key={np}
            type="button"
            onClick={() => pickPeriod(np)}
            style={{
              flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
              border: '1px solid', borderColor: p === np ? 'var(--rose)' : 'var(--cp-border)',
              background: p === np ? 'var(--rose)' : '#fff',
              color: p === np ? '#fff' : '#334155',
              borderRadius: 7, cursor: 'pointer',
            }}
          >{np}</button>
        ))}
      </div>
    </div>
  );
}

interface PairProps {
  startValue: string;
  endValue: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}

export default function TimePicker12hPair({ startValue, endValue, onChangeStart, onChangeEnd }: PairProps) {
  // Auto-flip end period when start time changes and the existing end is now <= start.
  useEffect(() => {
    if (!startValue || !endValue) return;
    if (minsOf(endValue) > minsOf(startValue)) return;
    const e = to12(endValue);
    if (!e) return;
    const flipped: 'AM' | 'PM' = e.p === 'AM' ? 'PM' : 'AM';
    const next = to24(e.h, e.m, flipped);
    if (minsOf(next) > minsOf(startValue) && next !== endValue) {
      onChangeEnd(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startValue]);

  const dur = durationLabel(startValue, endValue);
  const invalid = startValue && endValue && minsOf(endValue) <= minsOf(startValue);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TimeField label="Start time" value={startValue} onChange={onChangeStart} kind="start" />
      <TimeField label="End time" value={endValue} onChange={onChangeEnd} kind="end" startTime={startValue} />
      <div style={{
        fontSize: 12, padding: '8px 10px', borderRadius: 8,
        background: invalid ? '#fef2f2' : '#f0fdf4',
        color: invalid ? '#b91c1c' : '#166534',
        border: `1px solid ${invalid ? '#fca5a5' : '#86efac'}`,
        textAlign: 'center', fontWeight: 600,
      }}>
        {invalid ? '⚠ End time must be after start time' : dur ? `⏱ Total duration: ${dur}` : '⏱ Pick start & end times'}
      </div>
    </div>
  );
}
