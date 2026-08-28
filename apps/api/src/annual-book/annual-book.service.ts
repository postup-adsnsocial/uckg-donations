import { Inject, Injectable } from '@nestjs/common';
import type { SaveAnnualBookDayRequest } from '@uckg/contracts';
import { schema } from '@uckg/database';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

import {
  addUtcDays,
  type AnnualBookDayValue,
  type AnnualBookEntryValue,
  nextBusinessDay,
  parseIsoDate,
  percentageChange,
  summarizeAnnualBookDays,
  weekdayKey,
} from './annual-book-calculations.js';
import {
  type TenantContext,
  TenantUnitOfWork,
} from '../database/tenant-unit-of-work.js';

export interface AnnualBookPeriod {
  endDate: string;
  startDate: string;
}

@Injectable()
export class AnnualBookService {
  constructor(
    @Inject(TenantUnitOfWork)
    private readonly tenantUnitOfWork: TenantUnitOfWork,
  ) {}

  async month(context: TenantContext, month: string) {
    const startDate = `${month}-01`;
    const start = parseIsoDate(startDate);
    if (!start) throw new TypeError(`Invalid month: ${month}`);
    const nextMonth = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    const endDate = addUtcDays(nextMonth.toISOString().slice(0, 10), -1);
    const storedDays = await this.loadDays(
      context,
      addUtcDays(startDate, -3),
      endDate,
    );
    const byDate = new Map(storedDays.map((day) => [day.entryDate, day]));
    const days: AnnualBookDayValue[] = [];

    for (let entryDate = startDate; entryDate <= endDate; ) {
      days.push(byDate.get(entryDate) ?? this.emptyDay(entryDate));
      entryDate = addUtcDays(entryDate, 1);
    }

    const depositsByDate = new Map<
      string,
      { cashCents: number; checkCents: number; sourceDates: string[] }
    >();
    for (const day of storedDays) {
      const metrics = summarizeAnnualBookDays([day]);
      const depositDate = nextBusinessDay(day.entryDate);
      if (depositDate < startDate || depositDate > endDate) continue;
      const deposit = depositsByDate.get(depositDate) ?? {
        cashCents: 0,
        checkCents: 0,
        sourceDates: [],
      };
      deposit.cashCents += metrics.cashCents;
      deposit.checkCents += metrics.checkCents;
      if (metrics.expectedDepositCents > 0)
        deposit.sourceDates.push(day.entryDate);
      depositsByDate.set(depositDate, deposit);
    }

    const expectedDeposits = days
      .filter(
        (day) => !['saturday', 'sunday'].includes(weekdayKey(day.entryDate)),
      )
      .map((day) => {
        const deposit = depositsByDate.get(day.entryDate) ?? {
          cashCents: 0,
          checkCents: 0,
          sourceDates: [],
        };
        return {
          ...deposit,
          depositDate: day.entryDate,
          totalCents: deposit.cashCents + deposit.checkCents,
          weekday: weekdayKey(day.entryDate),
        };
      });

    return {
      days: days.map((day) => this.presentDay(day)),
      endDate,
      expectedDeposits,
      month,
      startDate,
      summary: summarizeAnnualBookDays(days),
    };
  }

  async summary(context: TenantContext, period: AnnualBookPeriod) {
    const days = await this.loadDays(context, period.startDate, period.endDate);
    return {
      dayCount: days.filter((day) => day.saved).length,
      endDate: period.endDate,
      metrics: summarizeAnnualBookDays(days),
      startDate: period.startDate,
    };
  }

  async comparison(
    context: TenantContext,
    periodA: AnnualBookPeriod,
    periodB: AnnualBookPeriod,
  ) {
    const [a, b] = await Promise.all([
      this.summary(context, periodA),
      this.summary(context, periodB),
    ]);
    const metricKeys = Object.keys(a.metrics) as Array<keyof typeof a.metrics>;
    const differences = Object.fromEntries(
      metricKeys.map((key) => {
        const current = a.metrics[key];
        const comparison = b.metrics[key];
        if (current === null || comparison === null) {
          return [key, { amountCents: null, percentage: null }];
        }
        return [
          key,
          {
            amountCents: current - comparison,
            percentage: percentageChange(current, comparison),
          },
        ];
      }),
    );
    return { differences, periodA: a, periodB: b };
  }

