import { html, nothing } from 'lit';
import type { CSSResultGroup, PropertyDeclarations, TemplateResult } from 'lit';
import { DAY, HOUR } from '../../const';
import { VartaCard } from '../../core/base-card';
import type { BaseConfig, CardContext, RawConfig } from '../../core/base-card';
import * as cfg from '../../core/config';
import { navigate } from '../../core/actions';
import { fetchStatistics } from '../../core/data/statistics';
import type { StatisticsResult } from '../../core/data/statistics';
import { formatAgo, formatDate, formatNumber } from '../../core/format';
import type { CardSize, SizeSetting } from '../../core/size';
import type { HomeAssistant } from '../../types/ha';
import * as form from '../../ui/form';
import type { ConfigForm } from '../../ui/form';
import { baseStyles } from '../../ui/styles';
import { vartaStyles } from '../../ui/varta-styles';
import { collectBatteries, effectiveLevel, shoppingList, statusOf, trendOf } from './batteries';
import type { BatteryItem, BatteryStatus, BatteryTrend, Thresholds } from './batteries';

export interface BatteriesCardConfig extends BaseConfig {
  readonly exclude: readonly string[];
  readonly types: readonly (readonly [string, string])[];
  readonly warning: number;
  readonly critical: number;
  readonly forecast: boolean;
}

interface BatteriesData {
  readonly key: string;
  readonly stats: StatisticsResult;
  readonly lastKnown: ReadonlyMap<string, number>;
}

type Context = CardContext<BatteriesCardConfig, BatteriesData>;

interface Entry {
  readonly item: BatteryItem;
  readonly trend: BatteryTrend;
  readonly status: BatteryStatus;
  readonly level?: number;
}

const HISTORY_DAYS = 90;

const LAST_KNOWN_DAYS = 730;

const STATUS_TONES: Readonly<Record<BatteryStatus, string>> = {
  critical: 'warn',
  low: 'caution',
  ok: 'ok',
  unknown: 'muted',
};

const clampLevel = (level: number): number => Math.max(0, Math.min(100, level));

const tonePill = (text: string, tone: string): TemplateResult =>
  html`<span class="pill" style="--tone:var(--m-${tone})"><i></i>${text}</span>`;

const urgency = (a: Entry, b: Entry): number =>
  (a.trend.daysLeft ?? Number.POSITIVE_INFINITY) - (b.trend.daysLeft ?? Number.POSITIVE_INFINITY) ||
  (a.level ?? 101) - (b.level ?? 101) ||
  a.item.name.localeCompare(b.item.name);

const loadLastKnown = async (
  hass: HomeAssistant,
  ids: readonly string[],
): Promise<Map<string, number>> => {
  if (ids.length === 0) return new Map();

  const stats = await fetchStatistics(hass, {
    entityIds: ids,
    start: Date.now() - LAST_KNOWN_DAYS * DAY,
    period: 'month',
    types: ['mean'],
    units: {},
  }).catch((): StatisticsResult => new Map());
  const known = new Map<string, number>();

  for (const [id, rows] of stats) {
    const mean = rows[rows.length - 1]?.mean;

    if (typeof mean === 'number' && Number.isFinite(mean)) known.set(id, mean);
  }

  return known;
};

const sensorIds = (items: readonly BatteryItem[]): string[] =>
  items.map((item) => item.entityId).filter((id) => id.startsWith('sensor.'));

export class VartaBatteriesCard extends VartaCard<BatteriesCardConfig, BatteriesData> {
  static override minSize: CardSize = 'small';

  static override maxSize: CardSize = 'large';

  static override properties: PropertyDeclarations = {
    _okOpen: { state: true },
  };

  static override styles: CSSResultGroup = [baseStyles, vartaStyles];

  declare _okOpen: boolean;

  constructor() {
    super();
    this._okOpen = false;
  }

  static override configForm(): ConfigForm {
    return form.createForm([
      form.grid(
        form.number('warning', { min: 1, max: 100, unit: '%' }),
        form.number('critical', { min: 1, max: 100, unit: '%' }),
      ),
      form.toggle('forecast'),
      form.texts('exclude'),
      form.object('types'),
    ]);
  }

