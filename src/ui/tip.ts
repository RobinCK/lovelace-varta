import { html, render } from 'lit';
import type { TemplateResult } from 'lit';

export interface TipRow {
  readonly label: string;
  readonly value: string;
  readonly color?: string;
}

export interface Tip {
  readonly title: string;
  readonly rows: readonly TipRow[];
}

export interface TipBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface TipDetail {
  readonly tip: Tip;
  readonly box: TipBox;
  readonly band: boolean;
}

export type SlotTip = (index: number) => Tip | undefined;

export interface Hover {
  readonly move: (event: PointerEvent) => void;
  readonly leave: (event: PointerEvent) => void;
}

export const TIP_EVENT = 'varta-tip';
const TOUCH_DELAY = 2500;
const MARGIN = 6;
const OFFSET = 8;

let touchTimer: number | undefined;

const emit = (source: Element, detail: TipDetail | undefined): void => {
  source.dispatchEvent(new CustomEvent(TIP_EVENT, { bubbles: true, composed: true, detail }));
};

export const showTip = (source: Element, tip: Tip | undefined, box: TipBox, band = true): void => {
  window.clearTimeout(touchTimer);
  emit(source, tip ? { tip, box, band } : undefined);
};

export const hideTip = (event: PointerEvent): void => {
  const source = event.currentTarget;

  if (!(source instanceof Element)) return;

  window.clearTimeout(touchTimer);

  if (event.pointerType !== 'touch') {
    emit(source, undefined);

    return;
  }

  touchTimer = window.setTimeout(() => {
    emit(source, undefined);
  }, TOUCH_DELAY);
};

export const slotHover = (count: number, tip: SlotTip): Hover => ({
  move: (event) => {
    const target = event.currentTarget;

    if (!(target instanceof Element) || count <= 0) return;

    const rect = target.getBoundingClientRect();

    if (rect.width <= 0) return;

    const index = Math.min(
      count - 1,
      Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * count)),
    );
    const width = rect.width / count;

    showTip(target, tip(index), {
      left: rect.left + index * width,
      top: rect.top,
      width,
      height: rect.height,
    });
  },
  leave: hideTip,
});

export const elementHover = (tip: () => Tip | undefined, band = false): Hover => ({
  move: (event) => {
    const target = event.currentTarget;

    if (!(target instanceof Element)) return;

    showTip(target, tip(), target.getBoundingClientRect(), band);
  },
  leave: hideTip,
});

const tipTemplate = (tip: Tip): TemplateResult =>
  html`<div class="tip-title">${tip.title}</div>
    ${tip.rows.map(
      (row) =>
        html`<div class="tip-row">
          ${row.color ? html`<i style="background:${row.color}"></i>` : html`<span></span>`}
          <span>${row.label}</span><b>${row.value}</b>
        </div>`,
    )}`;

const hide = (element: HTMLElement | null): void => {
  if (element) element.style.display = 'none';
};

export const tipLayer = (): TemplateResult =>
  html`<div class="tip-band" aria-hidden="true"></div>
    <div class="tip" role="tooltip"></div>`;

export const placeTip = (card: HTMLElement, detail: TipDetail | undefined): void => {
  const band = card.querySelector<HTMLElement>(':scope > .tip-band');
  const bubble = card.querySelector<HTMLElement>(':scope > .tip');

  if (!band || !bubble) return;

  if (!detail) {
    hide(band);
    hide(bubble);

    return;
  }

  const frame = card.getBoundingClientRect();
  const left = detail.box.left - frame.left - card.clientLeft;
  const top = detail.box.top - frame.top - card.clientTop;

  if (detail.band) {
    band.style.cssText = `display:block;left:${left}px;top:${top}px;width:${detail.box.width}px;height:${detail.box.height}px`;
  } else {
    hide(band);
  }

  render(tipTemplate(detail.tip), bubble);
  bubble.style.display = 'block';

  const width = bubble.offsetWidth;
  const height = bubble.offsetHeight;
  const x = Math.min(
    Math.max(MARGIN, left + detail.box.width / 2 - width / 2),
    Math.max(MARGIN, card.clientWidth - width - MARGIN),
  );
  const above = top - height - OFFSET;
  const y =
    above >= MARGIN
      ? above
      : Math.min(top + detail.box.height + OFFSET, card.clientHeight - height - MARGIN);

  bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(MARGIN, y))}px)`;
};

export const tipHandler = (event: Event): void => {
  const card = event.currentTarget;

  if (!(card instanceof HTMLElement) || !(event instanceof CustomEvent)) return;

  event.stopPropagation();
  placeTip(card, event.detail as TipDetail | undefined);
};

export const tipValue = (formatted: { readonly value: string; readonly unit: string }): string =>
  formatted.unit ? `${formatted.value} ${formatted.unit}` : formatted.value;
