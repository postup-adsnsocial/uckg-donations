export const annualBookServiceSlots = [
  'first',
  'second',
  'third',
  'fourth',
  'extra',
] as const;

export const annualBookPaymentMethods = ['cash', 'check', 'card'] as const;

export type AnnualBookServiceSlot = (typeof annualBookServiceSlots)[number];
export type AnnualBookPaymentMethod = (typeof annualBookPaymentMethods)[number];

export interface AnnualBookEntryValue {
  amountCents: number;
  paymentMethod: AnnualBookPaymentMethod;
  serviceSlot: AnnualBookServiceSlot;
}

export interface AnnualBookDayValue {
  athMobileCents: number;
  cardMachineCents: number | null;
  designatedEnvelopeCents: number;
  entries: AnnualBookEntryValue[];
  entryDate: string;
  notes: string | null;
  saved: boolean;
}

export interface AnnualBookMetrics {
  athMobileCents: number;
  cardCents: number;
  cardDifferenceCents: number | null;
  cardMachineCents: number;
  cashCents: number;
  checkCents: number;
  designatedEnvelopeCents: number;
  expectedDepositCents: number;
  totalWithAthCents: number;
  totalWithoutAthCents: number;
  undesignatedCents: number;
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string): Date | null {
  if (!isoDatePattern.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(isoDate: string, amount: number): string {
  const date = parseIsoDate(isoDate);
  if (!date) throw new TypeError(`Invalid ISO date: ${isoDate}`);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatIsoDate(date);
}

export function weekdayKey(
  isoDate: string,
):
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday' {
  const date = parseIsoDate(isoDate);
  if (!date) throw new TypeError(`Invalid ISO date: ${isoDate}`);
  return [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][date.getUTCDay()] as ReturnType<typeof weekdayKey>;
}

export function nextBusinessDay(isoDate: string): string {
  let candidate = addUtcDays(isoDate, 1);
  while (['saturday', 'sunday'].includes(weekdayKey(candidate))) {
    candidate = addUtcDays(candidate, 1);
  }
  return candidate;
}

export function summarizeAnnualBookDays(
  days: readonly AnnualBookDayValue[],
): AnnualBookMetrics {
  let cashCents = 0;
  let checkCents = 0;
  let cardCents = 0;
  let athMobileCents = 0;
  let designatedEnvelopeCents = 0;
  let cardMachineCents = 0;
  let reconciledCardCents = 0;
  let hasCardMachineValue = false;

  for (const day of days) {
    athMobileCents += day.athMobileCents;
    designatedEnvelopeCents += day.designatedEnvelopeCents;
    if (day.cardMachineCents !== null) {
      cardMachineCents += day.cardMachineCents;
      hasCardMachineValue = true;
    }
    let dailyCardCents = 0;
    for (const entry of day.entries) {
      if (entry.paymentMethod === 'cash') cashCents += entry.amountCents;
      if (entry.paymentMethod === 'check') checkCents += entry.amountCents;
      if (entry.paymentMethod === 'card') {
        cardCents += entry.amountCents;
        dailyCardCents += entry.amountCents;
      }
    }
    if (day.cardMachineCents !== null) reconciledCardCents += dailyCardCents;
  }

  const totalWithoutAthCents = cashCents + checkCents + cardCents;
  return {
    athMobileCents,
    cardCents,
    cardDifferenceCents: hasCardMachineValue
      ? cardMachineCents - reconciledCardCents
      : null,
    cardMachineCents,
    cashCents,
    checkCents,
    designatedEnvelopeCents,
    expectedDepositCents: cashCents + checkCents,
    totalWithAthCents: totalWithoutAthCents + athMobileCents,
    totalWithoutAthCents,
    undesignatedCents: totalWithoutAthCents - designatedEnvelopeCents,
  };
}

export function percentageChange(current: number, comparison: number) {
  if (comparison === 0) return null;
  return ((current - comparison) / Math.abs(comparison)) * 100;
}
