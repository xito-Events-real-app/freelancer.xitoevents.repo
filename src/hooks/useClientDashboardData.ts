import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { keyForAgency } from '@/lib/queryKeys';
import { CREW_COLUMNS } from '@/lib/crew-columns';

/**
 * Aggregates every table backing the WTN client dashboard for one client.
 * Returns a shape designed for direct postMessage hydration into
 * `public/wtn-dashboard.html`.
 */
export function useClientDashboardData(clientId?: string) {
  const { activeAgencyId, switching } = useActiveCompany();

  return useQuery({
    queryKey: keyForAgency('client-dashboard-bundle', activeAgencyId, clientId ?? null),
    enabled: !!clientId && !!activeAgencyId && !switching,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,

    queryFn: async () => {
      if (!clientId) return null;

      const [
        clientRes,
        contactRes,
        eventsRes,
        familyRes,
        refsRes,
        activityRes,
        paymentsRes,
      ] = await Promise.all([
        supabase.from('agency_clients').select('*').eq('id', clientId).maybeSingle(),
        supabase.from('client_contact_details').select('*').eq('client_id', clientId).maybeSingle(),
        supabase.from('agency_client_events').select('*').eq('client_id', clientId).order('event_date_ad', { ascending: true }),
        supabase.from('agency_client_family_members').select('*').eq('client_id', clientId).order('display_order', { ascending: true }),
        supabase.from('client_portal_references').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('agency_client_activity_log').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(20),
        supabase.from('agency_client_payments').select('amount, payment_date, payment_date_bs, note, payment_type, is_opening_balance').eq('client_id', clientId).order('payment_date', { ascending: true }),
      ]);

      const client = clientRes.data;
      const events = eventsRes.data ?? [];
      const eventIds = events.map(e => e.id);

      // Crew assignments + venue/parlour locations for all events of this client
      const [{ data: crewRows }, { data: locRows }] = eventIds.length
        ? (await Promise.all([
            supabase.from('crew_assignments').select('*').in('event_id', eventIds),
            supabase.from('client_event_locations').select('*').in('event_id', eventIds),
          ])) as any
        : [{ data: [] as any[] }, { data: [] as any[] }];

      // Freelancer profiles → name→photo map + per-role roster
      const { data: freelancerProfiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, profile_photo_url, photographer, videographer, photo_editor, video_editor, iphone_shooter, drone_operator, fpv_operator')
        .limit(1000);
      const nameToPhoto = new Map<string, string>();
      const nameToUserId = new Map<string, string>();
      (freelancerProfiles ?? []).forEach((p: any) => {
        if (p.full_name) {
          const k = p.full_name.trim().toLowerCase();
          nameToPhoto.set(k, p.profile_photo_url || '');
          if (p.user_id) nameToUserId.set(k, p.user_id);
        }
      });
      const photoFor = (name?: string | null) => name ? (nameToPhoto.get(name.trim().toLowerCase()) || '') : '';
      const freelancersByRole: Record<string, Array<{ name: string; photo: string }>> = {};
      CREW_COLUMNS.forEach(col => {
        const list = (freelancerProfiles ?? [])
          .filter((p: any) => {
            if (!p.full_name) return false;
            if (!col.profileField) return true;
            const v = (p as any)[col.profileField];
            return v != null && String(v).trim() !== '' && String(v).toLowerCase() !== 'no';
          })
          .map((p: any) => ({ name: p.full_name, photo: p.profile_photo_url || '' }));
        freelancersByRole[col.key] = list;
      });

      // Per-freelancer bookings for the current ±60 days window (used for hover-calendar)
      const now = new Date();
      const winStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const winEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().slice(0, 10);
      const allUserIds = Array.from(new Set(Array.from(nameToUserId.values())));
      const freelancerBookings: Record<string, Array<{ date: string; event_name: string }>> = {};
      if (allUserIds.length) {
        const { data: bk } = await supabase
          .from('bookings')
          .select('user_id, booking_date, event_name')
          .in('user_id', allUserIds)
          .gte('booking_date', winStart)
          .lte('booking_date', winEnd)
          .limit(2000);
        const userIdToName = new Map<string, string>();
        nameToUserId.forEach((uid, lname) => {
          const orig = (freelancerProfiles ?? []).find((p: any) => p.full_name && p.full_name.trim().toLowerCase() === lname);
          if (orig?.full_name) userIdToName.set(uid, orig.full_name);
        });
        (bk ?? []).forEach((b: any) => {
          const nm = userIdToName.get(b.user_id);
          if (!nm) return;
          (freelancerBookings[nm] ||= []).push({ date: b.booking_date, event_name: b.event_name || '' });
        });
      }

      // Activity log → resolve profile names
      const activity = activityRes.data ?? [];
      const profileIds = Array.from(new Set(activity.map(a => a.created_by).filter(Boolean))) as string[];
      let profileMap = new Map<string, string>();
      if (profileIds.length) {
        const { data: profiles } = await supabase
          .from('freelancer_profiles')
          .select('user_id, full_name')
          .in('user_id', profileIds);
        profileMap = new Map(((profiles ?? []) as any[]).map((p: any) => [p.user_id, p.full_name]));
      }

      const paymentRows = (paymentsRes.data ?? []) as any[];
      const totalPaid = paymentRows
        .filter(p => !p.is_opening_balance)
        .reduce((s, p) => s + (p.amount || 0), 0);
      const advanceOnly = client?.advance_amount || 0;
      const advance = advanceOnly + totalPaid;
      const remaining = Math.max((client?.package_amount || 0) - advance, 0);

      const split = splitCouple(client?.client_name);
      const groom = (contactRes.data?.groom_full_name || split.groom || '').trim();
      const bride = (contactRes.data?.bride_full_name || split.bride || '').trim();
      const groomPhone = normPhone(contactRes.data?.groom_whatsapp_number || contactRes.data?.groom_contact_number || client?.whatsapp_number || client?.contact_number);
      const bridePhone = normPhone(contactRes.data?.bride_whatsapp_number || contactRes.data?.bride_contact_number || client?.whatsapp_number || client?.contact_number);
      const clientPhone = normPhone(client?.whatsapp_number || client?.contact_number);

      // Group raw references by event_name
      const refsByEvent: Record<string, any[]> = {};
      (refsRes.data ?? []).forEach((r: any) => {
        const key = (r.event_name || '').toLowerCase().trim();
        (refsByEvent[key] ||= []).push(r);
      });

      // Build event payload — emit ALL required role slots (assigned + missing)
      const eventsPayload = events.map(ev => {
        const requiredKeys = String((ev as any).required_crew || '')
          .split(',').map((s: string) => s.trim()).filter(Boolean);
        const assignedHere = (crewRows ?? []).filter(c => c.event_id === ev.id);
        const slotKeys: string[] = [];
        requiredKeys.forEach(k => { if (!slotKeys.includes(k)) slotKeys.push(k); });
        assignedHere.forEach(c => { if (c.role && !slotKeys.includes(c.role)) slotKeys.push(c.role); });
        const evCrew = slotKeys.map(roleKey => {
          const col = CREW_COLUMNS.find(c => c.key === roleKey);
          const a = assignedHere.find(c => c.role === roleKey);
          const name = (a?.assigned_freelancer || '').trim() || null;
          return {
            roleKey,
            shortCode: col?.shortCode || roleKey,
            fullRole: col?.label || roleKey,
            badge: col?.shortCode || roleKey,
            name,
            photo: photoFor(name),
            cls: badgeClassFromKey(roleKey),
          };
        });
        const loc = (locRows ?? []).find((l: any) => l.event_id === ev.id);
        const venueName = (loc?.venue_name || '').trim();
        const parlourName = (loc?.parlour_name || '').trim();
        const to12h = (t?: string | null) => {
          const s = (t || '').trim();
          if (!s) return '';
          // Already has AM/PM
          if (/am|pm/i.test(s)) return s.toUpperCase().replace(/\s+/g, ' ');
          const m = s.match(/^(\d{1,2}):(\d{2})/);
          if (!m) return s;
          let h = parseInt(m[1], 10); const mn = m[2];
          const ap = h >= 12 ? 'PM' : 'AM';
          h = h % 12; if (h === 0) h = 12;
          return `${h}:${mn} ${ap}`;
        };
        const fmtTime = (s?: string, e?: string) => {
          const a = to12h(s), b = to12h(e);
          if (a && b) return `${a} – ${b}`;
          return a || b || '';
        };
        const venueMapUrl = (loc?.venue_google_map || '').trim()
          || (loc?.venue_lat && loc?.venue_lng ? `https://www.google.com/maps/search/?api=1&query=${loc.venue_lat},${loc.venue_lng}` : '')
          || (venueName ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' ' + (loc?.venue_area || ''))}` : '');
        const evNameKey = (ev.event_name || '').toLowerCase().trim();
        const eventRefs = (refsByEvent[evNameKey] || []).map((r: any) => ({
          entry_type: r.entry_type, platform: r.platform,
          link_url: r.link_url, link_title: r.link_title, description: r.description,
        }));
        return {
          id: ev.id,
          date: (ev.event_date_bs || '').toUpperCase(),
          dateAD: ev.event_date_ad ? formatAD(ev.event_date_ad) : '',
          adISO: ev.event_date_ad || '',
          type: (ev.event_name || 'EVENT').toUpperCase(),
          pinned: false,
          venue: {
            name: venueName || 'Not set',
            area: (loc?.venue_area || '').trim() || null,
            address: (loc?.venue_address || '').trim() || null,
            mapUrl: venueMapUrl || null,
            time: fmtTime(loc?.start_time, loc?.end_time),
            guests: loc?.guest_count || null,
          },
          parlour: parlourName ? { name: parlourName, area: (loc?.parlour_address || '').trim() || null, time: '' } : null,
          crew: evCrew,
          demands: [] as string[],
          references: eventRefs,
        };
      });

      // Family (exclude pending uploads-in-progress)
      const family = (familyRes.data ?? [])
        .filter(m => !m.pending)
        .map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          side: (m.side || 'bride').toLowerCase(),
          photo: m.photo_url || null,
        }));

      // References — grouped by event_name into the 5 tabs the HTML expects
      const refTabs = ['general', 'engagement', 'mehndi', 'wedding', 'reception'];
      const refData: Record<string, { photos: any[]; links: any[]; notes: string; noteList: { text: string; created_at: string }[] }> = {};
      refTabs.forEach(t => { refData[t] = { photos: [], links: [], notes: '', noteList: [] }; });
      (refsRes.data ?? []).forEach((r: any) => {
        const tab = matchRefTab(r.event_name) || 'general';
        const bucket = refData[tab];
        if (r.entry_type === 'photo' && r.image_url) {
          bucket.photos.push({ url: r.image_url, caption: r.description || '' });
        } else if (r.entry_type === 'link' && r.link_url) {
          bucket.links.push({ label: r.link_title || r.link_url, tag: r.platform || 'Link', url: r.link_url });
        } else if ((r.entry_type === 'note' || r.entry_type === 'demand') && r.description) {
          bucket.noteList.push({ text: r.description, created_at: r.created_at });
          bucket.notes = bucket.notes ? `${bucket.notes}\n\n${r.description}` : r.description;
        }
      });
      // Sort notes newest first
      refTabs.forEach(t => {
        refData[t].noteList.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      });

      // Activity
      const activityPayload = activity.map(a => ({
        created_at: a.created_at,
        text: a.action_text || '',
        by: profileMap.get(a.created_by) || '',
      }));

      // Crew aggregate stats — base missing on each event's required_crew vs actual assignments
      const assignedSet = new Set(
        (crewRows ?? [])
          .filter(c => (c.assigned_freelancer || '').trim())
          .map(c => `${c.event_id}_${c.role}`),
      );
      const uniqueAssigned = new Set(
        (crewRows ?? [])
          .map(c => (c.assigned_freelancer || '').trim())
          .filter(Boolean),
      );
      const assignedCrew = uniqueAssigned.size;

      const colLabel = (key: string) => {
        const c = CREW_COLUMNS.find(col => col.key === key);
        return c?.label || key;
      };

      let totalSlots = 0;
      const missingByRole: Record<string, number> = {};
      events.forEach(ev => {
        const req = ((ev as any).required_crew || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        req.forEach((k: string) => {
          totalSlots += 1;
          if (!assignedSet.has(`${ev.id}_${k}`)) {
            const label = colLabel(k);
            missingByRole[label] = (missingByRole[label] || 0) + 1;
          }
        });
      });
      const totalCrew = totalSlots || (crewRows ?? []).length;

      return {
        client,
        names: { groom, bride, clientName: client?.client_name || '' },
        phones: { client: clientPhone, bride: bridePhone, groom: groomPhone },
        status: (client?.status || 'BOOKED').toUpperCase(),
        handler: (client?.handler || '').toUpperCase(),
        rating: client?.rating || 0,
        profilePhoto: client?.couple_photo_url || client?.profile_photo_url || null,
        clientSlug: client?.client_slug || '',
        finance: {
          package: client?.package_amount || 0,
          advance,
          advanceOnly,
          totalPaid,
          remaining,
          payments: paymentRows.map(p => ({
            date: p.payment_date,
            dateBs: p.payment_date_bs || '',
            amount: p.amount || 0,
            note: p.note || '',
            type: p.payment_type || '',
            isOpening: !!p.is_opening_balance,
          })),
        },
        stats: {
          totalEvents: events.length,
          coreFamily: family.length,
          references: (refsRes.data ?? []).length,
          crewAssigned: assignedCrew,
          crewTotal: totalCrew,
          crewMissingByRole: missingByRole,
        },
        events: eventsPayload,
        family,
        refData,
        activity: activityPayload,
        freelancersByRole,
        freelancerBookings,
      };
    },
  });
}

function splitCouple(name: string | null | undefined) {
  if (!name) return { groom: '', bride: '' };
  const m = name.split(/\s*&\s*|\s+and\s+/i);
  return { groom: (m[0] ?? '').trim(), bride: (m[1] ?? '').trim() };
}

function normPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 && digits.startsWith('9')) return `977${digits}`;
  return digits;
}

function formatAD(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function badgeClass(role: string | null | undefined): string {
  const r = (role || '').toUpperCase();
  if (r.includes('PB') || r === 'PHOTO (BRIDE)') return 'badge-pb';
  if (r.includes('VB') || r === 'VIDEO (BRIDE)') return 'badge-vb';
  if (r.includes('PG') || r === 'PHOTO (GROOM)') return 'badge-pg';
  if (r.includes('VG') || r === 'VIDEO (GROOM)') return 'badge-vg';
  if (r.includes('IPHONE')) return 'badge-iphone';
  if (r.includes('DRONE')) return 'badge-drone';
  if (r.includes('FPV')) return 'badge-fpv';
  return 'badge-pb';
}

function badgeClassFromKey(key: string): string {
  switch (key) {
    case 'photographer_bride': return 'badge-pb';
    case 'videographer_bride': return 'badge-vb';
    case 'photographer_groom': return 'badge-pg';
    case 'videographer_groom': return 'badge-vg';
    case 'editor_photo': return 'badge-ep';
    case 'editor_video': return 'badge-ev';
    case 'assistant': return 'badge-asst';
    case 'iphone': return 'badge-iphone';
    case 'drone': return 'badge-drone';
    case 'fpv': return 'badge-fpv';
    default: return 'badge-pb';
  }
}

function matchRefTab(eventName: string | null | undefined): string | null {
  const n = (eventName || '').toLowerCase();
  if (!n) return 'general';
  if (n.includes('engage')) return 'engagement';
  if (n.includes('mehndi') || n.includes('mehendi')) return 'mehndi';
  if (n.includes('reception')) return 'reception';
  if (n.includes('wedding') || n.includes('phera')) return 'wedding';
  return 'general';
}
