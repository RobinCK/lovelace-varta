import { html, nothing } from 'lit';
import type { CSSResultGroup, PropertyDeclarations, TemplateResult } from 'lit';
import { DAY, MINUTE } from '../../const';
import { VartaCard } from '../../core/base-card';
import type { BaseConfig, CardContext, RawConfig } from '../../core/base-card';
import * as cfg from '../../core/config';
import {
  canEdit,
  loadIgnored,
  returnedSince,
  saveIgnored,
  stillIgnored,
} from '../../core/data/ignored';
import type { IgnoredItem } from '../../core/data/ignored';
import type { Localize } from '../../core/i18n';
import type { TranslationKey } from '../../i18n/en';
import { navigate } from '../../core/actions';
import { agoParts, formatAgo, formatDate, formatTime } from '../../core/format';
import type { CardSize, SizeSetting } from '../../core/size';
import type { HomeAssistant } from '../../types/ha';
import * as form from '../../ui/form';
import type { ConfigForm } from '../../ui/form';
import { pill } from '../../ui/parts';
import { baseStyles } from '../../ui/styles';
import { vartaStyles } from '../../ui/varta-styles';
import { offlineSince, mainEntity } from './history';
import { deviceName, findOfflineDevices, groupOffline, watchedCount } from './offline';
import type { ConfigEntries, ConfigEntryInfo, OfflineDevice, OfflineGroup } from './offline';

export interface DevicesCardConfig extends BaseConfig {
  readonly exclude: readonly string[];
  readonly limit: number;
  readonly show_ignored: boolean;
}

interface DevicesData {
  readonly entries: ConfigEntries;
  readonly ignored: readonly IgnoredItem[];
  readonly returned: ReadonlySet<string>;
  readonly since: ReadonlyMap<string, number>;
  readonly names: ReadonlyMap<string, string>;
  readonly windowStart: number;
}

interface Manifest {
  readonly domain: string;
  readonly name: string;
}

const HISTORY_WINDOW = 30 * DAY;

type Context = CardContext<DevicesCardConfig, DevicesData>;

const GROUP_ICONS: Readonly<Record<OfflineGroup['kind'], string>> = {
  device: 'mdi:lan-disconnect',
  via: 'mdi:hub-outline',
  entry: 'mdi:puzzle-outline',
};

const DOMAIN_ICONS: Readonly<Record<string, string>> = {
  light: 'mdi:lightbulb-outline',
  switch: 'mdi:power-socket-eu',
  climate: 'mdi:thermostat',
  camera: 'mdi:cctv',
  cover: 'mdi:window-shutter',
  lock: 'mdi:lock-outline',
  fan: 'mdi:fan',
  media_player: 'mdi:cast',
  vacuum: 'mdi:robot-vacuum',
  binary_sensor: 'mdi:motion-sensor',
  sensor: 'mdi:gauge',
  button: 'mdi:gesture-tap-button',
  update: 'mdi:package-up',
};

const SKELETON_WIDTHS = [62, 48, 70] as const;

const PLURAL_FORMS = new Set(['one', 'few', 'many']);

const devicesWord = (count: number, language: string, t: Localize): string => {
  const form = new Intl.PluralRules(language).select(count);

  return t(
    PLURAL_FORMS.has(form)
      ? (`devices.devices_${form}` as TranslationKey)
      : 'devices.devices_other',
  );
};

const loadNames = async (
  hass: HomeAssistant,
  domains: readonly string[],
): Promise<Map<string, string>> => {
  if (domains.length === 0) return new Map();

  try {
    const manifests = await hass.callWS<readonly Manifest[]>({
      type: 'manifest/list',
      integrations: domains,
    });

    return new Map(manifests.map((manifest) => [manifest.domain, manifest.name]));
  } catch {
    return new Map();
  }
};

