import type { HomeAssistant } from '../../types/ha';

export interface IgnoredItem {
  readonly key: string;
  readonly name: string;
  readonly devices: readonly string[];
  readonly entities: readonly string[];
  readonly at: number;
}

interface StoredValue {
  readonly items?: readonly IgnoredItem[];
}

interface SystemData {
  readonly value: StoredValue | null;
}

interface HistoryState {
  readonly s?: string;
  readonly lu?: number;
  readonly lc?: number;
}

type HistoryResponse = Readonly<Record<string, readonly HistoryState[] | undefined>>;

export const IGNORED_KEY = 'varta_ignored';

const BROKEN = new Set(['unavailable', 'unknown']);

const isItem = (value: unknown): value is IgnoredItem => {
  if (!value || typeof value !== 'object') return false;

  const item = value as Partial<IgnoredItem>;

  return (
    typeof item.key === 'string' &&
    typeof item.at === 'number' &&
    Array.isArray(item.devices) &&
    Array.isArray(item.entities)
  );
};

export const canEdit = (hass: HomeAssistant): boolean => hass.user?.is_admin === true;

export const loadIgnored = async (hass: HomeAssistant): Promise<IgnoredItem[]> => {
  const data = await hass.callWS<SystemData>({
    type: 'frontend/get_system_data',
    key: IGNORED_KEY,
  });

  return (data.value?.items ?? []).filter(isItem);
};

export const saveIgnored = async (
  hass: HomeAssistant,
  items: readonly IgnoredItem[],
): Promise<void> => {
  await hass.callWS({ type: 'frontend/set_system_data', key: IGNORED_KEY, value: { items } });
};

const stateTime = (state: HistoryState): number => (state.lc ?? state.lu ?? 0) * 1000;

export const returnedSince = async (
  hass: HomeAssistant,
  items: readonly IgnoredItem[],
): Promise<Set<string>> => {
  const entityIds = [...new Set(items.flatMap((item) => item.entities))];

  if (entityIds.length === 0) return new Set();

  const start = Math.min(...items.map((item) => item.at));
  const history = await hass.callWS<HistoryResponse>({
    type: 'history/history_during_period',
    start_time: new Date(start).toISOString(),
    entity_ids: entityIds,
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
  });

  return new Set(
    items
      .filter((item) =>
        item.entities.some((entityId) =>
          (history[entityId] ?? []).some(
            (state) => !BROKEN.has(state.s ?? 'unknown') && stateTime(state) > item.at,
          ),
        ),
      )
      .map((item) => item.key),
  );
};

export const stillIgnored = (
  items: readonly IgnoredItem[],
  offlineDevices: ReadonlySet<string>,
  returned: ReadonlySet<string>,
): IgnoredItem[] =>
  items.filter(
    (item) => !returned.has(item.key) && item.devices.some((device) => offlineDevices.has(device)),
  );
