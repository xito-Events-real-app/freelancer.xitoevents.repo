export const SITE_URL = 'https://freelancer.xitoevents.com';

export const NEPAL_CITIES = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan',
  'Butwal', 'Biratnagar', 'Dharan', 'Nepalgunj', 'Birgunj',
  'Hetauda', 'Itahari', 'Damak', 'Dhangadhi', 'Bharatpur',
];

export const SKILLS = [
  { key: 'photographer', label: 'Photographer', icon: 'Camera' },
  { key: 'videographer', label: 'Videographer', icon: 'Video' },
  { key: 'photo_editor', label: 'Photo Editor', icon: 'ImagePlus' },
  { key: 'video_editor', label: 'Video Editor', icon: 'Film' },
  { key: 'drone_operator', label: 'Drone Operator', icon: 'Plane' },
  { key: 'fpv_operator', label: 'FPV Operator', icon: 'Zap' },
  { key: 'iphone_shooter', label: 'iPhone Shooter', icon: 'Smartphone' },
] as const;

export const EVENT_TYPES = [
  'Wedding', 'Pre-wedding', 'Reception', 'Engagement',
  'Mehendi', 'Birthday', 'Corporate', 'Music Video', 'Other',
];

export const MAIN_JOB_PRIORITY = [
  { key: 'photographer', label: 'PHOTOGRAPHER' },
  { key: 'videographer', label: 'VIDEOGRAPHER' },
  { key: 'photo_editor', label: 'PHOTO EDITOR' },
  { key: 'video_editor', label: 'VIDEO EDITOR' },
  { key: 'drone_operator', label: 'DRONE OPERATOR' },
  { key: 'fpv_operator', label: 'FPV OPERATOR' },
  { key: 'iphone_shooter', label: 'IPHONE SHOOTER' },
] as const;

export type SkillKey = typeof SKILLS[number]['key'];

export const AGENCY_SHOOT_TYPES = [
  'Wedding Events',
  'Corporate Events',
  'Other Events',
  'Music Videos',
  'Short Films',
  'Feature Films',
  'Documentary',
  'Fashion & Portraits',
  'Commercials & Ads',
  'Sports & Action',
  'Real Estate',
  'Live Streaming',
  'Product Shoots',
  'Travel & Nature',
  'Maternity Shoot',
  'Indoor Shoot',
] as const;

export type AccountTypeKey = 'solo_creative' | 'rental_spot' | 'gear_shop' | 'print_shop' | 'agency';

export const ACCOUNT_TYPES: { key: AccountTypeKey; label: string; nameLabel: string; description: string; icon: string }[] = [
  { key: 'solo_creative', label: 'Solo Creative', nameLabel: 'Full Name', description: 'Photographers and videographers', icon: 'Camera' },
  { key: 'rental_spot', label: 'Rental Spot', nameLabel: 'Rental Spot Name', description: 'Rentals for lenses, camera bodies, and gear', icon: 'Package' },
  { key: 'gear_shop', label: 'Gear Shop', nameLabel: 'Gear Shop Name', description: 'Selling cameras, SSDs, and all the tech', icon: 'ShoppingBag' },
  { key: 'print_shop', label: 'The Print Shop', nameLabel: 'Print Shop Name', description: 'Selling albums, frames, and physical prints', icon: 'Printer' },
  { key: 'agency', label: 'Agency / Studio', nameLabel: 'Agency / Studio Name', description: 'Photography and videography business owners', icon: 'Building2' },
];
