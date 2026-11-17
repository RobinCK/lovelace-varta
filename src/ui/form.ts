import { createLocalize, editorLanguage } from '../core/i18n';
import type { TranslationKey } from '../core/i18n';
import { SIZE_SETTINGS } from '../core/size';
import type { CardSize } from '../core/size';

export interface SelectorField {
  readonly name: string;
  readonly label?: string;
  readonly required?: boolean;
  readonly selector: Readonly<Record<string, unknown>>;
}

export interface GridField {
  readonly type: 'grid';
  readonly name: '';
  readonly schema: readonly FormField[];
}

export interface ExpandableField {
  readonly type: 'expandable';
  readonly name: '';
  readonly title: string;
  readonly flatten: true;
  readonly schema: readonly FormField[];
}

export type FormField = SelectorField | GridField | ExpandableField;

export interface ConfigForm {
  readonly schema: readonly FormField[];
  readonly computeLabel: (field: FormField) => string;
  readonly computeHelper?: (field: FormField) => string | undefined;
}

export const entity = (
  name: string,
  options: { readonly domain?: readonly string[]; readonly deviceClass?: readonly string[] } = {},
  required = false,
): SelectorField => ({
  name,
  required,
  selector: {
    entity: {
      filter: {
        ...(options.domain ? { domain: options.domain } : {}),
        ...(options.deviceClass ? { device_class: options.deviceClass } : {}),
      },
    },
  },
});

export const energyEntity = (name: string, required = false): SelectorField =>
  entity(name, { domain: ['sensor'], deviceClass: ['energy'] }, required);

export const powerEntity = (name: string, required = false): SelectorField =>
  entity(name, { domain: ['sensor'], deviceClass: ['power'] }, required);

export const consumptionEntity = (): SelectorField => ({
  ...entity('entity', { domain: ['sensor'], deviceClass: ['power', 'energy'] }),
  label: 'consumption',
});

export const entities = (
  name: string,
  options: { readonly domain?: readonly string[]; readonly deviceClass?: readonly string[] } = {},
): SelectorField => ({
  name,
  selector: {
    entity: {
      multiple: true,
      filter: {
        ...(options.domain ? { domain: options.domain } : {}),
        ...(options.deviceClass ? { device_class: options.deviceClass } : {}),
      },
    },
  },
});

export const text = (name: string): SelectorField => ({ name, selector: { text: {} } });

export const texts = (name: string): SelectorField => ({
  name,
  selector: { text: { multiple: true } },
});

export const toggle = (name: string): SelectorField => ({ name, selector: { boolean: {} } });

export const number = (
  name: string,
  options: {
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly unit?: string;
  } = {},
): SelectorField => ({
  name,
  selector: {
    number: {
      mode: 'box',
      ...(options.min === undefined ? {} : { min: options.min }),
      ...(options.max === undefined ? {} : { max: options.max }),
      step: options.step ?? 1,
      ...(options.unit ? { unit_of_measurement: options.unit } : {}),
    },
  },
});

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export const select = (
  name: string,
  options: readonly (string | SelectOption)[],
): SelectorField => ({
  name,
  selector: { select: { mode: 'dropdown', options } },
});

export const object = (name: string): SelectorField => ({ name, selector: { object: {} } });

export interface ListField {
  readonly selector: Readonly<Record<string, unknown>>;
  readonly required?: boolean;
}

export const ITEM_FIELDS: Readonly<Record<string, ListField>> = {
  entity: { selector: { entity: {} }, required: true },
  name: { selector: { text: {} } },
  icon: { selector: { icon: {} } },
  color: { selector: { text: {} } },
};

export const list = (
  name: string,
  fields: Readonly<Record<string, ListField>> = ITEM_FIELDS,
  labelField = 'entity',
): SelectorField => ({
  name,
  selector: { object: { multiple: true, label_field: labelField, fields } },
});

export const time = (name: string): SelectorField => ({ name, selector: { time: {} } });

export const grid = (...schema: FormField[]): GridField => ({ type: 'grid', name: '', schema });

export const expandable = (title: string, ...schema: FormField[]): ExpandableField => ({
  type: 'expandable',
  name: '',
  title,
  flatten: true,
  schema,
});

export const COMMON_FIELDS: readonly FormField[] = [
  grid(
    text('title'),
    select('language', [
      { value: 'en', label: 'English' },
      { value: 'uk', label: 'Українська' },
    ]),
  ),
];

const humanize = (name: string): string => {
  const words = name.replace(/_/g, ' ');

  return words.charAt(0).toUpperCase() + words.slice(1);
};

type Translate = (name: string) => string;

const translateTitles = (fields: readonly FormField[], translate: Translate): FormField[] =>
  fields.map((field) => {
    if (!('type' in field)) return field;
    if (field.type === 'grid')
      return { ...field, schema: translateTitles(field.schema, translate) };

    return {
      ...field,
      title: translate(`section_${field.title}`),
      schema: translateTitles(field.schema, translate),
    };
  });

export const createForm = (schema: readonly FormField[]): ConfigForm => {
  const t = createLocalize(editorLanguage());
  const translate: Translate = (name) => {
    const key = `editor.${name}` as TranslationKey;
    const label = t(key);

    return label === key ? humanize(name.replace(/^section_/, '')) : label;
  };

  return {
    schema: translateTitles([...COMMON_FIELDS, ...schema], translate),
    computeLabel: (field) => {
      if (!('selector' in field)) return '';

      return translate(field.label ?? field.name);
    },
  };
};

export const withSize = (form: ConfigForm, sizes: readonly CardSize[]): ConfigForm => {
  const t = createLocalize(editorLanguage());
  const allowed: readonly string[] = sizes;
  const options: SelectOption[] = [
    ...SIZE_SETTINGS.filter((size) => allowed.includes(size)),
    'auto' as const,
  ].map((value) => ({ value, label: t(`editor.size_${value}`) }));
  const field = select('size', options);
  const [first, ...rest] = form.schema;

  if (!first || !('type' in first) || first.type !== 'grid') {
    return { ...form, schema: [field, ...form.schema] };
  }

  return { ...form, schema: [{ ...first, schema: [...first.schema, field] }, ...rest] };
};
