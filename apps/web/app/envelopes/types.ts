export interface EnvelopeRecord {
  amountCents: number;
  createdAt: string;
  envelope: {
    contentType: string;
    originalName: string;
    sizeBytes: number;
  } | null;
  id: string;
  member: { fullName: string; id: string } | null;
  notes: string | null;
  operatorName: string;
  paymentMethod: 'card' | 'cash' | 'check';
  receivedOn: string;
}

export function formatMoney(amountCents: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: 'USD',
    style: 'currency',
  }).format(amountCents / 100);
}
