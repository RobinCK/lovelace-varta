import type { HassLocale } from '../types/ha';
import type { Localize } from './i18n';

export interface FormatLocale {
  readonly language: string;
  readonly numberLocale: string | readonly string[] | undefined;
  readonly useGrouping: boolean;
  readonly timeLocale: string;
  readonly hour12: boolean;
  readonly units: Readonly<Record<string, string>>;
}

export interface Formatted {
  readonly value: string;
  readonly unit: string;
}

export const DASH = '—';
export const MINUS = '−';

export const DEFAULT_FORMAT_LOCALE: FormatLocale = {
  language: 'en',
  numberLocale: 'en-US',
  useGrouping: true,
  timeLocale: 'en-GB',
  hour12: false,
  units: {},
};

export const unitText = (unit: string, locale: FormatLocale): string => locale.units[unit] ?? unit;

const resolveNumberLocale = (locale: HassLocale): string | readonly string[] | undefined => {
  switch (locale.number_format) {
    case 'comma_decimal':
      return ['en-US', 'en'];
    case 'decimal_comma':
      return ['de', 'es', 'it'];
    case 'space_comma':
      return ['fr', 'sv', 'cs'];
    case 'system':
      return undefined;
    default:
      return locale.language;
  }
};

const usesAmPm = (language: string | undefined): boolean =>
  new Intl.DateTimeFormat(language, { hour: 'numeric' }).resolvedOptions().hour12 === true;

const resolveHour12 = (locale: HassLocale, language: string): boolean => {
  if (locale.time_format === '12') return true;
  if (locale.time_format === '24') return false;

  return usesAmPm(locale.time_format === 'system' ? undefined : language);
};

export const toFormatLocale = (
  locale: HassLocale | undefined,
  language?: string,
  units: Readonly<Record<string, string>> = {},
): FormatLocale => {
  if (!locale) return { ...DEFAULT_FORMAT_LOCALE, language: language ?? 'en', units };

  const resolved = language ?? locale.language;

  return {
    language: resolved,
    numberLocale: resolveNumberLocale(locale),
    useGrouping: locale.number_format !== 'none',
    timeLocale: resolved,
    hour12: resolveHour12(locale, resolved),
    units,
  };
};

const numberFormats = new Map<string, Intl.NumberFormat>();

const numberFormat = (digits: number, locale: FormatLocale): Intl.NumberFormat => {
  const key = JSON.stringify([locale.numberLocale, locale.useGrouping, digits]);
  const cached = numberFormats.get(key);

  if (cached) return cached;

  const created = new Intl.NumberFormat(locale.numberLocale as string | string[] | undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: locale.useGrouping,
  });

  numberFormats.set(key, created);

  return created;
};

export const formatNumber = (
  value: number | undefined,
  digits: number,
  locale: FormatLocale,
): string => {
  if (value === undefined || !Number.isFinite(value)) return DASH;

  const text = numberFormat(digits, locale).format(Math.abs(value));
  const rounded = Number(Math.abs(value).toFixed(digits));

  return value < 0 && rounded !== 0 ? `${MINUS}${text}` : text;
};

export const formatSigned = (value: number, digits: number, locale: FormatLocale): string => {
  const rounded = Number(value.toFixed(digits));

  if (rounded === 0) return formatNumber(0, digits, locale);

  return `${rounded > 0 ? '+' : MINUS}${formatNumber(Math.abs(value), digits, locale)}`;
};

export const autoDigits = (value: number): number => {
  const magnitude = Math.abs(value);

  if (magnitude >= 100) return 0;
  if (magnitude >= 10) return 1;

  return 2;
};

export const formatPower = (watts: number | undefined, locale: FormatLocale): Formatted => {
  if (watts === undefined || !Number.isFinite(watts)) {
    return { value: DASH, unit: unitText('W', locale) };
  }

  if (Math.abs(watts) >= 1000) {
    return { value: formatNumber(watts / 1000, 2, locale), unit: unitText('kW', locale) };
  }

  return { value: formatNumber(Math.round(watts), 0, locale), unit: unitText('W', locale) };
};