  async saveDay(context: TenantContext, input: SaveAnnualBookDayRequest) {
    await this.tenantUnitOfWork.run(context, async (transaction) => {
      const [day] = await transaction
        .insert(schema.annualBookDays)
        .values({
          athMobileCents: input.athMobileCents,
          cardMachineCents: input.cardMachineCents,
          churchId: context.churchId,
          createdBy: context.actorId,
          designatedEnvelopeCents: input.designatedEnvelopeCents,
          entryDate: input.entryDate,
          notes: input.notes ?? null,
          updatedBy: context.actorId,
        })
        .onConflictDoUpdate({
          set: {
            athMobileCents: input.athMobileCents,
            cardMachineCents: input.cardMachineCents,
            designatedEnvelopeCents: input.designatedEnvelopeCents,
            notes: input.notes ?? null,
            updatedAt: new Date(),
            updatedBy: context.actorId,
          },
          target: [
            schema.annualBookDays.churchId,
            schema.annualBookDays.entryDate,
          ],
        })
        .returning({ id: schema.annualBookDays.id });

      if (!day) throw new Error('The annual book day could not be saved.');

      await transaction
        .delete(schema.annualBookAmounts)
        .where(
          and(
            eq(schema.annualBookAmounts.churchId, context.churchId),
            eq(schema.annualBookAmounts.annualBookDayId, day.id),
          ),
        );

      if (input.entries.length > 0) {
        await transaction.insert(schema.annualBookAmounts).values(
          input.entries.map((entry) => ({
            ...entry,
            annualBookDayId: day.id,
            churchId: context.churchId,
            createdBy: context.actorId,
            updatedBy: context.actorId,
          })),
        );
      }
    });

    return this.presentDay({
      athMobileCents: input.athMobileCents,
      cardMachineCents: input.cardMachineCents,
      designatedEnvelopeCents: input.designatedEnvelopeCents,
      entries: input.entries,
      entryDate: input.entryDate,
      notes: input.notes ?? null,
      saved: true,
    });
  }

  private async loadDays(
    context: TenantContext,
    startDate: string,
    endDate: string,
  ): Promise<AnnualBookDayValue[]> {
    const rows = await this.tenantUnitOfWork.run(context, (transaction) =>
      transaction
        .select({
          amountCents: schema.annualBookAmounts.amountCents,
          athMobileCents: schema.annualBookDays.athMobileCents,
          cardMachineCents: schema.annualBookDays.cardMachineCents,
          designatedEnvelopeCents:
            schema.annualBookDays.designatedEnvelopeCents,
          entryDate: schema.annualBookDays.entryDate,
          notes: schema.annualBookDays.notes,
          paymentMethod: schema.annualBookAmounts.paymentMethod,
          serviceSlot: schema.annualBookAmounts.serviceSlot,
        })
        .from(schema.annualBookDays)
        .leftJoin(
          schema.annualBookAmounts,
          and(
            eq(
              schema.annualBookAmounts.churchId,
              schema.annualBookDays.churchId,
            ),
            eq(
              schema.annualBookAmounts.annualBookDayId,
              schema.annualBookDays.id,
            ),
          ),
        )
        .where(
          and(
            eq(schema.annualBookDays.churchId, context.churchId),
            gte(schema.annualBookDays.entryDate, startDate),
            lte(schema.annualBookDays.entryDate, endDate),
          ),
        )
        .orderBy(
          asc(schema.annualBookDays.entryDate),
          asc(schema.annualBookAmounts.serviceSlot),
          asc(schema.annualBookAmounts.paymentMethod),
        ),
    );

    const days = new Map<string, AnnualBookDayValue>();
    for (const row of rows) {
      const day = days.get(row.entryDate) ?? {
        athMobileCents: row.athMobileCents,
        cardMachineCents: row.cardMachineCents,
        designatedEnvelopeCents: row.designatedEnvelopeCents,
        entries: [],
        entryDate: row.entryDate,
        notes: row.notes,
        saved: true,
      };
      if (row.amountCents && row.paymentMethod && row.serviceSlot) {
        day.entries.push({
          amountCents: row.amountCents,
          paymentMethod: row.paymentMethod,
          serviceSlot: row.serviceSlot,
        } as AnnualBookEntryValue);
      }
      days.set(row.entryDate, day);
    }
    return [...days.values()];
  }

  private emptyDay(entryDate: string): AnnualBookDayValue {
    return {
      athMobileCents: 0,
      cardMachineCents: null,
      designatedEnvelopeCents: 0,
      entries: [],
      entryDate,
      notes: null,
      saved: false,
    };
  }

  private presentDay(day: AnnualBookDayValue) {
    return {
      ...day,
      metrics: summarizeAnnualBookDays([day]),
      weekday: weekdayKey(day.entryDate),
    };
  }
}