const loadEntries = async (hass: HomeAssistant): Promise<ConfigEntries> => {
  if (!canEdit(hass)) return new Map();

  try {
    const entries = await hass.callWS<readonly ConfigEntryInfo[]>({ type: 'config_entries/get' });

    return new Map(entries.map((entry) => [entry.entry_id, entry]));
  } catch {
    return new Map();
  }
};

const ignoredItem = (group: OfflineGroup, now: number): IgnoredItem => ({
  key: group.key,
  name: group.name,
  devices: group.devices.map((device) => device.id),
  entities: group.devices
    .map((device) => mainEntity(device.entities))
    .filter((entityId) => entityId !== undefined),
  at: now,
});

export class VartaDevicesCard extends VartaCard<DevicesCardConfig, DevicesData> {
  static override minSize: CardSize = 'small';

  static override maxSize: CardSize = 'large';

  static override properties: PropertyDeclarations = {
    _expanded: { state: true },
    _showAll: { state: true },
    _ignoredOpen: { state: true },
    _busy: { state: true },
  };

  static override styles: CSSResultGroup = [baseStyles, vartaStyles];

  declare _expanded: ReadonlySet<string>;
  declare _showAll: boolean;
  declare _ignoredOpen: boolean;
  declare _busy: boolean;

  constructor() {
    super();
    this._expanded = new Set();
    this._showAll = false;
    this._ignoredOpen = false;
    this._busy = false;
  }

  static override configForm(): ConfigForm {
    return form.createForm([
      form.texts('exclude'),
      form.grid(form.number('limit', { min: 1, max: 50 }), form.toggle('show_ignored')),
    ]);
  }

  static getStubConfig(): RawConfig {
    return {};
  }

  protected parseConfig(raw: RawConfig): DevicesCardConfig {
    return {
      ...cfg.base(raw),
      exclude: cfg.stringList(raw, 'exclude'),
      limit: Math.round(cfg.number(raw, 'limit', 8, { min: 1, max: 50 })),
      show_ignored: cfg.boolean(raw, 'show_ignored', true),
    };
  }

  protected override defaultSize(): SizeSetting {
    return 'auto';
  }

  protected override refreshInterval(): number {
    return 5 * MINUTE;
  }

  protected override trackedEntities(config: DevicesCardConfig): readonly (string | undefined)[] {
    const hass = this.hass;

    if (!hass) return [];

    return findOfflineDevices(hass, this._data?.entries ?? new Map(), config.exclude).flatMap(
      (device) => device.entities,
    );
  }

  protected override async fetchData(
    config: DevicesCardConfig,
    hass: HomeAssistant,
  ): Promise<DevicesData> {
    const [entries, ignored] = await Promise.all([
      loadEntries(hass),
      loadIgnored(hass).catch((): IgnoredItem[] => []),
    ]);
    const devices = findOfflineDevices(hass, entries, config.exclude);
    const windowStart = Date.now() - HISTORY_WINDOW;
    const domains = [...new Set(devices.map((device) => device.integration).filter(Boolean))];
    const [returned, since, names] = await Promise.all([
      returnedSince(hass, ignored).catch(() => new Set<string>()),
      offlineSince(hass, devices, windowStart).catch(() => new Map<string, number>()),
      loadNames(hass, domains as string[]),
    ]);
    const kept = stillIgnored(ignored, new Set(devices.map((device) => device.id)), returned);

    if (kept.length !== ignored.length && canEdit(hass)) {
      await saveIgnored(hass, kept).catch(() => undefined);
    }

    return { entries, ignored: kept, returned, since, names, windowStart };
  }

