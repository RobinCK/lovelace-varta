import type { HomeAssistant } from '../../types/ha';
import type { StatisticRow } from '../../core/data/statistics';
import { firstMatch, matchesAny } from '../../core/match';
import { deviceName } from '../devices/offline';

export type BatteryStatus = 'critical' | 'low' | 'ok' | 'unknown';

export interface BatteryType {
  readonly name: string;
  readonly count: number;
}

export interface BatteryItem {
  readonly deviceId: string;
  readonly name: string;
  readonly area?: string;
  readonly model?: string;
  readonly entityId: string;
  readonly level?: number;
  readonly low?: boolean;
  readonly offline: boolean;
  readonly type?: BatteryType;
}

export interface BatteryTrend {
  readonly lastKnown?: number;
  readonly daysLeft?: number;
  readonly replaced?: number;
}

export interface Thresholds {
  readonly warning: number;
  readonly critical: number;
}

const DAY = 86_400_000;

const REPLACEMENT_JUMP = 15;

const MIN_POINTS = 7;

const MIN_SPAN_DAYS = 10;

const MAX_DAYS = 3650;

const BROKEN = new Set(['unavailable', 'unknown']);

export const parseType = (text: string): BatteryType => {
  const match =
    /^(.*?)\s*[x×]\s*(\d+)$/i.exec(text.trim()) ?? /^(\d+)\s*[x×]\s*(.*)$/i.exec(text.trim());

  if (!match) return { name: text.trim(), count: 1 };

  const [, first = '', second = ''] = match;

  return /^\d+$/.test(first)
    ? { name: second.trim(), count: Number(first) }
    : { name: first.trim(), count: Number(second) };
};

const levelOf = (state: string | undefined): number | undefined => {
  const value = Number(state);

  return state === undefined || BROKEN.has(state) || !Number.isFinite(value) ? undefined : value;
};

export const collectBatteries = (
  hass: HomeAssistant,
  exclude: readonly string[],
  types: readonly (readonly [string, string])[],
): BatteryItem[] => {
  const byDevice = new Map<string, BatteryItem>();

  for (const state of Object.values(hass.states)) {
    if (state?.attributes.device_class !== 'battery') continue;

    const domain = state.entity_id.split('.')[0];

    if (domain !== 'sensor' && domain !== 'binary_sensor') continue;

    const deviceId = hass.entities?.[state.entity_id]?.device_id;

    if (!deviceId) continue;

    const device = hass.devices?.[deviceId];

    if (!device || device.disabled_by) continue;

    const name = deviceName(device, deviceId);
    const keys = [deviceId, name, device.model ?? '', device.manufacturer ?? '', state.entity_id];

    if (matchesAny(keys, exclude)) continue;

    const previous = byDevice.get(deviceId);
    const numeric = domain === 'sensor';

    if (previous && previous.entityId.startsWith('sensor.') && !numeric) continue;

    const typeText = firstMatch(keys, types);

    byDevice.set(deviceId, {
      deviceId,
      name,
      area: device.area_id ? hass.areas?.[device.area_id]?.name : undefined,
      model: device.model ?? undefined,
      entityId: state.entity_id,
      level: numeric ? levelOf(state.state) : undefined,
      low: numeric
        ? undefined
        : state.state === 'on'
          ? true
          : state.state === 'off'
            ? false
            : undefined,
      offline: BROKEN.has(state.state),
      type: typeText ? parseType(typeText) : undefined,
    });
  }

  return [...byDevice.values()];
};

export const effectiveLevel = (
  item: BatteryItem,
  trend: BatteryTrend | undefined,
): number | undefined => item.level ?? trend?.lastKnown;

export const statusOf = (
  item: BatteryItem,
  trend: BatteryTrend | undefined,
  thresholds: Thresholds,
): BatteryStatus => {
  const level = effectiveLevel(item, trend);

  if (level !== undefined) {
    if (level < thresholds.critical) return 'critical';
    if (level < thresholds.warning) return 'low';

    return 'ok';
  }

  if (item.low === true) return 'low';
  if (item.low === false) return 'ok';

  return 'unknown';
};

interface Point {
  readonly time: number;
  readonly value: number;
}

const pointsOf = (rows: readonly StatisticRow[] | undefined): Point[] =>
  (rows ?? [])
    .map((row) => ({ time: row.start, value: row.mean ?? row.max ?? Number.NaN }))
    .filter((point) => Number.isFinite(point.value));

const lastReplacement = (points: readonly Point[]): number => {
  let index = 0;

  for (let position = 1; position < points.length; position++) {
    const before = points[position - 1];
    const current = points[position];

    if (before && current && current.value - before.value >= REPLACEMENT_JUMP) index = position;
  }

  return index;
};

const slopePerDay = (points: readonly Point[]): number => {
  const xs = points.map((point) => point.time / DAY);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / points.length;
  let numerator = 0;
  let denominator = 0;

  points.forEach((point, position) => {
    const dx = (xs[position] ?? meanX) - meanX;

    numerator += dx * (point.value - meanY);
    denominator += dx * dx;
  });

  return denominator === 0 ? 0 : numerator / denominator;
};

export const trendOf = (
  rows: readonly StatisticRow[] | undefined,
  level: number | undefined,
  thresholds: Thresholds,
): BatteryTrend => {
  const points = pointsOf(rows);
  const lastKnown = points[points.length - 1]?.value;

  if (points.length === 0) return {};

  const start = lastReplacement(points);
  const replaced = start > 0 ? points[start]?.time : undefined;
  const segment = points.slice(start);
  const first = segment[0];
  const last = segment[segment.length - 1];
  const current = level ?? lastKnown;

  if (!first || !last || current === undefined) return { lastKnown, replaced };
  if (segment.length < MIN_POINTS || (last.time - first.time) / DAY < MIN_SPAN_DAYS) {
    return { lastKnown, replaced };
  }

  const slope = slopePerDay(segment);

  if (slope >= -0.02) return { lastKnown, replaced };

  const target = current > thresholds.critical ? thresholds.critical : 0;
  const days = Math.max(0, (current - target) / -slope);

  return { lastKnown, replaced, daysLeft: days > MAX_DAYS ? undefined : days };
};

export const shoppingList = (
  items: readonly BatteryItem[],
  statuses: ReadonlyMap<string, BatteryStatus>,
): BatteryType[] => {
  const totals = new Map<string, number>();

  for (const item of items) {
    const status = statuses.get(item.deviceId);

    if (!item.type || (status !== 'critical' && status !== 'low')) continue;

    totals.set(item.type.name, (totals.get(item.type.name) ?? 0) + item.type.count);
  }

  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
