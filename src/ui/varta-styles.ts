import { css } from 'lit';

export const vartaStyles = css`
  ha-card.varta {
    --m-caution: var(--metron-caution-color, #ffb547);
    --v-focus: var(--primary-color, var(--m-grid));
    --v-ink: 100%;
    --v-meter: 64px;
    container: varta / inline-size;
  }

  ha-card.varta.light {
    --v-ink: 50%;
  }

  [hidden] {
    display: none !important;
  }

  .tone-caution {
    --tone: var(--m-caution);
  }

  .ink,
  ha-card.varta.light .pill {
    color: color-mix(in srgb, var(--tone, var(--m-text)) var(--v-ink), var(--m-text));
  }

  .pills {
    display: flex;
    flex-shrink: 0;
    gap: 6px;
  }

  .open,
  .act,
  .member,
  .more,
  .fold-head,
  .restore,
  .bat,
  .okrow {
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
    appearance: none;
    font: inherit;
    text-align: inherit;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .open:focus-visible,
  .act:focus-visible,
  .member:focus-visible,
  .more:focus-visible,
  .fold-head:focus-visible,
  .restore:focus-visible,
  .bat:focus-visible,
  .okrow:focus-visible {
    outline: 2px solid var(--v-focus);
    outline-offset: 2px;
  }

  .chev {
    flex-shrink: 0;
    --mdc-icon-size: 16px;
    color: var(--m-muted);
    transition: transform 0.2s ease;
  }

  [aria-expanded='true'] .chev {
    transform: rotate(180deg);
  }

  .list {
    display: flex;
    flex-direction: column;
  }

  .dev {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--m-line);
  }

  .dev:first-child {
    border-top: none;
  }

  .dev-line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 36px;
    align-items: center;
    column-gap: 6px;
  }

  .dev-line.ro {
    grid-template-columns: minmax(0, 1fr);
  }

  .act:disabled,
  .restore:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .open {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 10px;
    min-width: 0;
    padding: 7px 0;
    border-radius: 10px;
  }

  .badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--m-panel);
    color: var(--m-text-2);
    --mdc-icon-size: 18px;
  }

  .badge.stack {
    box-shadow:
      2px -2px 0 0 var(--m-bg),
      5px -5px 0 -1px var(--m-track);
  }

  .badge.toned {
    background: color-mix(in srgb, var(--tone) 12%, transparent);
    color: var(--tone);
  }

  .who {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.35;
  }

  .title > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sub {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 11px;
    line-height: 1.35;
    white-space: nowrap;
    color: var(--m-muted);
    --mdc-icon-size: 13px;
  }

  .sub > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub > ha-icon {
    flex-shrink: 0;
  }

  .sub b {
    font-family: var(--m-mono);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--m-text-2);
  }

  .why {
    overflow: hidden;
    font-size: 11px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--m-text-2);
  }

  .why.soft {
    color: var(--m-muted);
  }

  .since,
  .lvl {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    white-space: nowrap;
  }

  .since b,
  .lvl b {
    font-family: var(--m-mono);
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .since b small,
  .lvl b small {
    margin-left: 2px;
    font-family: var(--ha-font-family-body, inherit);
    font-size: 11px;
    font-weight: 400;
    color: var(--m-muted);
  }

  .since > span,
  .lvl > span {
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--m-muted);
  }

  .lvl > span {
    font-family: var(--m-mono);
  }

  .act {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: var(--m-muted);
    --mdc-icon-size: 18px;
  }

  .members {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: -3px 0 10px 17px;
    padding: 5px 0 1px 28px;
    border-left: 1px solid var(--m-line);
  }

  .member {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    max-width: 100%;
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--m-panel);
    font-size: 12px;
    line-height: 1.3;
    white-space: nowrap;
  }

  .member span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .member small {
    font-size: 11px;
    color: var(--m-muted);
  }

  .member.lead {
    align-self: center;
    align-items: center;
    background: none;
    box-shadow: inset 0 0 0 1px var(--m-line);
    color: var(--m-text-2);
    --mdc-icon-size: 14px;
  }

  .more {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 9px 0 9px 46px;
    border-top: 1px solid var(--m-line);
    font-size: 12px;
    font-weight: 600;
    color: var(--m-text-2);
    --mdc-icon-size: 16px;
  }

  .more.flush {
    padding-left: 0;
  }

  .more b {
    font-family: var(--m-mono);
    font-weight: 500;
  }

  .fold {
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    background: var(--m-panel);
  }

  .fold-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--m-text-2);
    --mdc-icon-size: 16px;
  }

  .fold-head > ha-icon:first-child {
    color: var(--m-muted);
  }

  .fold-head .mono {
    font-weight: 500;
    color: var(--m-muted);
  }

  .fold-head .chev {
    margin-left: auto;
  }

  .fold-body {
    display: flex;
    flex-direction: column;
    padding: 0 12px 12px;
  }

  .ign {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 10px;
    padding: 8px 0;
    border-top: 1px solid var(--m-line);
  }

  .ign .title {
    font-weight: 400;
    color: var(--m-text-2);
  }

  .restore {
    padding: 6px 10px;
    border-radius: 8px;
    box-shadow: inset 0 0 0 1px var(--m-line);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    color: var(--m-text-2);
  }

  .fold-note {
    margin: 0;
    padding-top: 10px;
    border-top: 1px solid var(--m-line);
    font-size: 11px;
    line-height: 1.45;
    color: var(--m-muted);
  }

  .calm {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: center;
    column-gap: 10px;
    padding: 7px 0;
  }

  .calm .title {
    font-weight: 400;
    color: var(--m-text-2);
  }

  .calm .sub {
    white-space: normal;
  }

  .skel {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) 40px;
    align-items: center;
    column-gap: 10px;
    padding: 7px 0;
    border-top: 1px solid var(--m-line);
  }

  .skel:first-child {
    border-top: none;
  }

  .skel.flat {
    grid-template-columns: minmax(0, 1fr) var(--v-meter) 36px;
    column-gap: 12px;
  }

  .skel i {
    display: block;
    height: 8px;
    border-radius: 4px;
    background: var(--m-track);
    animation: varta-pulse 1.6s ease-in-out infinite;
  }

  .skel i.box {
    height: 36px;
    border-radius: 10px;
  }

  .skel i.bar {
    height: 6px;
    border-radius: 3px;
  }

  .skel .lines {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .skel .lines i:first-child {
    width: var(--w, 60%);
  }

  .skel .lines i:last-child {
    width: calc(var(--w, 60%) * 0.6);
    height: 6px;
  }

  @keyframes varta-pulse {
    50% {
      opacity: 0.5;
    }
  }

  .buy {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--m-text-2);
    --mdc-icon-size: 16px;
  }

  .buy > ha-icon {
    color: var(--m-muted);
  }

  .buy > span:not(.tag) {
    margin-right: 2px;
  }

  .tag {
    flex-shrink: 0;
    padding: 0 5px;
    border-radius: 5px;
    box-shadow: inset 0 0 0 1px var(--m-line);
    font-family: var(--m-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    line-height: 16px;
    letter-spacing: 0.02em;
    color: var(--m-text-2);
  }

  .buy .tag {
    padding: 1px 7px;
    font-size: 11px;
  }

  .buy .tag b {
    font-weight: 600;
    color: var(--m-text);
  }

  .sec {
    display: flex;
    flex-direction: column;
  }

  .sec-head,
  .okrow .what {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    color: var(--m-text-2);
  }

  .sec-head {
    padding-bottom: 6px;
  }

  .sec-head i,
  .okrow .what i {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--tone);
  }

  .bat,
  .okrow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--v-meter) 44px;
    align-items: center;
    column-gap: 12px;
    width: 100%;
  }

  .bat {
    padding: 7px 0;
    border-top: 1px solid var(--m-line);
  }

  .okrow {
    min-height: 32px;
    border-radius: 8px;
  }

  .okrow .what > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .okrow .what b {
    font-family: var(--m-mono);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--m-text);
  }

  .okrow .chev {
    justify-self: end;
  }

  .okrow[aria-expanded='true'] {
    margin-bottom: 6px;
  }

  .cell {
    display: flex;
    align-items: center;
    gap: 1px;
  }

  .cell::after {
    content: '';
    flex-shrink: 0;
    width: 2px;
    height: 4px;
    border-radius: 0 1px 1px 0;
    background: var(--m-track);
  }

  .cell .track {
    display: block;
    flex: 1 1 auto;
  }

  .cell .track > span {
    display: block;
    min-width: 2px;
    height: 100%;
    border-radius: 3px;
    background: var(--tone, var(--m-text-2));
  }

  .bat.tone-ok .cell .track > span {
    opacity: 0.6;
  }

  .rail {
    position: relative;
    display: block;
    flex: 1 1 auto;
    height: 6px;
    border-radius: 3px;
    background: var(--m-track);
  }

  .rail i {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 10px;
    margin-left: -1px;
    border-radius: 1px;
    background: var(--tone);
    opacity: 0.5;
  }

  .rail i.min {
    opacity: 1;
  }

  .bat.off .cell,
  .bat.off .lvl b {
    opacity: 0.45;
  }

  .bat.off .title {
    color: var(--m-text-2);
  }

  .wide {
    display: none;
  }

  @container varta (min-width: 480px) {
    .sec,
    .skel.flat {
      --v-meter: 112px;
    }

    .bat,
    .okrow {
      grid-template-columns: minmax(0, 1fr) var(--v-meter) 72px;
    }

    .wide {
      display: inline;
    }

    .narrow {
      display: none;
    }

    .why {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      white-space: normal;
    }
  }

  @container varta (max-width: 340px) {
    .sec,
    .skel.flat {
      --v-meter: 44px;
    }

    .since > span,
    .okrow .cell {
      display: none;
    }

    .okrow {
      grid-template-columns: minmax(0, 1fr) auto;
    }
  }

  @media (hover: hover) {
    .act:hover,
    .restore:hover {
      background: var(--m-panel);
      color: var(--m-text);
    }

    .member:hover {
      background: var(--m-track);
    }

    .member.lead:hover {
      background: var(--m-panel);
    }

    .more:hover,
    .fold-head:hover,
    .okrow:hover .what {
      color: var(--m-text);
    }

    .open:hover .title,
    .bat:hover .title {
      text-decoration: underline;
      text-decoration-color: var(--m-line);
      text-underline-offset: 3px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chev {
      transition: none;
    }

    .skel i {
      animation: none;
    }
  }
`;
