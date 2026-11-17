import { LitElement, css, html, nothing } from 'lit';
import type { CSSResultGroup, PropertyDeclarations, TemplateResult } from 'lit';
import { createLocalize } from '../core/i18n';
import type { Localize } from '../core/i18n';
import type { HomeAssistant } from '../types/ha';
import type {
  ConfigForm,
  ExpandableField,
  FormField,
  GridField,
  ListField,
  SelectorField,
} from './form';
import { loadHaComponents } from './load-ha-components';

export const EDITOR_TAG = 'varta-card-editor';

type Values = Readonly<Record<string, unknown>>;

type ListEntry = readonly [string, ListField];

interface ValueChangedEvent extends Event {
  readonly detail: { readonly value: unknown };
}

interface ExpandedChangedEvent extends Event {
  readonly detail: { readonly expanded: boolean };
}

interface PickerFilter {
  readonly domains?: readonly string[];
  readonly deviceClasses?: readonly string[];
}

interface PickerOptions {
  readonly value: string | undefined;
  readonly label: string;
  readonly required: boolean;
  readonly filter: PickerFilter;
  readonly reset?: boolean;
  readonly onChange: (value: string | undefined) => void;
}

interface View {
  readonly config: Values;
  readonly form: ConfigForm;
  readonly t: Localize;
}

const isRecord = (value: unknown): value is Values =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const strings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === 'string');
};

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const compact = (values: Values): Values =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => !isEmpty(value)));

const resized = (config: Values, values: Values): Values => {
  const options = config.grid_options;

  if (!('size' in values) || !isRecord(options) || !('rows' in options)) return config;

  const rest = Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'rows'));

  return { ...config, grid_options: Object.keys(rest).length > 0 ? rest : undefined };
};

const isGroup = (field: FormField): field is GridField | ExpandableField => 'schema' in field;

const entitySelector = (selector: Values): Values | undefined =>
  isRecord(selector.entity) ? selector.entity : undefined;

const isListField = (value: unknown): value is ListField =>
  isRecord(value) && isRecord(value.selector);

const listEntries = (selector: Values): ListEntry[] | undefined => {
  const object = selector.object;

  if (!isRecord(object) || object.multiple !== true || !isRecord(object.fields)) return undefined;

  return Object.entries(object.fields).filter((entry): entry is [string, ListField] =>
    isListField(entry[1]),
  );
};

const hasPicker = (field: FormField): boolean => {
  if (isGroup(field)) return field.schema.some(hasPicker);
  if (entitySelector(field.selector)) return true;

  return (listEntries(field.selector) ?? []).some(([, item]) => entitySelector(item.selector));
};

const pickerFilter = (entity: Values | undefined): PickerFilter => {
  const filters = Array.isArray(entity?.filter) ? entity.filter : [entity?.filter];
  const records = filters.filter(isRecord);
  const domains = records.flatMap((filter) => strings(filter.domain));
  const deviceClasses = records.flatMap((filter) => strings(filter.device_class));

  return {
    domains: domains.length > 0 ? domains : undefined,
    deviceClasses: deviceClasses.length > 0 ? deviceClasses : undefined,
  };
};

const entityIds = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown) => {
    if (typeof item === 'string') return [item];
    if (isRecord(item) && typeof item.entity === 'string') return [item.entity];

    return [];
  });
};

const listItems = (value: unknown): Values[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown) => {
    if (typeof item === 'string') return [{ entity: item }];

    return isRecord(item) ? [item] : [];
  });
};

const moved = <T>(items: readonly T[], from: number, to: number): T[] => {
  const result = [...items];
  const [item] = result.splice(from, 1);

  if (item !== undefined) result.splice(to, 0, item);

  return result;
};

export class VartaCardEditor extends LitElement {
  static override properties: PropertyDeclarations = {
    hass: { attribute: false },
    form: { attribute: false },
    _config: { state: true },
    _opened: { state: true },
  };

  static override styles: CSSResultGroup = css`
    .stack {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px 8px;
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      color: var(--secondary-text-color);
    }

    ha-form,
    ha-entity-picker {
      display: block;
    }

    ha-expansion-panel {
      display: block;
      --expansion-panel-content-padding: 0;
      border-radius: 6px;
    }

    .content {
      padding: 12px;
    }
  `;

