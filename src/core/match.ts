const escape = (text: string): string => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

const toRegExp = (pattern: string): RegExp =>
  new RegExp(`^${pattern.split('*').map(escape).join('.*')}$`, 'i');

export const matches = (value: string, pattern: string): boolean => {
  const trimmed = pattern.trim();

  if (trimmed === '') return false;
  if (!trimmed.includes('*')) return value.toLowerCase() === trimmed.toLowerCase();

  return toRegExp(trimmed).test(value);
};

export const matchesAny = (values: readonly string[], patterns: readonly string[]): boolean =>
  patterns.some((pattern) => values.some((value) => matches(value, pattern)));

export const firstMatch = <T>(
  values: readonly string[],
  rules: readonly (readonly [string, T])[],
): T | undefined => rules.find(([pattern]) => values.some((value) => matches(value, pattern)))?.[1];
