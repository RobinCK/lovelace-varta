import type { HomeAssistant } from '../../types/ha';
import { STATISTIC_UNITS } from '../entities';

export type StatisticPeriod = '5minute' | 'hour' | 'day' | 'week' | 'month';

export type StatisticType = 'change' | 'mean' | 'min' | 'max' | 'state' | 'sum';

export interface StatisticRow {
  readonly start: number;
  readonly end: number;
  readonly change?: number | null;
  readonly mean?: number | null;
  readonly min?: number | null;
  readonly max?: number | null;
  readonly state?: number | null;
  readonly sum?: number | null;
}

export interface StatisticsRequest {
  readonly entityIds: readonly string[];
  readonly start: number;
  readonly end?: number;
  readonly period: StatisticPeriod;
  readonly types: readonly StatisticType[];
  readonly units?: Readonly<Record<string, string>>;
}

export type StatisticsResult = ReadonlyMap<string, readonly StatisticRow[]>;

type StatisticsResponse = Readonly<Record<string, readonly StatisticRow[] | undefined>>;

const toTime = (value: number | string): number =>
  typeof value === 'number' ? value : Date.parse(value);

const normalizeRow = (row: StatisticRow): StatisticRow => ({
  ...row,
  start: toTime(row.start),
  end: toTime(row.end),
});

export const fetchStatistics = async (
  hass: HomeAssistant,
  request: StatisticsRequest,
): Promise<StatisticsResult> => {
  const entityIds = [...new Set(request.entityIds.filter(Boolean))];

  if (entityIds.length === 0) return new Map();

  const response = await hass.callWS<StatisticsResponse>({
    type: 'recorder/statistics_during_period',
    start_time: new Date(request.start).toISOString(),
    ...(request.end === undefined ? {} : { end_time: new Date(request.end).toISOString() }),
    statistic_ids: entityIds,
    period: request.period,
    types: request.types,
    units: request.units ?? STATISTIC_UNITS,
  });

  return new Map(
    entityIds.map((entityId) => [entityId, (response[entityId] ?? []).map(normalizeRow)]),
  );
};

export type RowValue = (row: StatisticRow) => number | null | undefined;

export const changeOf: RowValue = (row) => row.change;
export const meanOf: RowValue = (row) => row.mean;
export const minOf: RowValue = (row) => row.min ?? row.mean;
export const maxOf: RowValue = (row) => row.max ?? row.mean;
const bucketIndex = (starts: readonly number[], time: number): number => {
  let low = 0;
  let high = starts.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if ((starts[middle] ?? Number.POSITIVE_INFINITY) <= time) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
};

export const bucketize = (
  rows: readonly StatisticRow[] | undefined,
  starts: readonly number[],
  pick: RowValue,
  combine: 'sum' | 'mean' | 'min' | 'max' = 'sum',
  end = Number.POSITIVE_INFINITY,
): (number | undefined)[] => {
  const buckets: number[][] = starts.map(() => []);

  for (const row of rows ?? []) {
    const value = pick(row);

    if (value === null || value === undefined || row.start >= end) continue;

    const index = bucketIndex(starts, row.start);

    if (index >= 0) buckets[index]?.push(value);
  }

  return buckets.map((values) => {
    if (values.length === 0) return undefined;
    if (combine === 'sum') return values.reduce((total, value) => total + value, 0);
    if (combine === 'min') return Math.min(...values);
    if (combine === 'max') return Math.max(...values);

    return values.reduce((total, value) => total + value, 0) / values.length;
  });
};
