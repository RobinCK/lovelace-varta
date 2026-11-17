export interface HassEntityAttributes {
  readonly friendly_name?: string;
  readonly unit_of_measurement?: string;
  readonly device_class?: string;
  readonly state_class?: string;
  readonly icon?: string;
  readonly [key: string]: unknown;
}

export interface HassEntity {
  readonly entity_id: string;
  readonly state: string;
  readonly attributes: HassEntityAttributes;
  readonly last_changed: string;
  readonly last_updated: string;
}

export type HassEntities = Readonly<Record<string, HassEntity | undefined>>;

export type NumberFormat =
  'language' | 'system' | 'comma_decimal' | 'decimal_comma' | 'space_comma' | 'none';

export type TimeFormat = 'language' | 'system' | '12' | '24';

export type Weekday =
  'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface HassLocale {
  readonly language: string;
  readonly number_format?: NumberFormat;
  readonly time_format?: TimeFormat;
  readonly first_weekday?: Weekday | 'language';
}

export interface HassThemes {
  readonly darkMode?: boolean;
}

export interface HassConfig {
  readonly time_zone?: string;
  readonly currency?: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export type Unsubscribe = () => void;

export interface HassConnection {
  subscribeMessage<T>(
    callback: (message: T) => void,
    subscription: Readonly<Record<string, unknown>>,
  ): Promise<Unsubscribe>;
}

export interface HassEntityRegistryEntry {
  readonly entity_id: string;
  readonly device_id?: string | null;
  readonly area_id?: string | null;
  readonly platform?: string;
  readonly name?: string | null;
  readonly hidden?: boolean;
  readonly entity_category?: string | null;
  readonly icon?: string | null;
}

export interface HassDevice {
  readonly id: string;
  readonly name?: string | null;
  readonly name_by_user?: string | null;
  readonly area_id?: string | null;
  readonly model?: string | null;
  readonly manufacturer?: string | null;
  readonly via_device_id?: string | null;
  readonly config_entries?: readonly string[];
  readonly primary_config_entry?: string | null;
  readonly disabled_by?: string | null;
  readonly entry_type?: string | null;
}

export interface HassArea {
  readonly area_id: string;
  readonly name: string;
}

export interface HassUser {
  readonly is_admin?: boolean;
}

export interface HomeAssistant {
  readonly states: HassEntities;
  readonly entities?: Readonly<Record<string, HassEntityRegistryEntry | undefined>>;
  readonly devices?: Readonly<Record<string, HassDevice | undefined>>;
  readonly areas?: Readonly<Record<string, HassArea | undefined>>;
  readonly user?: HassUser;
  readonly localize?: (key: string) => string;
  readonly locale: HassLocale;
  readonly language: string;
  readonly themes?: HassThemes;
  readonly config?: HassConfig;
  readonly connection?: HassConnection;
  formatEntityState?: (stateObj: HassEntity, state?: string) => string;
  callWS<T>(message: Readonly<Record<string, unknown>>): Promise<T>;
  callApi?<T>(method: 'GET' | 'POST', path: string): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Readonly<Record<string, unknown>>,
  ): Promise<unknown>;
}

export interface LovelaceGridOptions {
  readonly columns?: number | 'full';
  readonly rows?: number | 'auto';
  readonly min_columns?: number;
  readonly max_columns?: number;
  readonly min_rows?: number;
  readonly max_rows?: number;
}

export interface CustomCardEntry {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly preview?: boolean;
  readonly documentationURL?: string;
}
