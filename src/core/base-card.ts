import { LitElement, html, nothing } from 'lit';
import type { CSSResultGroup, PropertyDeclarations, PropertyValues, TemplateResult } from 'lit';
import { MINUTE } from '../const';
import type { HomeAssistant, LovelaceGridOptions } from '../types/ha';
import { VartaCardEditor } from '../ui/editor';
import { createForm, withSize } from '../ui/form';
import type { ConfigForm } from '../ui/form';
import { baseStyles } from '../ui/styles';
import { tipHandler, tipLayer } from '../ui/tip';
import { openMoreInfo } from './actions';
import { toFormatLocale } from './format';
import type { FormatLocale } from './format';
import { createLocalize, resolveLanguage } from './i18n';
import type { Localize, TranslationKey } from './i18n';
import {
  SIZE_ROWS,
  clampSize,
  rowsCardSize,
  rowsHeight,
  sizeRows,
  sizesBetween,
  tierOf,
} from './size';
import type { CardSize, SizeSetting } from './size';

export type RawConfig = Readonly<Record<string, unknown>>;

export interface BaseConfig {
  readonly type: string;
  readonly title?: string | false;
  readonly language?: string;
  readonly colors?: Readonly<Record<string, string>>;
  readonly labels?: Readonly<Record<string, string>>;
  readonly size?: SizeSetting;
  readonly grid_rows?: number;
}

export interface CardContext<C extends BaseConfig, D> {
  readonly config: C;
  readonly hass: HomeAssistant;
  readonly data: D | undefined;
  readonly t: Localize;
  readonly locale: FormatLocale;
  readonly now: number;
  readonly size: SizeSetting;
  readonly moreInfo: (entityId: string | undefined) => void;
  readonly update: () => void;
}

const unitDictionary = (t: Localize): Readonly<Record<string, string>> => ({
  W: t('unit.w'),
  kW: t('unit.kw'),
  kWh: t('unit.kwh'),
  MWh: t('unit.mwh'),
  'm³': t('unit.m3'),
  Hz: t('unit.hz'),
  V: t('unit.v'),
  A: t('unit.a'),
  h: t('unit.h'),
  min: t('unit.min'),
  d: t('unit.d'),
});

const COLOR_KEYS = new Set(['warning', 'caution', 'ok']);

const colorStyle = (colors: Readonly<Record<string, string>> | undefined): string =>
  Object.entries(colors ?? {})
    .filter(([key, value]) => COLOR_KEYS.has(key) && typeof value === 'string')
    .map(([key, value]) => `--metron-${key}-color:${value}`)
    .join(';');

const clipped = (element: HTMLElement): boolean => element.scrollHeight > element.clientHeight + 1;

const overflows = (card: HTMLElement): boolean =>
  clipped(card) ||
  [...card.querySelectorAll<HTMLElement>('.shrink')].some(
    (element) => element.clientHeight > 0 && clipped(element),
  );

const dropGroups = (card: HTMLElement): HTMLElement[][] => {
  const groups = new Map<number, HTMLElement[]>();

  card.querySelectorAll<HTMLElement>('[data-drop]').forEach((element) => {
    const priority = Number(element.dataset.drop) || 0;

    groups.set(priority, [...(groups.get(priority) ?? []), element]);
  });

  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, elements]) => elements);
};

const hassChanged = (
  previous: HomeAssistant | undefined,
  current: HomeAssistant | undefined,
  entityIds: readonly (string | undefined)[],
): boolean => {
  if (!previous || !current) return true;
  if (previous.locale !== current.locale) return true;
  if (previous.themes?.darkMode !== current.themes?.darkMode) return true;

  return entityIds.some(
    (entityId) => entityId !== undefined && previous.states[entityId] !== current.states[entityId],
  );
};

export abstract class VartaCard<C extends BaseConfig, D = never> extends LitElement {
  static override properties: PropertyDeclarations = {
    hass: { attribute: false },
    _config: { state: true },
    _data: { state: true },
    _tick: { state: true },
    layout: { attribute: false },
  };

  static override styles: CSSResultGroup = baseStyles;

  declare hass: HomeAssistant | undefined;
  declare _config: C | undefined;
  declare _data: D | undefined;
  declare _tick: number;

  declare layout: string | undefined;

  static minSize: CardSize = 'small';

  static maxSize: CardSize = 'large';

  static configForm(): ConfigForm {
    return createForm([]);
  }

  static getConfigElement(): VartaCardEditor {
    const editor = new VartaCardEditor();

    editor.form = withSize(this.configForm(), sizesBetween(this.minSize, this.maxSize));

    return editor;
  }

  private _dataKey: string | undefined;

  private _requested = false;

  private _refreshTimer: number | undefined;

  private _tickTimer: number | undefined;

  private _resizeObserver: ResizeObserver | undefined;

  protected abstract parseConfig(raw: RawConfig): C;

  protected abstract renderBody(context: CardContext<C, D>): TemplateResult;

  protected trackedEntities(_config: C): readonly (string | undefined)[] {
    return [];
  }

  protected fetchData(_config: C, _hass: HomeAssistant): Promise<D> | undefined {
    return undefined;
  }

  protected refreshInterval(_config: C): number {
    return 5 * MINUTE;
  }

