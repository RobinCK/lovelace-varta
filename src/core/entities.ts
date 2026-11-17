import type { HassEntity, HomeAssistant } from '../types/ha';
import { autoDigits, formatEnergy, formatNumber, formatPower, unitText } from './format';
import type { FormatLocale, Formatted } from './format';

export type Quantity = 'power' | 'energy' | 'volume' | 'temperature' | 'percent' | 'raw';

const FACTORS: Readonly<Record<Quantity, Readonly<Partial<Record<string, number>>>>> = {
  power: { mW: 0.001, W: 1, kW: 1000, MW: 1_000_000 },
  energy: { Wh: 0.001, kWh: 1, MWh: 1000, GWh: 1_000_000 },
  volume: { 'm³': 1, m3: 1, L: 0.001, 'ft³': 0.0283168, ft3: 0.0283168, CCF: 2.83168 },
  temperature: {},
  percent: {},
  raw: {},
};

export const STATISTIC_UNITS: Readonly<Record<string, string>> = {
  energy: 'kWh',
  power: 'W',
  volume: 'm³',
  temperature: '°C',
};

const UNAVAILABLE = new Set(['unavailable', 'unknown', '']);

export const parseNumber = (state: string | undefined): number | undefined => {
  if (state === undefined || UNAVAILABLE.has(state.trim())) return undefined;

  const value = Number(state);

  return Number.isFinite(value) ? value : undefined;
};

export const unitFactor = (quantity: Quantity, unit: unknown): number => {
  if (typeof unit !== 'string') return 1;

  return FACTORS[quantity][unit] ?? 1;
};

const convertTemperature = (value: number, unit: unknown): number =>
  unit === '°F' ? ((value - 32) * 5) / 9 : value;

export const convert = (value: number, quantity: Quantity, unit: unknown): number => {
  if (quantity === 'temperature') return convertTemperature(value, unit);

  return value * unitFactor(quantity, unit);
};

export const entityOf = (
  hass: HomeAssistant,
  entityId: string | undefined,
): HassEntity | undefined => (entityId ? hass.states[entityId] : undefined);

export const readNumber = (
  hass: HomeAssistant,
  entityId: string | undefined,
  quantity: Quantity = 'raw',
): number | undefined => {
  const entity = entityOf(hass, entityId);

  if (!entity) return undefined;

  const value = parseNumber(entity.state);

  if (value === undefined) return undefined;

  return convert(value, quantity, entity.attributes.unit_of_measurement);
};

const ON_STATES = new Set(['on', 'true', 'home', 'open', 'connected', 'grid on', '1']);

export const stateIsOn = (state: string): boolean | undefined => {
  if (UNAVAILABLE.has(state)) return undefined;

  return ON_STATES.has(state.toLowerCase());
};

export const isOn = (hass: HomeAssistant, entityId: string | undefined): boolean | undefined => {
  const entity = entityOf(hass, entityId);

  return entity ? stateIsOn(entity.state) : undefined;
};

export const entityName = (hass: HomeAssistant, entityId: string | undefined): string => {
  const entity = entityOf(hass, entityId);
  const name = entity?.attributes.friendly_name;

  return typeof name === 'string' ? name : (entityId ?? '');
};

export const attribute = <T>(
  hass: HomeAssistant,
  entityId: string | undefined,
  key: string,
): T | undefined => entityOf(hass, entityId)?.attributes[key] as T | undefined;

export const deviceClass = (
  hass: HomeAssistant,
  entityId: string | undefined,
): string | undefined => attribute<string>(hass, entityId, 'device_class');

export const isCounter = (hass: HomeAssistant, entityId: string | undefined): boolean => {
  const stateClass = attribute<string>(hass, entityId, 'state_class');

  return stateClass === 'total' || stateClass === 'total_increasing';
};

const stateDecimals = (state: string | undefined): number => {
  const match = /\.(\d+)$/.exec(state ?? '');

  return match?.[1]?.length ?? 0;
};

export const formatValue = (
  hass: HomeAssistant,
  entityId: string | undefined,
  value: number | undefined,
  locale: FormatLocale,
  digits?: number,
): Formatted => {
  const entity = entityOf(hass, entityId);
  const unit = entity?.attributes.unit_of_measurement;
  const kind = entity?.attributes.device_class;

  if (kind === 'power' && digits === undefined) return formatPower(value, locale);
  if (kind === 'energy' && digits === undefined) return formatEnergy(value, locale);

  const precision = digits ?? Math.min(autoDigits(value ?? 0), stateDecimals(entity?.state));

  return {
    value: formatNumber(value, unit === '%' && digits === undefined ? 0 : precision, locale),
    unit: typeof unit === 'string' ? unitText(unit, locale) : '',
  };
};

export const formatEntity = (
  hass: HomeAssistant,
  entityId: string | undefined,
  locale: FormatLocale,
  digits?: number,
  invert = false,
): Formatted => {
  const entity = entityOf(hass, entityId);

  if (!entity) return { value: '—', unit: '' };

  const kind = entity.attributes.device_class;
  const quantity: Quantity = kind === 'power' ? 'power' : kind === 'energy' ? 'energy' : 'raw';
  const value = readNumber(hass, entityId, quantity);

  if (value === undefined) {
    return { value: hass.formatEntityState?.(entity) ?? entity.state, unit: '' };
  }

  return formatValue(hass, entityId, invert ? -value : value, locale, digits);
};