  protected renderBody(context: Context): TemplateResult {
    const { config, hass, data, t } = context;
    const title = config.title === false ? undefined : (config.title ?? t('devices.title'));

    if (!data) {
      return html`
        <div class="head">
          ${title === undefined ? html`<span></span>` : html`<div class="eyebrow">${title}</div>`}
        </div>
        ${this._renderSkeleton(t('common.loading'))}
      `;
    }

    const devices = findOfflineDevices(hass, data.entries, config.exclude).map((device) => ({
      ...device,
      since: data.since.get(device.id) ?? device.since,
    }));
    const offline = new Map(devices.map((device) => [device.id, device]));
    const ignored = stillIgnored(data.ignored, new Set(offline.keys()), data.returned);
    const ignoredKeys = new Set(ignored.map((item) => item.key));
    const ignoredDevices = new Set(ignored.flatMap((item) => item.devices));
    const groups = groupOffline(hass, devices, data.entries).filter(
      (group) =>
        !ignoredKeys.has(group.key) &&
        !group.devices.every((device) => ignoredDevices.has(device.id)),
    );
    const count = groups.reduce((sum, group) => sum + group.devices.length, 0);

    return html`
      <div class="head">
        ${title === undefined ? html`<span></span>` : html`<div class="eyebrow">${title}</div>`}
        ${count > 0 ? pill(t('devices.offline_count', { count }), 'warn') : pill(t('devices.all_online'), 'ok')}
      </div>
      ${groups.length === 0 ? this._renderCalm(context) : this._renderGroups(context, groups)}
      ${config.show_ignored && ignored.length > 0 ? this._renderIgnored(context, ignored, offline) : nothing}
    `;
  }

  private _renderSkeleton(label: string): TemplateResult {
    return html`<div class="list" aria-busy="true" aria-label=${label}>
      ${SKELETON_WIDTHS.map(
        (width) =>
          html`<div class="skel">
            <i class="box"></i><span class="lines" style="--w:${width}%"><i></i><i></i></span
            ><i style="width:32px;justify-self:end"></i>
          </div>`,
      )}
    </div>`;
  }

  private _renderCalm(context: Context): TemplateResult {
    const { hass, t } = context;

    return html`<div class="calm tone-ok">
      <span class="badge toned"><ha-icon icon="mdi:check-circle-outline"></ha-icon></span>
      <span class="who">
        <span class="title"><span>${t('devices.empty')}</span></span>
        <span class="sub"
          ><span>${t('devices.watching', { count: watchedCount(hass) })}</span></span
        >
      </span>
    </div>`;
  }

  private _renderGroups(context: Context, groups: readonly OfflineGroup[]): TemplateResult {
    const { config, t } = context;
    const visible = this._showAll ? groups : groups.slice(0, config.limit);

    return html`<div class="list">${visible.map((group) => this._renderGroup(context, group))}</div>
      ${
        groups.length > config.limit
          ? html`<button
              type="button"
              class="more"
              aria-expanded=${String(this._showAll)}
              @click=${() => {
                this._showAll = !this._showAll;
              }}
            >
              ${this._showAll ? t('devices.show_less') : html`${t('devices.show_all')} <b>(${groups.length})</b>`}
              <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
            </button>`
          : nothing
      }`;
  }

  private _renderSub(context: Context, group: OfflineGroup): TemplateResult {
    const { data, t, locale } = context;
    const single = group.kind === 'device' ? group.devices[0] : undefined;
    const domain = group.devices[0]?.integration;
    const integration = domain === undefined ? undefined : (data?.names.get(domain) ?? domain);

    if (single) {
      const main = [single.area, integration].filter(Boolean).join(' · ');

      return html`<span class="sub"
        ><span
          >${main}${single.model ? html`<span class="wide">${main ? ' · ' : ''}${single.model}</span>` : nothing}</span
        ></span
      >`;
    }

    const areas = [...new Set(group.devices.map((device) => device.area).filter(Boolean))];
    const source = group.kind === 'entry' && integration !== group.name ? integration : undefined;
    const details = [source, areas.join(', ')].filter(Boolean).join(' · ');

    return html`<span class="sub"
      ><span
        ><b>${group.devices.length}</b>
        ${devicesWord(group.devices.length, locale.language, t)}${details ? ` · ${details}` : ''}</span
      ></span
    >`;
  }

