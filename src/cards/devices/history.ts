import type { HomeAssistant } from '../../types/ha';
import type { OfflineDevice } from './offline';

interface HistoryState {
  readonly s?: string;
  readonly lc?: number;
  readonly lu?: number;
}

type HistoryResponse = Readonly<Record<string, readonly HistoryState[] | undefined>>;

const BROKEN = new Set(['unavailable', 'unknown']);

export const DOMAIN_PRIORITY = [
  'light',
  'climate',
  'camera',
  'media_player',
  'vacuum',
  'cover',
  'lock',
  'fan',
  'switch',
  'binary_sensor',
  'select',
  'number',
  'button',
  'sensor',
] as const;

const rank = (entityId: string): number => {
  const index = DOMAIN_PRIORITY.indexOf(
    (entityId.split('.')[0] ?? '') as (typeof DOMAIN_PRIORITY)[number],
  );

  return index === -1 ? DOMAIN_PRIORITY.length : index;
};

export const mainEntity = (entityIds: readonly string[]): string | undefined =>
  [...entityIds].sort((a, b) => rank(a) - rank(b))[0];

const stateTime = (state: HistoryState): number => (state.lu ?? state.lc ?? 0) * 1000;

export const wentOffline = (states: readonly HistoryState[]): number | undefined => {
  let lastGood = -1;

  states.forEach((state, index) => {
    if (!BROKEN.has(state.s ?? 'unknown')) lastGood = index;
  });

  if (lastGood === -1) return undefined;

  const next = states[lastGood + 1];

  return next ? stateTime(next) : undefined;
};

export const offlineSince = async (
  hass: HomeAssistant,
  devices: readonly OfflineDevice[],
  start: number,
): Promise<Map<string, number>> => {
  const byEntity = new Map<string, string>();

  for (const device of devices) {
    const entityId = mainEntity(device.entities);

    if (entityId) byEntity.set(entityId, device.id);
  }

  if (byEntity.size === 0) return new Map();

  const history = await hass.callWS<HistoryResponse>({
    type: 'history/history_during_period',
    start_time: new Date(start).toISOString(),
    entity_ids: [...byEntity.keys()],
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: true,
  });
  const since = new Map<string, number>();

  for (const [entityId, deviceId] of byEntity) {
    const states = history[entityId] ?? [];

    if (states.length > 0) since.set(deviceId, wentOffline(states) ?? start);
  }

  return since;
};