  declare hass: HomeAssistant | undefined;
  declare form: ConfigForm | undefined;
  declare _config: Values | undefined;
  declare _opened: string | undefined;

  setConfig(config: Values): void {
    this._config = config;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void loadHaComponents().then(() => {
      this.requestUpdate();
    });
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const form = this.form;
    const hass = this.hass;

    if (!config || !form || !hass) return nothing;

    const view: View = { config, form, t: createLocalize(hass.locale.language) };

    return html`<div class="stack">
      ${form.schema.map((field) => this._renderField(field, view))}
    </div>`;
  }

  private _renderField(field: FormField, view: View): TemplateResult {
    if (!hasPicker(field)) {
      return this._renderForm([field], view.config, view.form, (value) => {
        this._merge(value);
      });
    }

    if (isGroup(field)) return this._renderGroup(field, view);

    const entity = entitySelector(field.selector);

    if (!entity) return this._renderList(field, listEntries(field.selector) ?? [], view);
    if (entity.multiple === true) return this._renderEntities(field, entity, view);

    const value = view.config[field.name];

    return this._renderPicker({
      value: typeof value === 'string' ? value : undefined,
      label: view.form.computeLabel(field),
      required: field.required === true,
      filter: pickerFilter(entity),
      onChange: (next) => {
        this._merge({ [field.name]: next });
      },
    });
  }

  private _renderGroup(field: GridField | ExpandableField, view: View): TemplateResult {
    const children = field.schema.map((child) => this._renderField(child, view));

    if (field.type === 'grid') return html`<div class="grid">${children}</div>`;

    return html`<ha-expansion-panel outlined .header=${field.title}>
      <div class="content stack">${children}</div>
    </ha-expansion-panel>`;
  }

  private _renderEntities(field: SelectorField, entity: Values, view: View): TemplateResult {
    const ids = entityIds(view.config[field.name]);
    const filter = pickerFilter(entity);

    return html`<div class="group">
      <span>${view.form.computeLabel(field)}</span>
      ${ids.map((id, index) =>
        this._renderPicker({
          value: id,
          label: '',
          required: false,
          filter,
          onChange: (next) => {
            this._changeIds(field.name, (current) =>
              next === undefined
                ? current.filter((_, position) => position !== index)
                : current.map((item, position) => (position === index ? next : item)),
            );
          },
        }),
      )}
      ${this._renderPicker({
        value: undefined,
        label: view.t('editor.add_entity'),
        required: false,
        filter,
        reset: true,
        onChange: (next) => {
          if (next) this._changeIds(field.name, (current) => [...current, next]);
        },
      })}
    </div>`;
  }

  private _renderList(
    field: SelectorField,
    entries: readonly ListEntry[],
    view: View,
  ): TemplateResult {
    const items = listItems(view.config[field.name]);
    const pickers = entries.filter(([, item]) => entitySelector(item.selector));
    const rest: SelectorField[] = entries
      .filter(([, item]) => !entitySelector(item.selector))
      .map(([name, item]) => ({ name, selector: item.selector, required: item.required }));
    const first = pickers[0];

    return html`<div class="group">
      <span>${view.form.computeLabel(field)}</span>
      ${items.map((item, index) =>
        this._renderItem(field.name, item, index, items.length, pickers, rest, view),
      )}
      ${
        first
          ? this._renderPicker({
              value: undefined,
              label: view.t('editor.add_entity'),
              required: false,
              filter: pickerFilter(entitySelector(first[1].selector)),
              reset: true,
              onChange: (next) => {
                if (next) this._addItem(field.name, { [first[0]]: next });
              },
            })
          : nothing
      }
    </div>`;
  }