  private _renderSince(context: Context, since: number): TemplateResult {
    const { data, t, now, locale } = context;
    const parts = agoParts(since, now);
    const sameDay = new Date(since).toDateString() === new Date(now).toDateString();
    const time = sameDay ? formatTime(since, locale) : formatDate(since, locale);
    const before = data !== undefined && since <= data.windowStart;

    return html`<span class="since"
      ><b
        >${before ? '>' : ''}${parts ? html`${parts.value}<small>${t(`unit.${parts.unit}`)}</small>` : t('ago.now')}</b
      ><span>${t(before ? 'devices.before' : 'devices.since', { time })}</span></span
    >`;
  }

  private _renderGroup(context: Context, group: OfflineGroup): TemplateResult {
    const { hass, t } = context;
    const expandable = group.kind !== 'device';
    const open = this._expanded.has(group.key);
    const editable = canEdit(hass);
    const why = group.reason ?? (group.hubOffline ? t('devices.hub_offline') : undefined);
    const membersId = `members-${group.key.replace(/[^a-z0-9]/gi, '-')}`;

    return html`<div class="dev">
      <div class="dev-line ${editable ? '' : 'ro'}">
        <button
          class="open"
          type="button"
          aria-expanded=${expandable ? String(open) : nothing}
          aria-controls=${expandable ? membersId : nothing}
          @click=${() => {
            this._activate(group);
          }}
        >
          <span class="badge ${expandable ? 'stack' : ''}"
            ><ha-icon icon=${this._icon(hass, group)}></ha-icon
          ></span>
          <span class="who">
            <span class="title"
              ><span>${group.name}</span>${
                expandable
                  ? html`<ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>`
                  : nothing
              }</span
            >
            ${this._renderSub(context, group)}
            ${why ? html`<span class="why" title=${why}>${why}</span>` : nothing}
          </span>
          ${this._renderSince(context, group.since)}
        </button>
        ${
          editable
            ? html`<button
                class="act"
                type="button"
                ?disabled=${this._busy}
                aria-label=${t('devices.ignore_named', { name: group.name })}
                title=${t('devices.ignore')}
                @click=${() => {
                  void this._ignore(group);
                }}
              >
                <ha-icon icon="mdi:bell-off-outline"></ha-icon>
              </button>`
            : nothing
        }
      </div>
      ${expandable ? this._renderMembers(context, group, membersId, open) : nothing}
    </div>`;
  }

  private _renderMembers(
    context: Context,
    group: OfflineGroup,
    id: string,
    open: boolean,
  ): TemplateResult {
    const { hass, t } = context;
    const hubId = group.kind === 'via' ? group.key.slice(4) : undefined;
    const domain = group.devices[0]?.integration;

    return html`<div class="members" id=${id} ?hidden=${!open}>
      ${
        hubId
          ? html`<button
              class="member lead"
              type="button"
              @click=${() => {
                navigate(this, `/config/devices/device/${hubId}`);
              }}
            >
              <ha-icon icon=${GROUP_ICONS.via}></ha-icon
              ><span>${deviceName(hass.devices?.[hubId], hubId)}</span>
            </button>`
          : domain
            ? html`<button
                class="member lead"
                type="button"
                @click=${() => {
                  navigate(this, `/config/integrations/integration/${domain}`);
                }}
              >
                <ha-icon icon=${GROUP_ICONS.entry}></ha-icon
                ><span>${t('devices.integration')}</span>
              </button>`
            : nothing
      }
      ${group.devices.map(
        (device) =>
          html`<button
            class="member"
            type="button"
            @click=${() => {
              navigate(this, `/config/devices/device/${device.id}`);
            }}
          >
            <span>${device.name}</span
            >${device.area ? html`<small>${device.area}</small>` : nothing}
          </button>`,
      )}
    </div>`;
  }

