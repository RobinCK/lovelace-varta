import type { BaseConfig, RawConfig } from './base-card';
import { isSizeSetting } from './size';

const isRecord = (value: unknown): value is RawConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const text = (raw: RawConfig, key: string): string | undefined => {
  const value = raw[key];

  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};

export const entity = (raw: RawConfig, key: string): string | undefined => {
  const value = text(raw, key);

  return value?.includes('.') ? value : undefined;
};

export const number = (
  raw: RawConfig,
  key: string,
  fallback: number,
  range: { readonly min?: number; readonly max?: number } = {},
): number => {
  const value = raw[key];
  const parsed = typeof value === 'string' ? Number(value) : value;

  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fallback;
  if (range.min !== undefined && parsed < range.min) return range.min;
  if (range.max !== undefined && parsed > range.max) return range.max;

  return parsed;
};

export const optionalNumber = (raw: RawConfig, key: string): number | undefined => {
  const value = raw[key];
  const parsed = typeof value === 'string' ? Number(value) : value;

  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
};

export const boolean = (raw: RawConfig, key: string, fallback: boolean): boolean => {
  const value = raw[key];

  return typeof value === 'boolean' ? value : fallback;
};

export const oneOf = <T extends string>(
  raw: RawConfig,
  key: string,
  options: readonly T[],
  fallback: T,
): T => {
  const value = raw[key];

  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
};

export const stringRecord = (
  raw: RawConfig,
  key: string,
): Readonly<Record<string, string>> | undefined => {
  const value = raw[key];

  if (!isRecord(value)) return undefined;

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

export const list = <T>(
  raw: RawConfig,
  key: string,
  map: (item: RawConfig, index: number) => T | undefined,
): T[] => {
  const value = raw[key];

  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown, index) => {
    const source = typeof item === 'string' ? { entity: item } : item;

    if (!isRecord(source)) return [];

    const mapped = map(source, index);

    return mapped === undefined ? [] : [mapped];
  });
};

const gridRows = (raw: RawConfig): number | undefined => {
  const options = raw.grid_options;

  if (!isRecord(options)) return undefined;

  const rows = options.rows;

  return typeof rows === 'number' && Number.isFinite(rows) && rows >= 1
    ? Math.round(rows)
    : undefined;
};

export const base = (raw: RawConfig): BaseConfig => {
  const title = raw.title;

  return {
    type: typeof raw.type === 'string' ? raw.type : '',
    title: title === false ? false : typeof title === 'string' ? title : undefined,
    language: text(raw, 'language'),
    colors: stringRecord(raw, 'colors'),
    labels: stringRecord(raw, 'labels'),
    size: isSizeSetting(raw.size) ? raw.size : undefined,
    grid_rows: gridRows(raw),
  };
};

export interface EntityItem {
  readonly entity: string;
  readonly name?: string;
  readonly icon?: string;
  readonly color?: string;
}

export const entityItems = (raw: RawConfig, key: string): EntityItem[] =>
  list(raw, key, (item) => {
    const id = entity(item, 'entity');

    if (!id) return undefined;

    return {
      entity: id,
      name: text(item, 'name'),
      icon: text(item, 'icon'),
      color: text(item, 'color'),
    };
  });

export const entityIds = (raw: RawConfig, key: string): string[] => {
  const value = raw[key];

  if (typeof value === 'string') return value.includes('.') ? [value.trim()] : [];

  return list(raw, key, (item) => entity(item, 'entity'));
};

export const stringList = (raw: RawConfig, key: string): string[] => {
  const value = raw[key];

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const patternRules = (raw: RawConfig, key: string): (readonly [string, string])[] => {
  const value = raw[key];

  if (isRecord(value)) {
    return Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0].trim() !== '',
    );
  }

  return list(raw, key, (item) => {
    const match = text(item, 'match');
    const type = text(item, 'type');

    return match && type ? ([match, type] as const) : undefined;
  });
};
