export const CARD_SIZES = ['small', 'medium', 'large'] as const;

export type CardSize = (typeof CARD_SIZES)[number];

export type SizeSetting = CardSize | 'auto';

export const SIZE_SETTINGS: readonly SizeSetting[] = ['auto', ...CARD_SIZES];

export const SIZE_ROWS: Readonly<Record<CardSize, number>> = {
  small: 3,
  medium: 6,
  large: 9,
};

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const CARD_SIZE_UNIT = 50;

export const rowsHeight = (rows: number): number => rows * (ROW_HEIGHT + ROW_GAP) - ROW_GAP;

export const rowsCardSize = (rows: number): number => Math.ceil(rowsHeight(rows) / CARD_SIZE_UNIT);

const CARD_CHROME = 34;

export const contentHeight = (size: CardSize): number => rowsHeight(SIZE_ROWS[size]) - CARD_CHROME;

export const sizesBetween = (min: CardSize, max: CardSize): readonly CardSize[] =>
  CARD_SIZES.slice(CARD_SIZES.indexOf(min), CARD_SIZES.indexOf(max) + 1);

export const clampSize = (size: SizeSetting, min: CardSize, max: CardSize): SizeSetting => {
  if (size === 'auto') return size;
  if (CARD_SIZES.indexOf(size) < CARD_SIZES.indexOf(min)) return min;

  return CARD_SIZES.indexOf(size) > CARD_SIZES.indexOf(max) ? max : size;
};

export const sizeRows = (size: SizeSetting): number | undefined =>
  size === 'auto' ? undefined : SIZE_ROWS[size];

export const tierOf = (rows: number | undefined): SizeSetting => {
  if (rows === undefined) return 'auto';
  if (rows >= SIZE_ROWS.large) return 'large';

  return rows >= SIZE_ROWS.medium ? 'medium' : 'small';
};

export const isSizeSetting = (value: unknown): value is SizeSetting =>
  typeof value === 'string' && (SIZE_SETTINGS as readonly string[]).includes(value);
