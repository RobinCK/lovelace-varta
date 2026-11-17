import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import type { HomeAssistant } from '../types/ha';

export type Tone =
  'solar' | 'home' | 'battery' | 'grid' | 'gas' | 'warn' | 'ok' | 'cold' | 'muted' | 'text';

export const toneColor = (tone: Tone): string =>
  tone === 'text' ? 'var(--m-text)' : `var(--m-${tone})`;

export const header = (
  title: string | false | undefined,
  aside?: TemplateResult | typeof nothing,
): TemplateResult | typeof nothing => {
  if (title === false && (aside === undefined || aside === nothing)) return nothing;

  return html`<div class="head">
    <div class="eyebrow">${title === false ? '' : (title ?? '')}</div>
    ${aside ?? nothing}
  </div>`;
};

export const meta = (text: string): TemplateResult => html`<div class="meta">${text}</div>`;

export const pill = (text: string, tone: Tone, dot = true): TemplateResult =>
  html`<span class="pill" style="--tone:${toneColor(tone)}"
    >${dot ? html`<i></i>` : nothing}${text}</span
  >`;

export interface StatItem {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly tone?: Tone;
  readonly sub?: string;
}

const statTemplate = (item: StatItem): TemplateResult =>
  html`<div class="stat" style=${item.tone ? `--tone:${toneColor(item.tone)}` : ''}>
    <span class="label">${item.label}</span>
    <span class="value"
      >${item.value}${item.unit ? html`<small> ${item.unit}</small>` : nothing}</span
    >
    ${item.sub ? html`<span class="sub">${item.sub}</span>` : nothing}
  </div>`;

export const stats = (
  items: readonly StatItem[],
  drop?: number,
): TemplateResult | typeof nothing =>
  items.length === 0
    ? nothing
    : html`<div class="stats" style="--cols:${items.length}" data-drop=${drop ?? nothing}>
        ${items.map(statTemplate)}
      </div>`;

export interface LegendItem {
  readonly label: string;
  readonly color: string;
  readonly line?: boolean;
}

export const legend = (items: readonly LegendItem[], drop?: number): TemplateResult =>
  html`<div class="legend" data-drop=${drop ?? nothing}>
    ${items.map(
      (item) =>
        html`<span
          ><i class=${item.line ? 'line' : ''} style="--c:${item.color}"></i>${item.label}</span
        >`,
    )}
  </div>`;

export interface Tick {
  readonly at: number;
  readonly label: string;
  readonly color?: string;
}

export const axis = (ticks: readonly Tick[], drop?: number): TemplateResult =>
  html`<div class="axis" data-drop=${drop ?? nothing}>
    ${ticks.map((tick) => {
      const position = Math.min(1, Math.max(0, tick.at));
      const edge = position <= 0.001 ? 'first' : position >= 0.999 ? 'last' : '';

      return html`<span
        class=${edge}
        style="left:${(position * 100).toFixed(2)}%;${tick.color ? `color:${tick.color}` : ''}"
        >${tick.label}</span
      >`;
    })}
  </div>`;

export const empty = (text: string): TemplateResult => html`<div class="empty">${text}</div>`;

export const track = (fraction: number, color: string): TemplateResult =>
  html`<div class="track">
    <div style="width:${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(1)}%;--c:${color}"></div>
  </div>`;

export const icon = (name: string | undefined, color?: string): TemplateResult | typeof nothing =>
  name ? html`<ha-icon .icon=${name} style=${color ? `color:${color}` : ''}></ha-icon>` : nothing;

const SEMANTIC_COLORS: Readonly<Record<string, string>> = {
  solar: 'var(--m-solar)',
  home: 'var(--m-home)',
  battery: 'var(--m-battery)',
  grid: 'var(--m-grid)',
  gas: 'var(--m-gas)',
  warn: 'var(--m-warn)',
  warning: 'var(--m-warn)',
  cold: 'var(--m-cold)',
  ok: 'var(--m-ok)',
  text: 'var(--m-text)',
  muted: 'var(--m-muted)',
};

