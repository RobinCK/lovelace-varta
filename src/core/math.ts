export const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

export const mean = (values: readonly number[]): number | undefined =>
  values.length === 0 ? undefined : sum(values) / values.length;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const quantile = (values: readonly number[], q: number): number | undefined => {
  if (values.length === 0) return undefined;

  const sorted = [...values].sort((a, b) => a - b);
  const position = clamp(q, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower] ?? 0;
  const high = sorted[upper] ?? low;

  return low + (high - low) * (position - lower);
};

export const median = (values: readonly number[]): number | undefined => quantile(values, 0.5);

const NICE_STEPS: readonly number[] = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export const niceMax = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = NICE_STEPS.find((candidate) => candidate * magnitude >= value) ?? 10;

  return step * magnitude;
};
