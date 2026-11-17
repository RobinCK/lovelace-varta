import type { HassDevice, HassEntity, HomeAssistant } from '../../types/ha';
import { matchesAny } from '../../core/match';

export interface ConfigEntryInfo {
  readonly entry_id: string;
  readonly domain: string;
  readonly title: string;
  readonly state: string;
  readonly reason?: string | null;
}

export type ConfigEntries = ReadonlyMap<string, ConfigEntryInfo>;

export interface OfflineDevice {
  readonly id: string;
  readonly name: string;
  readonly area?: string;
  readonly model?: string;
  readonly integration?: string;
  readonly since: number;
  readonly entities: readonly string[];
  readonly reason?: string;
  readonly viaId?: string;
  readonly entryId?: string;
}

export type GroupKind = 'device' | 'via' | 'entry';

export interface OfflineGroup {
  readonly key: string;
  readonly kind: GroupKind;
  readonly name: string;
  readonly since: number;
  readonly reason?: string;
  readonly hubOffline: boolean;
  readonly devices: readonly OfflineDevice[];
}

const BROKEN = new Set(['unavailable']);

const LOADED = 'loaded';

export const deviceName = (device: HassDevice | undefined, fallback: string): string =>
  device?.name_by_user ?? device?.name ?? fallback;

const entryOf = (device: HassDevice): string | undefined =>
  device.primary_config_entry ?? device.config_entries?.[0] ?? undefined;

const entryReason = (entry: ConfigEntryInfo | undefined): string | undefined => {
  if (!entry || entry.state === LOADED) return undefined;

  return entry.reason ?? entry.state.replace(/_/g, ' ');
};

const changedAt = (state: HassEntity | undefined): number =>
  state ? Date.parse(state.last_changed) : Number.NaN;

const deviceEntities = (hass: HomeAssistant): Map<string, string[]> => {
  const byDevice = new Map<string, string[]>();

  for (const entry of Object.values(hass.entities ?? {})) {
    if (!entry?.device_id || entry.hidden) continue;

    byDevice.set(entry.device_id, [...(byDevice.get(entry.device_id) ?? []), entry.entity_id]);
  }

  return byDevice;
};

const primaryOf = (hass: HomeAssistant, entityIds: readonly string[]): string[] => {
  const present = entityIds.filter((id) => hass.states[id] !== undefined);
  const primary = present.filter((id) => !hass.entities?.[id]?.entity_category);

  return primary.length > 0 ? primary : present;
};

export const watchedCount = (hass: HomeAssistant): number =>
  [...deviceEntities(hass).keys()].filter((deviceId) => {
    const device = hass.devices?.[deviceId];

    return device !== undefined && !device.disabled_by && device.entry_type !== 'service';
  }).length;

export const findOfflineDevices = (
  hass: HomeAssistant,
  entries: ConfigEntries,
  exclude: readonly string[],
): OfflineDevice[] => {
  const offline: OfflineDevice[] = [];

  for (const [deviceId, entityIds] of deviceEntities(hass)) {
    const device = hass.devices?.[deviceId];

    if (!device || device.disabled_by || device.entry_type === 'service') continue;

    const primary = primaryOf(hass, entityIds);

    if (primary.length === 0) continue;
    if (!primary.every((id) => BROKEN.has(hass.states[id]?.state ?? ''))) continue;

    const name = deviceName(device, deviceId);
    const keys = [deviceId, name, device.model ?? '', ...primary];

    if (matchesAny(keys, exclude)) continue;

    const entryId = entryOf(device);
    const entry = entryId ? entries.get(entryId) : undefined;
    const since = Math.max(...primary.map((id) => changedAt(hass.states[id])));

    offline.push({
      id: deviceId,
      name,
      area: device.area_id ? hass.areas?.[device.area_id]?.name : undefined,
      model: device.model ?? undefined,
      integration: entry?.domain ?? hass.entities?.[primary[0] ?? '']?.platform,
      since: Number.isFinite(since) ? since : Date.now(),
      entities: primary,
      reason: entryReason(entry),
      viaId: device.via_device_id ?? undefined,
      entryId,
    });
  }

  return offline;
};

const groupBy = <T>(
  items: readonly T[],
  key: (item: T) => string | undefined,
): Map<string, T[]> => {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const value = key(item);

    if (value === undefined) continue;

    groups.set(value, [...(groups.get(value) ?? []), item]);
  }

  return groups;
};

const earliest = (devices: readonly OfflineDevice[]): number =>
  Math.min(...devices.map((device) => device.since));

const isHubOffline = (
  hass: HomeAssistant,
  hubId: string,
  offlineIds: ReadonlySet<string>,
): boolean => offlineIds.has(hubId) || hass.devices?.[hubId]?.disabled_by != null;

export const groupOffline = (
  hass: HomeAssistant,
  devices: readonly OfflineDevice[],
  entries: ConfigEntries,
): OfflineGroup[] => {
  const offlineIds = new Set(devices.map((device) => device.id));
  const groups: OfflineGroup[] = [];
  const used = new Set<string>();

  for (const [viaId, members] of groupBy(devices, (device) => device.viaId)) {
    if (members.length < 2) continue;

    members.forEach((device) => used.add(device.id));
    groups.push({
      key: `via:${viaId}`,
      kind: 'via',
      name: deviceName(hass.devices?.[viaId], viaId),
      since: earliest(members),
      hubOffline: isHubOffline(hass, viaId, offlineIds),
      devices: members,
    });
  }

  const rest = devices.filter(
    (device) => !used.has(device.id) && !groups.some((group) => group.key === `via:${device.id}`),
  );

  for (const [entryId, members] of groupBy(rest, (device) => device.entryId)) {
    if (members.length < 2) continue;

    const entry = entries.get(entryId);

    members.forEach((device) => used.add(device.id));
    groups.push({
      key: `entry:${entryId}`,
      kind: 'entry',
      name: entry?.title ?? members[0]?.integration ?? entryId,
      since: earliest(members),
      reason: entryReason(entry),
      hubOffline: false,
      devices: members,
    });
  }

  for (const device of devices) {
    if (used.has(device.id) || groups.some((group) => group.key === `via:${device.id}`)) continue;

    groups.push({
      key: `device:${device.id}`,
      kind: 'device',
      name: device.name,
      since: device.since,
      reason: device.reason,
      hubOffline: false,
      devices: [device],
    });
  }

  return groups.sort((a, b) => b.since - a.since);
};