  private _renderItem(
    name: string,
    item: Values,
    index: number,
    count: number,
    pickers: readonly ListEntry[],
    rest: readonly SelectorField[],
    view: View,
  ): TemplateResult {
    const key = `${name}.${index}`;
    const ids = pickers.flatMap(([field]) => strings(item[field]));
    const title = typeof item.name === 'string' && item.name ? item.name : this._entityName(ids[0]);

    return html`<ha-expansion-panel
      outlined
      .header=${title ?? `#${index + 1}`}
      .secondary=${ids.join(' · ')}
      .expanded=${this._opened === key}
      @expanded-changed=${(event: ExpandedChangedEvent) => {
        if (event.target !== event.currentTarget) return;

        if (event.detail.expanded) this._opened = key;
        else if (this._opened === key) this._opened = undefined;
      }}
    >
      <div class="content stack">
        ${pickers.map(([field, spec]) => {
          const value = item[field];

          return this._renderPicker({
            value: typeof value === 'string' ? value : undefined,
            label: view.form.computeLabel({ name: field, selector: spec.selector }),
            required: spec.required === true,
            filter: pickerFilter(entitySelector(spec.selector)),
            onChange: (next) => {
              this._changeItem(name, index, { [field]: next });
            },
          });
        })}
        ${
          rest.length > 0
            ? this._renderForm(rest, item, view.form, (value) => {
                this._changeItem(name, index, value);
              })
            : nothing
        }
        <div class="actions">
          <ha-icon-button
            .label=${view.t('editor.move_up')}
            .disabled=${index === 0}
            @click=${() => {
              this._moveItem(name, index, index - 1);
            }}
            ><ha-icon icon="mdi:arrow-up"></ha-icon
          ></ha-icon-button>
          <ha-icon-button
            .label=${view.t('editor.move_down')}
            .disabled=${index === count - 1}
            @click=${() => {
              this._moveItem(name, index, index + 1);
            }}
            ><ha-icon icon="mdi:arrow-down"></ha-icon
          ></ha-icon-button>
          <ha-icon-button
            .label=${view.t('editor.remove')}
            @click=${() => {
              this._removeItem(name, index);
            }}
            ><ha-icon icon="mdi:delete-outline"></ha-icon
          ></ha-icon-button>
        </div>
      </div>
    </ha-expansion-panel>`;
  }

  private _renderForm(
    schema: readonly FormField[],
    data: Values,
    form: ConfigForm,
    onChange: (value: Values) => void,
  ): TemplateResult {
    return html`<ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${form.computeLabel}
      @value-changed=${(event: ValueChangedEvent) => {
        event.stopPropagation();

        if (isRecord(event.detail.value)) onChange(event.detail.value);
      }}
    ></ha-form>`;
  }

  private _renderPicker(options: PickerOptions): TemplateResult {
    return html`<ha-entity-picker
      .hass=${this.hass}
      .value=${options.value ?? ''}
      .label=${options.label}
      .helper=${options.value}
      .required=${options.required}
      .includeDomains=${options.filter.domains}
      .includeDeviceClasses=${options.filter.deviceClasses}
      .showEntityId=${true}
      @value-changed=${(event: ValueChangedEvent) => {
        event.stopPropagation();

        const value = event.detail.value;
        const target = event.currentTarget;

        if (options.reset && target instanceof HTMLElement && 'value' in target) target.value = '';

        options.onChange(typeof value === 'string' && value !== '' ? value : undefined);
      }}
    ></ha-entity-picker>`;
  }

  private _entityName(entityId: string | undefined): string | undefined {
    if (!entityId) return undefined;

    return this.hass?.states[entityId]?.attributes.friendly_name ?? entityId;
  }

  private _changeIds(name: string, change: (current: readonly string[]) => string[]): void {
    this._merge({ [name]: change(entityIds(this._config?.[name])) });
  }

  private _changeItem(name: string, index: number, patch: Values): void {
    const items = listItems(this._config?.[name]);

    this._merge({
      [name]: items.map((item, position) =>
        position === index ? compact({ ...item, ...patch }) : item,
      ),
    });
  }

  private _addItem(name: string, item: Values): void {
    const items = listItems(this._config?.[name]);

    this._opened = `${name}.${items.length}`;
    this._merge({ [name]: [...items, item] });
  }

  private _moveItem(name: string, from: number, to: number): void {
    const items = listItems(this._config?.[name]);

    if (to < 0 || to >= items.length) return;

    this._opened = `${name}.${to}`;
    this._merge({ [name]: moved(items, from, to) });
  }

  private _removeItem(name: string, index: number): void {
    const items = listItems(this._config?.[name]);

    this._opened = undefined;
    this._merge({ [name]: items.filter((_, position) => position !== index) });
  }

  private _merge(values: Values): void {
    if (!this._config) return;

    const config = compact(resized({ ...this._config, ...values }, values));

    this._config = config;
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }),
    );
  }
}
