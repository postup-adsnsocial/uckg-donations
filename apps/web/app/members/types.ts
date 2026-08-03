export interface MemberRecord {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  country: string;
  createdAt: string;
  email: string | null;
  fullName: string;
  id: string;
  notes: string | null;
  phone: string | null;
  postalCode: string | null;
  region: string | null;
  status: 'active' | 'inactive';
  updatedAt: string;
}

export const usStates = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
];
