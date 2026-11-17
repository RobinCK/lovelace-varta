import { describe, expect, it } from 'vitest';
import {
  collectBatteries,
  parseType,
  shoppingList,
  statusOf,
  trendOf,
} from '../src/cards/batteries/batteries';
import type { BatteryStatus } from '../src/cards/batteries/batteries';
import { mainEntity, wentOffline } from '../src/cards/devices/history';
import { findOfflineDevices, groupOffline } from '../src/cards/devices/offline';
import type { ConfigEntries } from '../src/cards/devices/offline';
import { stillIgnored } from '../src/core/data/ignored';
import type { StatisticRow } from '../src/core/data/statistics';
import { formatAgo } from '../src/core/format';
import { createLocalize } from '../src/core/i18n';
import { matches, matchesAny } from '../src/core/match';
import type { HassEntity, HomeAssistant } from '../src/types/ha';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 17, 21, 0);

const state = (
  entityId: string,
  value: string,
  attributes = {},
  changed = NOW - 60_000,
): HassEntity => ({
  entity_id: entityId,
  state: value,
  attributes,
  last_changed: new Date(changed).toISOString(),
  last_updated: new Date(changed).toISOString(),
});

const hassOf = (
  states: readonly HassEntity[],
  entities: Record<string, string>,
  devices: Record<string, { name: string; via?: string; entry?: string; model?: string }>,
): HomeAssistant =>
  ({
    states: Object.fromEntries(states.map((item) => [item.entity_id, item])),
    entities: Object.fromEntries(
      Object.entries(entities).map(([entityId, deviceId]) => [
        entityId,
        { entity_id: entityId, device_id: deviceId },
      ]),
    ),
    devices: Object.fromEntries(
      Object.entries(devices).map(([id, device]) => [
        id,
        {
          id,
          name: device.name,
          via_device_id: device.via,
          config_entries: device.entry ? [device.entry] : [],
          model: device.model,
        },
      ]),
    ),
    areas: {},
    locale: { language: 'en' },
    language: 'en',
    callWS: () => Promise.reject(new Error('offline')),
    callService: () => Promise.resolve(undefined),
  }) as HomeAssistant;

describe('patterns', () => {
  it('matches exact values and globs', () => {
    expect(matches('sensor.window_kitchen', 'sensor.window_*')).toBe(true);
    expect(matches('Sirio Barrel', 'sirio barrel')).toBe(true);
    expect(matches('Sirio Barrel', 'Sirio')).toBe(false);
    expect(matchesAny(['a', 'Sirio Well'], ['Sirio*'])).toBe(true);
  });
});

describe('offline devices', () => {
  const hass = hassOf(
    [
      state('binary_sensor.window_a', 'unavailable'),
      state('binary_sensor.window_b', 'unavailable'),
      state('sensor.bridge_state', 'unavailable'),
      state('sensor.pump_power', 'unavailable'),
      state('sensor.pump_pressure', 'unavailable'),
      state('sensor.lamp_power', 'unavailable'),
      state('light.lamp', 'on'),
    ],
    {
      'binary_sensor.window_a': 'win_a',
      'binary_sensor.window_b': 'win_b',
      'sensor.bridge_state': 'bridge',
      'sensor.pump_power': 'pump',
      'sensor.pump_pressure': 'pump',
      'sensor.lamp_power': 'lamp',
      'light.lamp': 'lamp',
    },
    {
      win_a: { name: 'Window A', via: 'bridge' },
      win_b: { name: 'Window B', via: 'bridge' },
      bridge: { name: 'Zigbee2MQTT Bridge' },
      pump: { name: 'Sirio Barrel', entry: 'sirio' },
      lamp: { name: 'Lamp' },
    },
  );
  const entries: ConfigEntries = new Map([
    [
      'sirio',
      {
        entry_id: 'sirio',
        domain: 'sirio',
        title: 'Sirio',
        state: 'setup_retry',
        reason: 'Cannot connect',
      },
    ],
  ]);

  it('finds devices whose entities are all unavailable', () => {
    const ids = findOfflineDevices(hass, entries, [])
      .map((device) => device.id)
      .sort();

    expect(ids).toEqual(['bridge', 'pump', 'win_a', 'win_b']);
  });

  it('groups devices behind one hub and keeps the reason of the integration', () => {
    const groups = groupOffline(hass, findOfflineDevices(hass, entries, []), entries);
    const hub = groups.find((group) => group.kind === 'via');
    const pump = groups.find((group) => group.key === 'device:pump');

    expect(hub?.devices.map((device) => device.id).sort()).toEqual(['win_a', 'win_b']);
    expect(hub?.hubOffline).toBe(true);
    expect(groups.some((group) => group.key === 'device:bridge')).toBe(false);
    expect(pump?.reason).toBe('Cannot connect');
  });

  it('skips excluded devices', () => {
    expect(
      findOfflineDevices(hass, entries, ['Sirio*']).some((device) => device.id === 'pump'),
    ).toBe(false);
  });

  it('keeps an ignored item only while it is offline and has not come back', () => {
    const items = [
      { key: 'via:bridge', name: 'Bridge', devices: ['win_a', 'win_b'], entities: [], at: NOW },
      { key: 'device:lamp', name: 'Lamp', devices: ['lamp'], entities: [], at: NOW },
      { key: 'device:pump', name: 'Pump', devices: ['pump'], entities: [], at: NOW },
    ];
    const kept = stillIgnored(items, new Set(['win_a', 'win_b', 'pump']), new Set(['device:pump']));

    expect(kept.map((item) => item.key)).toEqual(['via:bridge']);
  });
});

