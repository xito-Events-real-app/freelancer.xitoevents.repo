import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import NepaliEnglishDate from '@/components/portal/NepaliEnglishDate';
import { openWhatsApp } from '@/lib/whatsapp-utils';

interface Props { data: any; ctx: PortalContext; onChange: () => void; }

export default function PortalAlbum({ data, ctx, onChange }: Props) {
  const deliverables: any[] = (data.deliverables || []).filter((d: any) => d.section === 'album');
  const selections: any[] = data.album_selections || [];

  const albums = deliverables.length > 0
    ? deliverables.map((d) => ({ id: d.album_name, name: d.album_name, max: d.quantity || 140 }))
    : [{ id: 'Main Album', name: 'Main Album', max: 140 }];

  const [activeIdx, setActiveIdx] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);

  const active = albums[activeIdx] || albums[0];

  const countsByAlbum = useMemo(() => {
    const m = new Map<string, any[]>();
    selections.forEach((s) => {
      const list = m.get(s.album_type) || [];
      list.push(s);
      m.set(s.album_type, list);
    });
    return m;
  }, [selections]);

  const activeSelections = countsByAlbum.get(active.id) || [];
  const count = activeSelections.length;
  const pct = Math.round((count / active.max) * 100);

  const remove = async (s: any) => {
    try {
      await portalApi.setAlbumSelection(ctx, {
        albumType: s.album_type, albumName: s.album_type,
        photoKey: s.photo_key, photoUrl: s.photo_url || '', selected: false,
      });
      onChange();
      toast.success('Photo removed');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <div className="cp-alb-hd">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📖</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>My Albums</span>
        </div>
        <button className="cp-lkbtn" onClick={() => setWizardOpen(true)}>
          🔒 Lock &amp; Send for Design
        </button>
      </div>

      <div className="cp-alb-tabs">
        {albums.map((a, i) => {
          const cnt = (countsByAlbum.get(a.id) || []).length;
          return (
            <button key={a.id} className={`cp-at ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>
              {a.name} <span className="cnt">{cnt}/{a.max}</span>
            </button>
          );
        })}
      </div>

      <div className="cp-pbw">
        <div className="cp-pbl"><span>{count} of {active.max} photos selected</span><span>{pct}%</span></div>
        <div className="cp-pbt"><div className="cp-pbf" style={{ width: `${pct}%` }} /></div>
      </div>

      {activeSelections.length === 0 ? (
        <div className="cp-es" style={{ margin: '0 16px' }}>
          <div className="ic">🖼️</div>
          <p>No photos selected yet</p>
          <p style={{ marginTop: 4, fontSize: 10 }}>Go to Photos tab and add photos</p>
        </div>
      ) : (
        <div className="cp-agrid">
          {activeSelections.map((s, i) => (
            <div className="cp-aph" key={i}>
              {s.photo_url
                ? <img src={s.photo_url} loading="lazy" alt="" />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 9, color: 'var(--cp-text-3)' }}>{s.photo_key}</div>}
              <button className="rb" onClick={() => remove(s)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 16 }} />

      {wizardOpen && (
        <LockWizard
          albums={albums}
          countsByAlbum={countsByAlbum}
          contact={data.contact}
          company={data.company}
          client={data.client}
          events={data.events || []}
          ctx={ctx}
          onClose={() => setWizardOpen(false)}
          onSubmitted={() => { setWizardOpen(false); onChange(); }}
        />
      )}
    </>
  );
}

function pickDefaultEventDate(events: any[]): string {
  const wedding = events.find((e: any) => /wedding/i.test(e.event_name || ''));
  const target = wedding || events.find((e: any) => e.event_date_ad);
  return target?.event_date_ad ? String(target.event_date_ad).slice(0, 10) : '';
}

function LockWizard({
  albums, countsByAlbum, contact, company, events, ctx, onClose, onSubmitted,
}: any) {
  const [step, setStep] = useState(1);
  // Do NOT default bride/groom from client_name; only from contact details.
  const [bride, setBride] = useState((contact?.bride_full_name?.split(' ')?.[0] || '').trim());
  const [groom, setGroom] = useState((contact?.groom_full_name?.split(' ')?.[0] || '').trim());
  const [dateAd, setDateAd] = useState('');

  useEffect(() => {
    const def = pickDefaultEventDate(events);
    if (def) setDateAd(def);
  }, [events]);

  const submit = async (sendName?: string) => {
    try {
      const album_details = albums.map((a: any) => ({
        album_name: a.name,
        quantity: a.max,
        selected: (countsByAlbum.get(a.id) || []).map((s: any) => s.photo_url || s.photo_key),
      }));
      await portalApi.submitAlbum(ctx, {
        bride_name: bride, groom_name: groom,
        album_details,
        selected_date: dateAd || null,
        date_mode: 'ad',
        sent_via: sendName ? `WhatsApp to ${sendName}` : 'portal',
      });
      toast.success('Album locked and submitted ✓');
      onSubmitted();
    } catch (e: any) { toast.error(e.message); }
  };

  const sendWa = (phone: string, name: string) => {
    const al = albums.map((a: any) => `- ${a.name}: ${(countsByAlbum.get(a.id) || []).length} photos`).join('\n');
    const message = `Hi ${name},\n\nAlbum selection completed! 🎉\n\nBride: ${bride}\nGroom: ${groom}\nDate: ${dateAd || 'Not selected'}\n\nAlbum Details:\n${al}\n\nPlease proceed with the design.`;
    openWhatsApp(phone, message);
    submit(name);
  };

  const contacts: { name: string; phone: string; tag?: string }[] = [];
  if (company?.whatsapp_number) contacts.push({ name: company.business_name || company.full_name || 'Studio', phone: company.whatsapp_number, tag: 'Primary' });
  if (company?.contact_person_2_whatsapp) contacts.push({ name: company.contact_person_2_name || 'Contact 2', phone: company.contact_person_2_whatsapp });
  if (company?.contact_person_3_whatsapp) contacts.push({ name: company.contact_person_3_name || 'Contact 3', phone: company.contact_person_3_whatsapp });

  return (
    <div className="cp-mbk open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp-msh">
        <div className="cp-mpb">
          {[1, 2, 3].map((i) => <div key={i} className={`cp-mpbb ${i <= step ? 'done' : ''}`} />)}
        </div>
        {step === 1 && (
          <>
            <div className="cp-mt">Confirm Selection</div>
            <div className="cp-ms">Have you finalized your photo selection for all albums?</div>
            <div style={{ background: 'var(--cp-surface-2)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--cp-text-2)', marginBottom: 12 }}>
              {albums.map((a: any) => {
                const cnt = (countsByAlbum.get(a.id) || []).length;
                return (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--cp-border)' }}>
                    <span>{a.name}</span>
                    <span style={{ fontWeight: 500, color: cnt >= a.max ? '#22c55e' : '#f59e0b' }}>{cnt}/{a.max}</span>
                  </div>
                );
              })}
            </div>
            <div className="cp-mac">
              <button className="cp-bb" onClick={onClose}>Not Yet</button>
              <button className="cp-bn" onClick={() => setStep(2)}>Yes, Proceed →</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="cp-mt">Album Details</div>
            <div className="cp-ms">Confirm names and date for the album design</div>
            <div className="cp-mr">
              <div className="cp-mf">
                <label>Bride (First Name)</label>
                <input value={bride} onChange={(e) => setBride(e.target.value)} placeholder="Bride name" />
              </div>
              <div className="cp-mf">
                <label>Groom (First Name)</label>
                <input value={groom} onChange={(e) => setGroom(e.target.value)} placeholder="Groom name" />
              </div>
            </div>
            <div className="cp-in">⚠️ The date you select will be printed on your album. Ensure it is accurate.</div>

            <div style={{ fontSize: 10, color: 'var(--cp-text-3)', marginBottom: 6 }}>Wedding date (defaults from your events — change if needed)</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('flex-1 justify-start text-left font-normal min-w-[160px]', !dateAd && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateAd ? format(new Date(dateAd), 'PPP') : 'Pick AD (English) date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateAd ? new Date(dateAd) : undefined}
                    onSelect={(d) => d && setDateAd(format(d, 'yyyy-MM-dd'))}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              <div style={{ flex: 1, minWidth: 160 }}>
                <NepaliDatePicker
                  onDateSelect={(ad) => setDateAd(ad)}
                  triggerLabel={dateAd ? 'Change BS (Nepali)' : 'Pick BS (Nepali) date'}
                />
              </div>
            </div>
            <div style={{ background: 'var(--cp-surface-2)', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>
              <NepaliEnglishDate value={dateAd} size="sm" />
            </div>

            <div className="cp-mac">
              <button className="cp-bb" onClick={() => setStep(1)}>← Back</button>
              <button className="cp-bn" onClick={() => setStep(3)}>Next →</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="cp-mt">Send via WhatsApp</div>
            <div className="cp-ms">Choose who to send the album details to</div>
            <div className="cp-sb">
              <strong>Bride:</strong> {bride || '—'}<br />
              <strong>Groom:</strong> {groom || '—'}<br />
              <strong>Date:</strong> {dateAd || 'Not selected'}<br />
              {albums.map((a: any) => (
                <span key={a.id}>• {a.name}: {(countsByAlbum.get(a.id) || []).length} photos<br /></span>
              ))}
            </div>
            {contacts.length === 0 ? (
              <div style={{ padding: 12, background: 'var(--cp-surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--cp-text-3)', textAlign: 'center' }}>
                No WhatsApp contact configured by your studio yet.
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.phone} className="cp-crow" onClick={() => sendWa(c.phone, c.name)}>
                  <div className="cp-cav">{c.name[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <div className="cp-cn">{c.name}{c.tag ? <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--rose)', background: '#fee2e2', padding: '1px 5px', borderRadius: 4 }}>{c.tag}</span> : null}</div>
                    <div className="cp-cp">{c.phone}</div>
                  </div>
                  <span style={{ fontSize: 18, color: '#22c55e', marginLeft: 'auto' }}>💬</span>
                </div>
              ))
            )}
            <div className="cp-mac" style={{ marginTop: 0 }}>
              <button className="cp-bb" onClick={() => setStep(2)} style={{ flex: 1 }}>← Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
