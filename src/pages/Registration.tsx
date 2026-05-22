import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUpsertProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NEPAL_CITIES, SKILLS, EVENT_TYPES, MAIN_JOB_PRIORITY, ACCOUNT_TYPES, AGENCY_SHOOT_TYPES, SkillKey, AccountTypeKey } from '@/lib/constants';
import AccountTypePicker from '@/components/AccountTypePicker';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Camera } from 'lucide-react';
import ImageCropper from '@/components/ImageCropper';
import { compressImage } from '@/lib/imageCompressor';

type FormData = {
  account_type: AccountTypeKey;
  business_name: string;
  full_name: string;
  whatsapp_number: string;
  contact_number: string;
  whatsapp_same_as_contact: boolean;
  email: string;
  profile_photo_url: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  city: string;
  area: string;
  google_map_link: string;
  pathao_landmark: string;
  skills: Record<SkillKey, boolean>;
  main_job_override: string;
  camera_body: string;
  lenses: string;
  drone_model: string;
  editing_setup: string;
  available_for_travel: boolean;
  preferred_event_types: string[];
  rate_per_day: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  portfolio_links: string[];
  bio: string;
  // Agency extra contacts
  contact_person_2_name: string;
  contact_person_2_number: string;
  contact_person_2_whatsapp: string;
  contact_person_2_same: boolean;
  contact_person_3_name: string;
  contact_person_3_number: string;
  contact_person_3_whatsapp: string;
  contact_person_3_same: boolean;
};

const initialForm: FormData = {
  account_type: '' as AccountTypeKey,
  business_name: '',
  full_name: '',
  whatsapp_number: '',
  contact_number: '',
  whatsapp_same_as_contact: false,
  email: '',
  profile_photo_url: '',
  instagram: '',
  facebook: '',
  youtube: '',
  tiktok: '',
  city: '',
  area: '',
  google_map_link: '',
  pathao_landmark: '',
  skills: {
    photographer: false,
    videographer: false,
    photo_editor: false,
    video_editor: false,
    drone_operator: false,
    fpv_operator: false,
    iphone_shooter: false,
  },
  main_job_override: '',
  camera_body: '',
  lenses: '',
  drone_model: '',
  editing_setup: '',
  available_for_travel: true,
  preferred_event_types: [],
  rate_per_day: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_holder: '',
  portfolio_links: [''],
  bio: '',
  contact_person_2_name: '',
  contact_person_2_number: '',
  contact_person_2_whatsapp: '',
  contact_person_2_same: false,
  contact_person_3_name: '',
  contact_person_3_number: '',
  contact_person_3_whatsapp: '',
  contact_person_3_same: false,
};

const STEPS = ['Account Type', 'Basic Info', 'Location', 'Skills'];

/* ── Reusable contact person block ── */
function ContactPersonBlock({
  label,
  optional,
  name, onNameChange,
  number, onNumberChange,
  whatsapp, onWhatsappChange,
  sameAsContact, onSameToggle,
}: {
  label: string;
  optional?: boolean;
  name: string; onNameChange: (v: string) => void;
  number: string; onNumberChange: (v: string) => void;
  whatsapp: string; onWhatsappChange: (v: string) => void;
  sameAsContact: boolean; onSameToggle: (v: boolean) => void;
}) {
  const req = optional ? '' : ' *';
  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
      <p className="text-sm font-semibold text-foreground">{label}{optional && <span className="text-xs font-normal text-muted-foreground ml-1">(Optional)</span>}</p>
      <div className="space-y-2">
        <Label>Name{req}</Label>
        <Input value={name} onChange={e => onNameChange(e.target.value)} placeholder="Full name" />
      </div>
      <div className="space-y-2">
        <Label>Contact Number{req}</Label>
        <Input value={number} onChange={e => onNumberChange(e.target.value)} placeholder="+977 98XXXXXXXX" />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Checkbox
          id={`same-${label}`}
          checked={sameAsContact}
          onCheckedChange={(v) => onSameToggle(!!v)}
        />
        <label htmlFor={`same-${label}`} className="text-xs text-muted-foreground cursor-pointer">
          WhatsApp same as contact number
        </label>
      </div>
      {!sameAsContact && (
        <div className="space-y-2">
           <Label>WhatsApp Number{req}</Label>
          <Input value={whatsapp} onChange={e => onWhatsappChange(e.target.value)} placeholder="+977 98XXXXXXXX" />
        </div>
      )}
    </div>
  );
}