describe('batteries', () => {
  const thresholds = { warning: 30, critical: 15 };
  const rows = (values: readonly number[]): StatisticRow[] =>
    values.map((value, index) => ({
      start: NOW - (values.length - index) * DAY,
      end: 0,
      mean: value,
    }));

  it('parses battery types with counts', () => {
    expect(parseType('CR2032')).toEqual({ name: 'CR2032', count: 1 });
    expect(parseType('AAA×2')).toEqual({ name: 'AAA', count: 2 });
    expect(parseType('2 x AA')).toEqual({ name: 'AA', count: 2 });
  });

  it('forecasts the days left from the trend since the last replacement', () => {
    const history = [20, 18, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89];
    const trend = trendOf(rows(history), 89, thresholds);

    expect(trend.replaced).toBe(NOW - (history.length - 2) * DAY);
    expect(trend.daysLeft).toBeCloseTo(74, 0);
  });

  it('forecasts the days until empty below the replace level', () => {
    const history = [21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
    const trend = trendOf(rows(history), 10, thresholds);

    expect(trend.daysLeft).toBeCloseTo(10, 0);
  });

  it('gives no forecast for a flat or short history', () => {
    expect(
      trendOf(rows([80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80]), 80, thresholds).daysLeft,
    ).toBeUndefined();
    expect(trendOf(rows([80, 79, 78]), 78, thresholds).daysLeft).toBeUndefined();
  });

  it('collects one battery per device with an optional type and a shopping list', () => {
    const hass = hassOf(
      [
        state('sensor.window_battery', '12', { device_class: 'battery' }),
        state('binary_sensor.window_battery_low', 'on', { device_class: 'battery' }),
        state('sensor.remote_battery', '64', { device_class: 'battery' }),
        state('sensor.door_battery', 'unavailable', { device_class: 'battery' }),
      ],
      {
        'sensor.window_battery': 'window',
        'binary_sensor.window_battery_low': 'window',
        'sensor.remote_battery': 'remote',
        'sensor.door_battery': 'door',
      },
      {
        window: { name: 'Window', model: 'Door and window sensor' },
        remote: { name: 'Remote' },
        door: { name: 'Door', model: 'Door and window sensor' },
      },
    );
    const items = collectBatteries(hass, [], [['Door and window sensor', 'CR1632']]);
    const window = items.find((item) => item.deviceId === 'window');
    const statuses = new Map<string, BatteryStatus>(
      items.map((item) => [
        item.deviceId,
        statusOf(item, item.deviceId === 'door' ? { lastKnown: 22 } : undefined, thresholds),
      ]),
    );

    expect(items).toHaveLength(3);
    expect(window?.entityId).toBe('sensor.window_battery');
    expect(window?.type).toEqual({ name: 'CR1632', count: 1 });
    expect(statuses.get('window')).toBe('critical');
    expect(statuses.get('door')).toBe('low');
    expect(statuses.get('remote')).toBe('ok');
    expect(shoppingList(items, statuses)).toEqual([{ name: 'CR1632', count: 2 }]);
  });
});

describe('format', () => {
  it('formats how long ago', () => {
    const t = createLocalize('en');

    expect(formatAgo(NOW - 20_000, NOW, t)).toBe('just now');
    expect(formatAgo(NOW - 33 * 60_000, NOW, t)).toBe('33 min');
    expect(formatAgo(NOW - 5 * 3_600_000, NOW, t)).toBe('5 h');
    expect(formatAgo(NOW - 3 * DAY, NOW, t)).toBe('3 d');
  });
});

describe('offline history', () => {
  it('picks the most telling entity of a device', () => {
    expect(mainEntity(['sensor.lamp_power', 'binary_sensor.lamp_overheat', 'light.lamp'])).toBe(
      'light.lamp',
    );
  });

  it('finds when a device went offline', () => {
    expect(
      wentOffline([
        { s: 'on', lu: 100 },
        { s: 'off', lu: 200 },
        { s: 'unavailable', lu: 300 },
        { s: 'unavailable', lu: 900 },
      ]),
    ).toBe(300_000);
    expect(wentOffline([{ s: 'unavailable', lu: 100 }])).toBeUndefined();
  });
});
