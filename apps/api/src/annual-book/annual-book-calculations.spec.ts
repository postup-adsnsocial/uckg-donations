import { describe, expect, it } from 'vitest';

import {
  nextBusinessDay,
  percentageChange,
  summarizeAnnualBookDays,
  weekdayKey,
} from './annual-book-calculations.js';

describe('annual book calendar rules', () => {
  it('maps receipts to the next Monday-through-Friday deposit day', () => {
    expect(nextBusinessDay('2026-08-27')).toBe('2026-08-28');
    expect(nextBusinessDay('2026-08-28')).toBe('2026-08-31');
    expect(nextBusinessDay('2026-08-29')).toBe('2026-08-31');
    expect(nextBusinessDay('2026-08-30')).toBe('2026-08-31');
    expect(nextBusinessDay('2026-08-31')).toBe('2026-09-01');
  });

  it('derives weekdays from the calendar without local timezone drift', () => {
    expect(weekdayKey('2026-08-28')).toBe('friday');
    expect(weekdayKey('2026-08-31')).toBe('monday');
  });
});

describe('annual book totals', () => {
  it('keeps ATH separate and includes Undesignated in the summary', () => {
    const metrics = summarizeAnnualBookDays([
      {
        athMobileCents: 2_500,
        cardMachineCents: 10_200,
        designatedEnvelopeCents: 8_000,
        entries: [
          { amountCents: 12_000, paymentMethod: 'cash', serviceSlot: 'first' },
          { amountCents: 3_000, paymentMethod: 'check', serviceSlot: 'first' },
          { amountCents: 10_000, paymentMethod: 'card', serviceSlot: 'second' },
        ],
        entryDate: '2026-08-28',
        notes: null,
        saved: true,
      },
    ]);

    expect(metrics).toMatchObject({
      athMobileCents: 2_500,
      cardDifferenceCents: 200,
      expectedDepositCents: 15_000,
      totalWithAthCents: 27_500,
      totalWithoutAthCents: 25_000,
      undesignatedCents: 17_000,
    });
  });

  it('does not invent a card difference when no machine value was entered', () => {
    const metrics = summarizeAnnualBookDays([
      {
        athMobileCents: 0,
        cardMachineCents: null,
        designatedEnvelopeCents: 0,
        entries: [],
        entryDate: '2026-08-28',
        notes: null,
        saved: true,
      },
    ]);
    expect(metrics.cardDifferenceCents).toBeNull();
  });

  it('returns no percentage when the reference period is zero', () => {
    expect(percentageChange(500, 0)).toBeNull();
    expect(percentageChange(1_250, 1_000)).toBe(25);
  });
});
