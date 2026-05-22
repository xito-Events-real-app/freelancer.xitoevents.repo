export const VALLEY_CITIES = ['Kathmandu', 'Bhaktapur', 'Lalitpur'];

export const OUTSIDE_VALLEY_CITIES = [
  'Pokhara', 'Chitwan', 'Biratnagar', 'Birgunj', 'Dharan', 'Butwal',
  'Hetauda', 'Janakpur', 'Nepalgunj', 'Dhangadhi', 'Damak', 'Itahari',
  'Bharatpur', 'Tulsipur', 'Ghorahi', 'Siddharthanagar', 'Bhairahawa',
  'Lumbini', 'Dhulikhel', 'Nagarkot',
];

export const ALL_NEPAL_CITIES = [
  // Priority cities first
  'Kathmandu', 'Bhaktapur', 'Lalitpur', 'Pokhara', 'Chitwan', 'Butwal',
  'Bhairahawa', 'Dang', 'Janakpur', 'Birgunj',
  // Alphabetical
  'Baglung', 'Banepa', 'Bardibas', 'Beni', 'Bhadrapur', 'Bharatpur',
  'Bhimeshwor', 'Biratnagar', 'Birendranagar', 'Charikot', 'Damak',
  'Damuli', 'Dhading', 'Dhangadhi', 'Dharan', 'Dhulikhel', 'Dipayal',
  'Ghorahi', 'Gorkha', 'Hetauda', 'Ilam', 'Itahari', 'Jaleswar',
  'Kalaiya', 'Kamalamai', 'Kapilvastu', 'Lahan', 'Lumbini', 'Mahendranagar',
  'Malangwa', 'Mechinagar', 'Nagarkot', 'Nepalgunj', 'Palpa', 'Panauti',
  'Rajbiraj', 'Ramechhap', 'Ratnanagar', 'Siddharthanagar', 'Sindhuli',
  'Siraha', 'Surkhet', 'Tansen', 'Tikapur', 'Triyuga', 'Tulsipur',
  'Urlabari', 'Waling',
];

export const LOCATION_TYPES = [
  'INSIDE VALLEY',
  'OUTSIDE VALLEY',
  'MIXED',
  'IN TO OUT',
  'OUT TO IN',
] as const;

export type LocationType = typeof LOCATION_TYPES[number];

export const DEFAULT_SOURCES = [
  'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'OLD CLIENT', 'REFERENCE', 'WEBSITE', 'OTHER',
];
