import { css } from 'lit';

export const baseStyles = css`
  :host {
    display: block;
    height: 100%;
  }

  [data-cut] {
    display: none !important;
  }

  ha-card.varta {
    --m-text: var(--primary-text-color);
    --m-text-2: var(--secondary-text-color);
    --m-muted: color-mix(in srgb, var(--secondary-text-color) 85%, transparent);
    --m-line: var(--divider-color, rgba(127, 127, 127, 0.2));
    --m-panel: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
    --m-track: color-mix(in srgb, var(--primary-text-color) 9%, transparent);
    --m-bg: var(--ha-card-background, var(--card-background-color, #15181c));
    --m-solar: var(--metron-solar-color, #ffb547);
    --m-home: var(--metron-home-color, #c3a6ff);
    --m-battery: var(--metron-battery-color, #4ade9b);
    --m-grid: var(--metron-grid-color, #6aa8ff);
    --m-gas: var(--metron-gas-color, #3ccfc1);
    --m-warn: var(--metron-warning-color, #ff7a59);
    --m-cold: var(--metron-cold-color, #8fc7ff);
    --m-ok: var(--metron-ok-color, #4ade9b);
    --m-mono: var(
      --metron-font-mono,
      var(--ha-font-family-code, ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace)
    );
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    box-sizing: border-box;
    position: relative;
    padding: 16px;
    overflow: hidden;
    color: var(--m-text);
  }

  .shrink {
    flex: 0 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 26px;
  }

  .eyebrow {
    min-width: 0;
    overflow: hidden;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--m-text-2);
  }

  .meta {
    flex-shrink: 0;
    font-size: 11px;
    white-space: nowrap;
    color: var(--m-muted);
  }

  .pill {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: color-mix(in srgb, var(--tone) 14%, transparent);
    color: var(--tone);
  }

  .pill i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .mono {
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
  }

  .hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .hero-value {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .big {
    font-family: var(--m-mono);
    font-size: 30px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .unit {
    font-size: 12px;
    color: var(--m-text-2);
  }

  .label {
    min-width: 0;
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--m-muted);
  }

  .side-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  .side-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    font-size: 11px;
    white-space: nowrap;
    color: var(--m-muted);
  }

  .side-row b {
    font-family: var(--m-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--m-text);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr));
    gap: 12px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--m-line);
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .stat .value {
    overflow: hidden;
    font-family: var(--m-mono);
    font-size: 15px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--tone, var(--m-text));
  }

  .stat .value small {
    font-family: var(--ha-font-family-body, inherit);
    font-size: 11px;
    font-weight: 400;
    color: var(--m-muted);
  }

  .stat .sub {
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--m-muted);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 11px;
    color: var(--m-muted);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .legend i {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: var(--c);
  }

  .legend i.line {
    height: 2px;
  }

  .chart {
    position: relative;
    width: 100%;
  }

  .chart svg {
    display: block;
    width: 100%;
    overflow: visible;
  }

  .chart.fill {
    flex: 0 1 auto;
    min-height: var(--fill-min, 32px);
  }

  .chart.fill > svg {
    position: absolute;
    inset: 0;
    height: 100%;
  }

  .hoverable {
    touch-action: pan-y;
  }

  .tip-band {
    position: absolute;
    top: 0;
    left: 0;
    display: none;
    border-radius: 3px;
    background: color-mix(in srgb, var(--m-text) 12%, transparent);
    pointer-events: none;
  }

  .tip {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 3;
    display: none;
    box-sizing: border-box;
    min-width: 116px;
    max-width: min(260px, calc(100% - 12px));
    padding: 8px 10px;
    border: 1px solid var(--m-line);
    border-radius: 10px;
    background: color-mix(in srgb, var(--m-bg) 92%, var(--m-text));
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: none;
  }

  .tip-title {
    margin-bottom: 4px;
    font-size: 11px;
    white-space: nowrap;
    color: var(--m-text-2);
  }

  .tip-row {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .tip-row i {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  .tip-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--m-text-2);
  }

  .tip-row b {
    font-family: var(--m-mono);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--m-text);
  }

  .axis {
    position: relative;
    height: 12px;
    font-family: var(--m-mono);
    font-size: 10px;
    color: var(--m-muted);
  }

  .axis span {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    white-space: nowrap;
  }

  .axis span.first {
    transform: none;
  }

  .axis span.last {
    transform: translateX(-100%);
  }

  .rows {
    display: flex;
    flex-direction: column;
  }

  .row {
    display: grid;
    grid-template-columns: var(--row-cols, minmax(0, 1fr) auto);
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-top: 1px solid var(--m-line);
  }

  .row:first-child {
    border-top: none;
  }

  .name {
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .num {
    font-family: var(--m-mono);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }

  .track {
    height: 6px;
    overflow: hidden;
    border-radius: 3px;
    background: var(--m-track);
  }

  .track > div {
    height: 100%;
    border-radius: 3px;
    background: var(--c, var(--m-text-2));
  }

  .panels {
    display: grid;
    grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
    gap: 10px;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding: 14px;
    border-radius: 14px;
    background: var(--m-panel);
  }

  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .tile {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--m-panel);
  }

  .tile ha-icon {
    flex-shrink: 0;
    --mdc-icon-size: 18px;
    color: var(--tone, var(--m-text-2));
  }

  .tile-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 13px;
  }

  .tile-text span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tile-text .sub {
    font-size: 11px;
    color: var(--m-muted);
  }

  .xl {
    font-family: var(--m-mono);
    font-size: 26px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .note {
    font-size: 12px;
    color: var(--m-text-2);
  }

  .note.warn {
    font-weight: 600;
    color: var(--m-warn);
  }

  .note.ok {
    color: var(--m-ok);
  }

  .nav {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 2px;
  }

  .nav span {
    padding: 0 8px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .nav button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: var(--m-panel);
    color: var(--m-text);
    cursor: pointer;
  }

  .nav button.label {
    width: auto;
    height: auto;
    padding: 0 8px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: none;
  }

  .nav button:disabled {
    color: var(--m-muted);
    opacity: 0.45;
    cursor: default;
  }

  .nav svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }

  .share-bar {
    display: flex;
    gap: 2px;
    height: 10px;
    overflow: hidden;
    border-radius: 5px;
  }

  .share-bar span {
    min-width: 2px;
  }

  .dot-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 12px;
    font-size: 12px;
    color: var(--m-text-2);
  }

  .dot-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .dot-legend i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .dot-legend b {
    font-family: var(--m-mono);
    font-weight: 400;
    color: var(--m-text);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .loading {
    opacity: 0.45;
    transition: opacity 0.2s;
  }

  .empty {
    padding: 12px 0;
    font-size: 13px;
    color: var(--m-muted);
  }

  .clickable {
    cursor: pointer;
  }

  .tone-solar {
    --tone: var(--m-solar);
  }

  .tone-home {
    --tone: var(--m-home);
  }

  .tone-battery {
    --tone: var(--m-battery);
  }

  .tone-grid {
    --tone: var(--m-grid);
  }

  .tone-gas {
    --tone: var(--m-gas);
  }

  .tone-warn {
    --tone: var(--m-warn);
  }

  .tone-ok {
    --tone: var(--m-ok);
  }

  .tone-cold {
    --tone: var(--m-cold);
  }

  .tone-muted {
    --tone: var(--m-muted);
  }
`;