export const formatEnergy = (
  kwh: number | undefined,
  locale: FormatLocale,
  digits?: number,
  megawattFrom = 10_000,
): Formatted => {
  if (kwh === undefined || !Number.isFinite(kwh)) {
    return { value: DASH, unit: unitText('kWh', locale) };
  }

  if (Math.abs(kwh) >= megawattFrom) {
    return { value: formatNumber(kwh / 1000, digits ?? 2, locale), unit: unitText('MWh', locale) };
  }

  return {
    value: formatNumber(kwh, digits ?? autoDigits(kwh), locale),
    unit: unitText('kWh', locale),
  };
};

export const formatPercent = (ratio: number | undefined, locale: FormatLocale): string =>
  ratio === undefined ? DASH : formatNumber(ratio * 100, 0, locale);

export const formatTime = (time: number, locale: FormatLocale): string =>
  new Intl.DateTimeFormat(locale.timeLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale.hour12,
  }).format(time);

export const formatDate = (
  time: number,
  locale: FormatLocale,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string => new Intl.DateTimeFormat(locale.timeLocale, options).format(time);

export const formatWeekday = (time: number, locale: FormatLocale): string =>
  new Intl.DateTimeFormat(locale.timeLocale, { weekday: 'short' }).format(time);

export const formatMonth = (time: number, locale: FormatLocale, long = false): string =>
  new Intl.DateTimeFormat(locale.timeLocale, { month: long ? 'long' : 'short' }).format(time);

export interface DurationParts {
  readonly hours: number;
  readonly minutes: number;
}

export const durationParts = (minutes: number): DurationParts => {
  const total = Math.max(0, Math.round(minutes));

  return { hours: Math.floor(total / 60), minutes: total % 60 };
};

export const formatDuration = (minutes: number, t: Localize): string => {
  const parts = durationParts(minutes);

  if (parts.hours === 0) return t('duration.m', { m: parts.minutes });

  return t('duration.hm', { h: parts.hours, m: String(parts.minutes).padStart(2, '0') });
};

const moneyFormats = new Map<string, Intl.NumberFormat>();

export const formatMoney = (
  value: number | undefined,
  locale: FormatLocale,
  currency: string | undefined,
  digits = 0,
): string => {
  if (value === undefined || !Number.isFinite(value)) return DASH;

  const code = currency ?? '';
  const key = JSON.stringify([locale.numberLocale, code, digits]);
  let format = moneyFormats.get(key);

  if (!format) {
    try {
      format = new Intl.NumberFormat(locale.numberLocale as string | string[] | undefined, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    } catch {
      format = numberFormat(digits, locale);
    }

    moneyFormats.set(key, format);
  }

  const text = format.format(Math.abs(value)).replace(/\u00a0|\u202f/g, ' ');
  const rounded = Number(Math.abs(value).toFixed(digits));
  const signed = value < 0 && rounded !== 0 ? `${MINUS}${text}` : text;

  return format.resolvedOptions().style === 'currency' || !code ? signed : `${signed} ${code}`;
};

export type AgoUnit = 'min' | 'h' | 'd';

export interface AgoParts {
  readonly value: number;
  readonly unit: AgoUnit;
}

export const agoParts = (time: number, now: number): AgoParts | undefined => {
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));

  if (minutes < 1) return undefined;
  if (minutes < 60) return { value: minutes, unit: 'min' };

  const hours = Math.floor(minutes / 60);

  if (hours < 48) return { value: hours, unit: 'h' };

  return { value: Math.floor(hours / 24), unit: 'd' };
};

export const formatAgo = (time: number, now: number, t: Localize): string => {
  const parts = agoParts(time, now);

  if (!parts) return t('ago.now');

  return t(`ago.${parts.unit}`, { value: parts.value });
};