  static getStubConfig(): RawConfig {
    return {};
  }

  protected parseConfig(raw: RawConfig): BatteriesCardConfig {
    const critical = cfg.number(raw, 'critical', 15, { min: 1, max: 100 });

    return {
      ...cfg.base(raw),
      exclude: cfg.stringList(raw, 'exclude'),
      types: cfg.patternRules(raw, 'types'),
      warning: Math.max(critical, cfg.number(raw, 'warning', 30, { min: 1, max: 100 })),
      critical,
      forecast: cfg.boolean(raw, 'forecast', true),
    };
  }

  protected override defaultSize(): SizeSetting {
    return 'auto';
  }

  protected override refreshInterval(): number {
    return HOUR;
  }

  protected override trackedEntities(config: BatteriesCardConfig): readonly (string | undefined)[] {
    const hass = this.hass;

    return hass
      ? collectBatteries(hass, config.exclude, config.types).map((item) => item.entityId)
      : [];
  }

  protected override async fetchData(
    config: BatteriesCardConfig,
    hass: HomeAssistant,
  ): Promise<BatteriesData> {
    const items = collectBatteries(hass, config.exclude, config.types);
    const ids = sensorIds(items);
    const key = ids.join(',');
    const stats: StatisticsResult = config.forecast
      ? await fetchStatistics(hass, {
          entityIds: ids,
          start: Date.now() - HISTORY_DAYS * DAY,
          period: 'day',
          types: ['mean', 'max'],
          units: {},
        })
      : new Map();
    const missing = sensorIds(items.filter((item) => item.offline)).filter(
      (id) => (stats.get(id) ?? []).length === 0,
    );

    return { key, stats, lastKnown: await loadLastKnown(hass, missing) };
  }

  protected renderBody(context: Context): TemplateResult {
    const { config, hass, data, t } = context;
    const thresholds: Thresholds = { warning: config.warning, critical: config.critical };
    const items = collectBatteries(hass, config.exclude, config.types);
    const entries: Entry[] = items
      .map((item) => {
        const forecast =
          data && config.forecast
            ? trendOf(data.stats.get(item.entityId), item.level, thresholds)
            : {};
        const trend = {
          ...forecast,
          lastKnown: forecast.lastKnown ?? data?.lastKnown.get(item.entityId),
        };

        return {
          item,
          trend,
          status: statusOf(item, trend, thresholds),
          level: effectiveLevel(item, trend),
        };
      })
      .sort(urgency);
    const by = (status: BatteryStatus): Entry[] =>
      entries.filter((entry) => entry.status === status);
    const critical = by('critical');
    const low = by('low');
    const statuses = new Map(entries.map((entry) => [entry.item.deviceId, entry.status]));
    const buy = shoppingList(items, statuses);
    const title = config.title === false ? undefined : (config.title ?? t('batteries.title'));

    return html`
      <div class="head">
        ${title === undefined ? html`<span></span>` : html`<div class="eyebrow">${title}</div>`}
        <div class="pills">
          ${critical.length > 0 ? tonePill(t('batteries.replace_count', { count: critical.length }), 'warn') : nothing}
          ${low.length > 0 ? tonePill(t('batteries.low_count', { count: low.length }), 'caution') : nothing}
          ${critical.length === 0 && low.length === 0 && entries.length > 0 ? tonePill(t('batteries.all_good'), 'ok') : nothing}
        </div>
      </div>
      ${
        buy.length > 0
          ? html`<div class="buy">
              <ha-icon icon="mdi:cart-outline"></ha-icon><span>${t('batteries.to_buy')}</span>
              ${buy.map((type) => html`<span class="tag"><b>${type.count}×</b> ${type.name}</span>`)}
            </div>`
          : nothing
      }
      ${entries.length === 0 ? html`<div class="empty">${t('batteries.empty')}</div>` : nothing}
      ${this._renderSection(context, 'warn', t('batteries.replace'), critical)}
      ${this._renderSection(context, 'caution', t('batteries.low'), low)}
      ${this._renderOk(context, by('ok'))}
      ${this._renderSection(context, 'muted', t('batteries.unknown'), by('unknown'))}
    `;
  }