export default function Registration({ editMode = false, initialData }: { editMode?: boolean; initialData?: Partial<FormData> }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(() => {
    if (initialData) return { ...initialForm, ...initialData };
    return initialForm;
  });
  const { upload: uploadMedia, uploading } = useMediaUpload();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const upsert = useUpsertProfile();
  const navigate = useNavigate();
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleSkill = (key: SkillKey) =>
    setForm(prev => ({
      ...prev,
      skills: { ...prev.skills, [key]: !prev.skills[key] },
    }));

  const mainJob = form.main_job_override;
  const isAgency = form.account_type === 'agency';
  const isSolo = form.account_type === 'solo_creative';
  const accountMeta = ACCOUNT_TYPES.find(t => t.key === form.account_type);
  const nameLabel = accountMeta?.nameLabel || 'Full Name';

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setCropperSrc(URL.createObjectURL(file));
    setPendingPhotoFile(file);
  };

  const handleCroppedPhoto = async (croppedFile: File) => {
    setCropperSrc(null);
    setPendingPhotoFile(null);
    const compressed = await compressImage(croppedFile);
    const result = await uploadMedia(compressed, 'avatars');
    if (result) {
      update('profile_photo_url', result.url);
      toast.success('Photo uploaded!');
    }
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return toast.error('Full name is required');
    if (!form.contact_number.trim()) return toast.error('Contact number is required');
    if (!form.whatsapp_same_as_contact && !form.whatsapp_number.trim()) return toast.error('WhatsApp number is required');
    if (form.account_type !== 'solo_creative' && !form.business_name.trim()) return toast.error('Business name is required');
    if (form.account_type === 'solo_creative' && !form.main_job_override) return toast.error('Main job role is required');
    if (form.account_type === 'agency' && !form.main_job_override) return toast.error('"What do you shoot most?" is required');

    const effectiveWhatsapp = form.whatsapp_same_as_contact ? form.contact_number : form.whatsapp_number;

    const profile: Record<string, any> = {
      account_type: form.account_type,
      business_name: form.account_type !== 'solo_creative' ? form.business_name : '',
      full_name: form.full_name,
      whatsapp_number: effectiveWhatsapp,
      contact_number: form.contact_number,
      email: form.email || user?.email || '',
      profile_photo_url: form.profile_photo_url,
      instagram: form.instagram,
      facebook: form.facebook,
      youtube: form.youtube,
      tiktok: form.tiktok,
      city: form.city,
      area: form.area,
      google_map_link: form.google_map_link,
      pathao_landmark: form.pathao_landmark,
      main_job: mainJob,
      camera_body: form.camera_body,
      lenses: form.lenses,
      drone_model: form.drone_model,
      editing_setup: form.editing_setup,
      available_for_travel: form.available_for_travel,
      preferred_event_types: form.preferred_event_types.join(', '),
      rate_per_day: form.rate_per_day,
      bank_name: form.bank_name,
      bank_account_number: form.bank_account_number,
      bank_account_holder: form.bank_account_holder,
      portfolio_links: form.portfolio_links.filter(l => l.trim()),
      bio: form.bio,
    };

    // Agency extra contacts
    if (isAgency) {
      profile.contact_person_2_name = form.contact_person_2_name;
      profile.contact_person_2_number = form.contact_person_2_number;
      profile.contact_person_2_whatsapp = form.contact_person_2_same ? form.contact_person_2_number : form.contact_person_2_whatsapp;
      profile.contact_person_3_name = form.contact_person_3_name;
      profile.contact_person_3_number = form.contact_person_3_number;
      profile.contact_person_3_whatsapp = form.contact_person_3_same ? form.contact_person_3_number : form.contact_person_3_whatsapp;
    }

    // Set skill flags
    for (const s of SKILLS) {
      profile[s.key] = form.skills[s.key] ? 'YES' : 'NO';
    }
    profile.hybrid_shooter = (form.skills.photographer && form.skills.videographer) ? 'YES' : 'NO';
    profile.hybrid_editor = (form.skills.photo_editor && form.skills.video_editor) ? 'YES' : 'NO';

    try {
      await upsert.mutateAsync(profile);
      await queryClient.refetchQueries({ queryKey: ['my-profile', user?.id] });
      toast.success(editMode ? 'Profile updated!' : 'Welcome to Xito Freelancer!');
      navigate('/', { replace: true });
    } catch {
      toast.error('Failed to save profile');
    }
  };

  const canNext = () => {
    if (step === 0) return !!form.account_type;
    if (step === 1) return form.full_name.trim() && form.contact_number.trim();
    if (step === 3 && (isSolo || isAgency)) return !!form.main_job_override;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground">
              {editMode ? 'Edit Profile' : 'Complete Your Profile'}
            </h1>
            {!editMode && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/auth', { replace: true });
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            )}
          </div>
          {/* Progress */}
          <div className="flex gap-1.5 mt-3">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg lg:max-w-3xl mx-auto w-full space-y-5">
        {step === 0 && (
          <AccountTypePicker selected={form.account_type} onSelect={v => update('account_type', v)} />
        )}

        {step === 1 && (
          <>
            {/* Photo */}
            <div className="flex justify-center">
              <label className="relative cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                  {form.profile_photo_url ? (
                    <img src={form.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
            </div>

            {!isSolo && (
              <div className="space-y-2">
                <Label>{nameLabel} *</Label>
                <Input value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder={nameLabel} />
              </div>
            )}

            <div className="space-y-2">
              <Label>{isSolo ? 'Full Name *' : 'Contact Person Name *'}</Label>
              <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder={isSolo ? 'Your full name' : 'Contact person name'} />
            </div>
            <div className="space-y-2">
              <Label>Contact Number *</Label>
              <Input value={form.contact_number} onChange={e => update('contact_number', e.target.value)} placeholder="+977 98XXXXXXXX" />
            </div>

            {/* Same as contact checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="whatsapp-same"
                checked={form.whatsapp_same_as_contact}
                onCheckedChange={(v) => update('whatsapp_same_as_contact', !!v)}
              />
              <label htmlFor="whatsapp-same" className="text-xs text-muted-foreground cursor-pointer">
                WhatsApp same as contact number
              </label>
            </div>

            {!form.whatsapp_same_as_contact && (
              <div className="space-y-2">
                <Label>WhatsApp Number *</Label>
                <Input value={form.whatsapp_number} onChange={e => update('whatsapp_number', e.target.value)} placeholder="+977 98XXXXXXXX" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email || user?.email || ''} onChange={e => update('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio || ''} onChange={e => update('bio', e.target.value)} placeholder="Tell others about yourself..." rows={3} />
            </div>

            {/* Agency: 2 extra contact persons */}
            {isAgency && (
              <>
                <ContactPersonBlock
                  optional
                  label="Contact Person 2"
                  name={form.contact_person_2_name}
                  onNameChange={v => update('contact_person_2_name', v)}
                  number={form.contact_person_2_number}
                  onNumberChange={v => update('contact_person_2_number', v)}
                  whatsapp={form.contact_person_2_whatsapp}
                  onWhatsappChange={v => update('contact_person_2_whatsapp', v)}
                  sameAsContact={form.contact_person_2_same}
                  onSameToggle={v => update('contact_person_2_same', v)}
                />
                <ContactPersonBlock
                  optional
                  label="Contact Person 3"
                  name={form.contact_person_3_name}
                  onNameChange={v => update('contact_person_3_name', v)}
                  number={form.contact_person_3_number}
                  onNumberChange={v => update('contact_person_3_number', v)}
                  whatsapp={form.contact_person_3_whatsapp}
                  onWhatsappChange={v => update('contact_person_3_whatsapp', v)}
                  sameAsContact={form.contact_person_3_same}
                  onSameToggle={v => update('contact_person_3_same', v)}
                />
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={form.city} onValueChange={v => update('city', v)}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {NEPAL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Area / Tole</Label>
              <Input value={form.area || ''} onChange={e => update('area', e.target.value)} placeholder="Your area" />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={form.instagram || ''} onChange={e => update('instagram', e.target.value)} placeholder="@username" />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input value={form.facebook || ''} onChange={e => update('facebook', e.target.value)} placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input value={form.youtube || ''} onChange={e => update('youtube', e.target.value)} placeholder="https://youtube.com/@channel" />
            </div>
            <div className="space-y-2">
              <Label>TikTok</Label>
              <Input value={form.tiktok || ''} onChange={e => update('tiktok', e.target.value)} placeholder="@username" />
            </div>
            <div className="space-y-2">
              <Label>Google Map Link</Label>
              <Input value={form.google_map_link || ''} onChange={e => update('google_map_link', e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Pathao Landmark</Label>
              <Input value={form.pathao_landmark || ''} onChange={e => update('pathao_landmark', e.target.value)} placeholder="Nearest landmark for pickup" />
            </div>
          </>
        )}

        {step === 3 && isAgency && (
          <>
            <p className="text-sm text-muted-foreground">What do you shoot?</p>
            <div className="grid grid-cols-2 gap-3">
              {AGENCY_SHOOT_TYPES.map(st => {
                const isSelected = form.preferred_event_types.includes(st);
                return (
                  <button
                    key={st}
                    onClick={() => {
                      const current = form.preferred_event_types;
                      update('preferred_event_types', isSelected
                        ? current.filter(x => x !== st)
                        : [...current, st]
                      );
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    <span className="text-sm font-semibold">{st}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>What do you shoot most? *</Label>
              <Select value={form.main_job_override} onValueChange={v => update('main_job_override', v)}>
                <SelectTrigger><SelectValue placeholder="Select your primary shoot type" /></SelectTrigger>
                <SelectContent>
                  {AGENCY_SHOOT_TYPES.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Portfolio links */}
            <div className="space-y-2">
              <Label>Portfolio / Work Links</Label>
              {form.portfolio_links.map((link, i) => (
                <Input
                  key={i}
                  value={link}
                  onChange={e => {
                    const updated = [...form.portfolio_links];
                    updated[i] = e.target.value;
                    update('portfolio_links', updated);
                  }}
                  placeholder="YouTube, Instagram, Drive link..."
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => update('portfolio_links', [...form.portfolio_links, ''])}
              >
                + Add another link
              </Button>
            </div>
          </>
        )}

        {step === 3 && !isAgency && (
          <>
            <p className="text-sm text-muted-foreground">Select all the skills you offer:</p>
            <div className="grid grid-cols-2 gap-3">
              {SKILLS.map(s => (
                <button
                  key={s.key}
                  onClick={() => toggleSkill(s.key)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.skills[s.key]
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <span className="text-sm font-semibold">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Main Job Role *</Label>
              <Select value={form.main_job_override} onValueChange={v => update('main_job_override', v)}>
                <SelectTrigger><SelectValue placeholder="Select your main role" /></SelectTrigger>
                <SelectContent>
                  {MAIN_JOB_PRIORITY.map(j => (
                    <SelectItem key={j.key} value={j.label}>{j.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Portfolio links */}
            <div className="space-y-2">
              <Label>Portfolio / Work Links</Label>
              {form.portfolio_links.map((link, i) => (
                <Input
                  key={i}
                  value={link}
                  onChange={e => {
                    const updated = [...form.portfolio_links];
                    updated[i] = e.target.value;
                    update('portfolio_links', updated);
                  }}
                  placeholder="YouTube, Instagram, Drive link..."
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => update('portfolio_links', [...form.portfolio_links, ''])}
              >
                + Add another link
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-xs text-muted-foreground">This step is optional. You can skip it.</p>
            {!isAgency && (
              <>
                <div className="space-y-2">
                  <Label>Camera Body</Label>
                  <Input value={form.camera_body || ''} onChange={e => update('camera_body', e.target.value)} placeholder="e.g. Sony A7IV" />
                </div>
                <div className="space-y-2">
                  <Label>Lenses</Label>
                  <Textarea value={form.lenses || ''} onChange={e => update('lenses', e.target.value)} placeholder="e.g. 24-70mm f/2.8, 85mm f/1.4" rows={2} />
                </div>
              </>
            )}
            {!isAgency && (form.skills.drone_operator || form.skills.fpv_operator) && (
              <div className="space-y-2">
                <Label>Drone Model</Label>
                <Input value={form.drone_model || ''} onChange={e => update('drone_model', e.target.value)} placeholder="e.g. DJI Mavic 3" />
              </div>
            )}
            {!isAgency && (form.skills.photo_editor || form.skills.video_editor) && (
              <div className="space-y-2">
                <Label>Editing Setup</Label>
                <Input value={form.editing_setup || ''} onChange={e => update('editing_setup', e.target.value)} placeholder="e.g. MacBook Pro M2, DaVinci Resolve" />
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
              <Label>Available for travel?</Label>
              <Switch checked={form.available_for_travel} onCheckedChange={v => update('available_for_travel', v)} />
            </div>
            {!isAgency && (
              <>
                <div className="space-y-2">
                  <Label>Preferred Event Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map(e => (
                      <button
                        key={e}
                        onClick={() => {
                          const current = form.preferred_event_types;
                          update('preferred_event_types', current.includes(e)
                            ? current.filter(x => x !== e)
                            : [...current, e]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          form.preferred_event_types.includes(e)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rate per Day (NPR)</Label>
                  <Input value={form.rate_per_day || ''} onChange={e => update('rate_per_day', e.target.value)} placeholder="Private — won't be shown to others" />
                </div>
              </>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-xs text-muted-foreground">This info is private and only used for payment processing. You can skip this step.</p>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={form.bank_name || ''} onChange={e => update('bank_name', e.target.value)} placeholder="e.g. NIC Asia" />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input value={form.bank_account_number || ''} onChange={e => update('bank_account_number', e.target.value)} placeholder="Your bank account number" />
            </div>
            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input value={form.bank_account_holder || ''} onChange={e => update('bank_account_holder', e.target.value)} placeholder="Name as on bank account" />
            </div>
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-16 bg-background/80 backdrop-blur-lg border-t border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 h-12 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 h-12 rounded-xl"
            >
              {step >= 3 ? 'Skip / Next' : 'Next'} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={upsert.isPending}
              className="flex-1 h-12 rounded-xl"
            >
              {upsert.isPending ? 'Saving...' : (
                <><Check className="w-4 h-4 mr-1" /> {editMode ? 'Save Changes' : 'Complete Setup'}</>
              )}
            </Button>
          )}
        </div>
      </div>
      {cropperSrc && (
        <ImageCropper
          open={!!cropperSrc}
          imageSrc={cropperSrc}
          aspect={1}
          onComplete={handleCroppedPhoto}
          onCancel={() => { setCropperSrc(null); setPendingPhotoFile(null); }}
        />
      )}
    </div>
  );
}