export const PALETTE: readonly string[] = [
  'var(--m-solar)',
  'var(--m-home)',
  'var(--m-battery)',
  'var(--m-grid)',
  'var(--m-gas)',
  'var(--m-cold)',
  'var(--m-warn)',
  'var(--m-ok)',
];

export const colorOf = (color: string | undefined, index = 0): string => {
  if (color) return SEMANTIC_COLORS[color] ?? color;

  return PALETTE[index % PALETTE.length] ?? 'var(--m-text-2)';
};

export const stateIcon = (
  hass: HomeAssistant,
  entityId: string | undefined,
  name: string | undefined,
  color?: string,
): TemplateResult =>
  html`<ha-state-icon
    .hass=${hass}
    .stateObj=${entityId ? hass.states[entityId] : undefined}
    .icon=${name}
    style=${color ? `color:${color}` : ''}
  ></ha-state-icon>`;

export interface Navigation {
  readonly label: string;
  readonly previous: () => void;
  readonly next: () => void;
  readonly canNext: boolean;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly reset?: () => void;
  readonly resetLabel?: string;
}

const navigatorLabel = (navigation: Navigation): TemplateResult => {
  const reset = navigation.reset;

  if (!reset || !navigation.canNext) return html`<span>${navigation.label}</span>`;

  return html`<button
    type="button"
    class="label"
    title=${navigation.resetLabel ?? nothing}
    @click=${(event: Event) => {
      event.stopPropagation();
      reset();
    }}
  >
    ${navigation.label}
  </button>`;
};

export const navigator = (navigation: Navigation): TemplateResult =>
  html`<div class="nav">
    <button
      type="button"
      aria-label=${navigation.previousLabel}
      @click=${(event: Event) => {
        event.stopPropagation();
        navigation.previous();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>
    </button>
    ${navigatorLabel(navigation)}
    <button
      type="button"
      aria-label=${navigation.nextLabel}
      ?disabled=${!navigation.canNext}
      @click=${(event: Event) => {
        event.stopPropagation();
        navigation.next();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>
    </button>
  </div>`;

export interface ShareItem {
  readonly label: string;
  readonly value: number | undefined;
  readonly color: string;
}

export const shareBar = (items: readonly ShareItem[]): TemplateResult | typeof nothing => {
  const visible = items.filter((item) => (item.value ?? 0) > 0);
  const sum = visible.reduce((total, item) => total + (item.value ?? 0), 0);

  if (sum <= 0) return nothing;

  return html`<div class="share-bar">
    ${visible.map(
      (item) =>
        html`<span
          style="width:${(((item.value ?? 0) / sum) * 100).toFixed(2)}%;background:${item.color}"
        ></span>`,
    )}
  </div>`;
};

export const dotLegend = (
  items: readonly ShareItem[],
  format: (value: number | undefined) => string,
): TemplateResult =>
  html`<div class="dot-legend">
    ${items.map(
      (item) =>
        html`<span
          ><i style="background:${item.color}"></i>${item.label} <b>${format(item.value)}</b></span
        >`,
    )}
  </div>`;

const WEATHER_ICONS: Readonly<Record<string, string>> = {
  'clear-night': 'mdi:weather-night',
  cloudy: 'mdi:weather-cloudy',
  exceptional: 'mdi:alert-circle-outline',
  fog: 'mdi:weather-fog',
  hail: 'mdi:weather-hail',
  lightning: 'mdi:weather-lightning',
  'lightning-rainy': 'mdi:weather-lightning-rainy',
  partlycloudy: 'mdi:weather-partly-cloudy',
  pouring: 'mdi:weather-pouring',
  rainy: 'mdi:weather-rainy',
  snowy: 'mdi:weather-snowy',
  'snowy-rainy': 'mdi:weather-snowy-rainy',
  sunny: 'mdi:weather-sunny',
  windy: 'mdi:weather-windy',
  'windy-variant': 'mdi:weather-windy-variant',
};

export const weatherIcon = (condition: string | undefined): string =>
  (condition ? WEATHER_ICONS[condition] : undefined) ?? 'mdi:weather-cloudy';