  private _renderSection(
    context: Context,
    tone: string,
    label: string,
    entries: readonly Entry[],
  ): TemplateResult | typeof nothing {
    if (entries.length === 0) return nothing;

    return html`<div class="sec tone-${tone}">
      <div class="sec-head"><i></i><span>${label}</span></div>
      ${entries.map((entry) => this._renderRow(context, entry))}
    </div>`;
  }

  private _renderOk(context: Context, entries: readonly Entry[]): TemplateResult | typeof nothing {
    const { t, locale } = context;

    if (entries.length === 0) return nothing;

    const levels = entries.map((entry) => entry.level).filter((level) => level !== undefined);
    const lowest = levels.length > 0 ? Math.min(...levels) : undefined;

    return html`<div class="sec tone-ok">
      <button
        class="okrow"
        type="button"
        aria-expanded=${String(this._okOpen)}
        aria-controls="ok-rows"
        @click=${() => {
          this._okOpen = !this._okOpen;
        }}
      >
        <span class="what"
          ><i></i
          ><span
            ><b>${entries.length}</b> ${t('batteries.ok')}${
              lowest === undefined
                ? nothing
                : html` · ${t('batteries.lowest')} <b>${formatNumber(lowest, 0, locale)}</b> %`
            }</span
          ></span
        >
        <span class="cell" aria-hidden="true"
          ><span class="rail"
            >${levels.map(
              (level) =>
                html`<i
                  class=${level === lowest ? 'min' : ''}
                  style="left:${clampLevel(level)}%"
                ></i>`,
            )}</span
          ></span
        >
        <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
      </button>
      <div class="sec-rows" id="ok-rows" ?hidden=${!this._okOpen}>
        ${this._okOpen ? entries.map((entry) => this._renderRow(context, entry)) : nothing}
      </div>
    </div>`;
  }

  private _renderRow(context: Context, entry: Entry): TemplateResult {
    const { hass, t, locale, now } = context;
    const { item, trend, status, level } = entry;
    const changed = Date.parse(hass.states[item.entityId]?.last_changed ?? '');
    const offline = item.offline
      ? t('batteries.offline', {
          time: formatAgo(Number.isFinite(changed) ? changed : now, now, t),
        })
      : undefined;
    const meta = [
      offline,
      item.area,
      trend.replaced
        ? t('batteries.replaced', { date: formatDate(trend.replaced, locale) })
        : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    const type = item.type
      ? item.type.count > 1
        ? `${item.type.name}×${item.type.count}`
        : item.type.name
      : undefined;
    const days =
      item.offline || trend.daysLeft === undefined
        ? undefined
        : trend.daysLeft < 1
          ? '< 1'
          : formatNumber(trend.daysLeft, 0, locale);
    const open = (): void => {
      navigate(this, `/config/devices/device/${item.deviceId}`);
    };

    return html`<button
      class="bat tone-${STATUS_TONES[status]} ${item.offline ? 'off' : ''}"
      type="button"
      @click=${open}
    >
      <span class="who">
        <span class="title"><span>${item.name}</span></span>
        <span class="sub"
          >${item.offline ? html`<ha-icon icon="mdi:lan-disconnect"></ha-icon>` : nothing}<span>${meta}</span>${type ? html`<span class="tag">${type}</span>` : nothing}</span
        >
      </span>
      <span class="cell" aria-hidden="true"
        ><span class="track"><span style="width:${clampLevel(level ?? 0)}%"></span></span
      ></span>
      <span class="lvl">
        <b
          class=${status === 'critical' ? 'ink' : ''}
          title=${
            item.offline && level !== undefined
              ? t('batteries.last_known', { level: formatNumber(level, 0, locale) })
              : nothing
          }
          >${
            level === undefined
              ? item.low
                ? t('batteries.low_flag')
                : '—'
              : html`${formatNumber(level, 0, locale)}<small>%</small>`
          }</b
        >
        ${
          days === undefined
            ? nothing
            : html`<span title=${t('batteries.days_title', { value: days })}
                ><span class="narrow">${t('batteries.days_short', { value: days })}</span
                ><span class="wide">${t('batteries.days_left', { value: days })}</span></span
              >`
        }
      </span>
    </button>`;
  }
}