  protected tickInterval(_config: C): number {
    return MINUTE;
  }

  protected cardSize(_config: C): number {
    return 4;
  }

  protected defaultSize(_config: C): SizeSetting {
    return 'medium';
  }

  protected missingOption(_config: C): string | undefined {
    return undefined;
  }

  setConfig(raw: RawConfig): void {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid configuration');

    const config = this.parseConfig(raw);
    const key = JSON.stringify(config);

    if (key !== this._dataKey) {
      this._dataKey = key;
      this._data = undefined;
      this._requested = false;
    }

    this._config = config;
    this._restartTimers();
  }

  getCardSize(): number {
    const config = this._config;

    if (!config) return 4;

    const rows = this._heightRows(config);

    return rows === undefined ? this.cardSize(config) : rowsCardSize(rows);
  }

  getGridOptions(): LovelaceGridOptions {
    const config = this._config;
    const rows = config ? sizeRows(this._heightSize(config)) : undefined;

    return {
      columns: 12,
      rows: rows ?? 'auto',
      min_columns: 6,
      min_rows: SIZE_ROWS[this._heightMin()],
      max_rows: SIZE_ROWS[(this.constructor as typeof VartaCard).maxSize],
    };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._restartTimers();
    this._resizeObserver ??= new ResizeObserver(() => {
      this._fitHeight();
    });
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopTimers();
    this._resizeObserver?.disconnect();
    this._requested = false;
  }

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (!this._config) return false;
    if (changed.size !== 1 || !changed.has('hass')) return true;

    return hassChanged(changed.get('hass'), this.hass, this.trackedEntities(this._config));
  }

  protected override willUpdate(): void {
    if (this._requested || !this.hass || !this._config) return;

    this._requested = true;
    void this._load();
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;

    if (!config || !hass) return nothing;

    const language = resolveLanguage(config.language ?? hass.locale.language);
    const t = createLocalize(language, config.labels);
    const missing = this.missingOption(config);

    if (missing) {
      const key = `editor.${missing}` as TranslationKey;
      const label = t(key);

      return html`<ha-card class="varta" style="padding:16px">
        <div class="empty">
          ${t('common.configure', { option: label === key ? missing : label })}
        </div>
      </ha-card>`;
    }

    return html`<ha-card
      class="varta ${hass.themes?.darkMode === false ? 'light' : ''}"
      style=${colorStyle(config.colors)}
      @varta-tip=${tipHandler}
    >
      ${this.renderBody({
        config,
        hass,
        data: this._data,
        t,
        locale: toFormatLocale(hass.locale, language, unitDictionary(t)),
        now: Date.now(),
        size: tierOf(this._heightRows(config)),
        moreInfo: (entityId) => {
          openMoreInfo(this, entityId);
        },
        update: () => {
          this.requestUpdate();
        },
      })}
      ${tipLayer()}
    </ha-card>`;
  }

  protected override updated(): void {
    const config = this._config;

    if (!config) return;

    const rows = this.layout === 'grid' ? undefined : this._heightRows(config);

    if (rows === undefined) {
      this.style.removeProperty('height');
    } else {
      this.style.height = `${rowsHeight(rows)}px`;
    }

    this._fitHeight();
  }

  private _heightMin(): CardSize {
    return (this.constructor as typeof VartaCard).minSize;
  }

  private _heightSize(config: C): SizeSetting {
    return clampSize(
      config.size ?? this.defaultSize(config),
      this._heightMin(),
      (this.constructor as typeof VartaCard).maxSize,
    );
  }

  private _heightRows(config: C): number | undefined {
    return config.grid_rows ?? sizeRows(this._heightSize(config));
  }

  private _fitHeight(): void {
    const card = this.renderRoot.querySelector<HTMLElement>('ha-card');

    if (!card) return;

    card.querySelectorAll('[data-cut]').forEach((element) => {
      element.removeAttribute('data-cut');
    });

    const config = this._config;

    if (!config || this._heightRows(config) === undefined || card.clientHeight === 0) return;

    for (const group of dropGroups(card)) {
      if (!overflows(card)) return;

      group.forEach((element) => {
        element.setAttribute('data-cut', '');
      });
    }
  }

  protected reload(): void {
    void this._load();
  }

  private async _load(): Promise<void> {
    const config = this._config;
    const hass = this.hass;

    if (!config || !hass || this.missingOption(config)) return;

    const key = this._dataKey;
    const request = this.fetchData(config, hass);

    if (!request) return;

    try {
      const data = await request;

      if (key !== this._dataKey) return;

      this._data = data;
    } catch (error) {
      console.warn(`${this.localName}: unable to load data`, error);
    }
  }

  private _restartTimers(): void {
    this._stopTimers();

    const config = this._config;

    if (!config || !this.isConnected) return;

    this._refreshTimer = window.setInterval(() => {
      void this._load();
    }, this.refreshInterval(config));
    this._tickTimer = window.setInterval(() => {
      this._tick = Date.now();
    }, this.tickInterval(config));
  }

  private _stopTimers(): void {
    window.clearInterval(this._refreshTimer);
    window.clearInterval(this._tickTimer);
    this._refreshTimer = undefined;
    this._tickTimer = undefined;
  }
}
