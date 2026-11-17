import { EN } from '../i18n/en';
import type { TranslationKey } from '../i18n/en';
import { UK } from '../i18n/uk';

export type { TranslationKey };

export type TranslateParams = Readonly<Record<string, string | number>>;

export type Localize = (key: TranslationKey, params?: TranslateParams) => string;

type Dictionary = Readonly<Partial<Record<TranslationKey, string>>>;

const DICTIONARIES: Readonly<Record<string, Dictionary>> = {
  en: EN,
  uk: UK,
};

export const resolveLanguage = (language: string | undefined): string => {
  const base = (language ?? 'en').split(/[-_]/)[0]?.toLowerCase() ?? 'en';

  return base in DICTIONARIES ? base : 'en';
};

const interpolate = (template: string, params: TranslateParams | undefined): string => {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
};

export const createLocalize = (
  language: string | undefined,
  overrides: Readonly<Record<string, string>> = {},
): Localize => {
  const dictionary = DICTIONARIES[resolveLanguage(language)] ?? EN;

  return (key, params) => interpolate(overrides[key] ?? dictionary[key] ?? EN[key] ?? key, params);
};

interface HassHost extends Element {
  readonly hass?: { readonly language?: string };
}

export const editorLanguage = (): string => {
  const host = document.querySelector<HassHost>('home-assistant');

  return host?.hass?.language ?? document.documentElement.lang ?? navigator.language;
};