  private _renderIgnored(
    context: Context,
    ignored: readonly IgnoredItem[],
    offline: ReadonlyMap<string, OfflineDevice>,
  ): TemplateResult {
    const { hass, t, now } = context;
    const editable = canEdit(hass);

    return html`<div class="fold">
      <button
        class="fold-head"
        type="button"
        aria-expanded=${String(this._ignoredOpen)}
        aria-controls="ignored"
        @click=${() => {
          this._ignoredOpen = !this._ignoredOpen;
        }}
      >
        <ha-icon icon="mdi:bell-off-outline"></ha-icon><span>${t('devices.ignored')}</span
        ><span class="mono">${ignored.length}</span
        ><ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
      </button>
      <div class="fold-body" id="ignored" ?hidden=${!this._ignoredOpen}>
        ${ignored.map((item) => {
          const members = item.devices
            .map((id) => offline.get(id))
            .filter((device) => device !== undefined);
          const since =
            members.length > 0 ? Math.min(...members.map((device) => device.since)) : item.at;
          const area =
            item.devices.length > 1
              ? `${item.devices.length} ${devicesWord(item.devices.length, context.locale.language, t)}`
              : (members[0]?.area ?? '');
          const sub = [area, t('devices.offline_for', { time: formatAgo(since, now, t) })]
            .filter(Boolean)
            .join(' · ');

          return html`<div class="ign">
            <div class="who">
              <span class="title"><span>${item.name}</span></span>
              <span class="sub"><span>${sub}</span></span>
            </div>
            ${
              editable
                ? html`<button
                    class="restore"
                    type="button"
                    ?disabled=${this._busy}
                    aria-label=${t('devices.restore_named', { name: item.name })}
                    @click=${() => {
                      void this._restore(item.key);
                    }}
                  >
                    ${t('devices.restore')}
                  </button>`
                : nothing
            }
          </div>`;
        })}
        <p class="fold-note">${t('devices.ignored_note')}</p>
      </div>
    </div>`;
  }

  private _icon(hass: HomeAssistant, group: OfflineGroup): string {
    if (group.kind !== 'device') return GROUP_ICONS[group.kind];

    const entityId = mainEntity(group.devices[0]?.entities ?? []) ?? '';
    const registered = hass.entities?.[entityId]?.icon;
    const attribute = hass.states[entityId]?.attributes.icon;

    if (registered) return registered;
    if (typeof attribute === 'string') return attribute;

    return DOMAIN_ICONS[entityId.split('.')[0] ?? ''] ?? 'mdi:lan-disconnect';
  }

  private _activate(group: OfflineGroup): void {
    if (group.kind === 'device') {
      navigate(this, `/config/devices/device/${group.devices[0]?.id ?? ''}`);

      return;
    }

    const expanded = new Set(this._expanded);

    if (expanded.has(group.key)) expanded.delete(group.key);
    else expanded.add(group.key);

    this._expanded = expanded;
  }

  private async _ignore(group: OfflineGroup): Promise<void> {
    const hass = this.hass;
    const data = this._data;

    if (!hass || !data || !canEdit(hass)) return;

    const items = [
      ...data.ignored.filter((item) => item.key !== group.key),
      ignoredItem(group, Date.now()),
    ];

    await this._save(hass, data, items);
  }

  private async _restore(key: string): Promise<void> {
    const hass = this.hass;
    const data = this._data;

    if (!hass || !data || !canEdit(hass)) return;

    await this._save(
      hass,
      data,
      data.ignored.filter((item) => item.key !== key),
    );
  }

  private async _save(
    hass: HomeAssistant,
    data: DevicesData,
    items: readonly IgnoredItem[],
  ): Promise<void> {
    this._busy = true;

    try {
      await saveIgnored(hass, items);
      this._data = { ...data, ignored: items };
    } finally {
      this._busy = false;
    }
  }
}
