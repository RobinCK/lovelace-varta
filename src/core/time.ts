import type { HassLocale, Weekday } from '../types/ha';

export const startOfDay = (time: number): number => {
  const date = new Date(time);

  date.setHours(0, 0, 0, 0);

  return date.getTime();
};

export const addDays = (time: number, days: number): number => {
  const date = new Date(time);

  date.setDate(date.getDate() + days);

  return date.getTime();
};

export const addMonths = (time: number, months: number): number => {
  const date = new Date(time);

  date.setMonth(date.getMonth() + months, 1);

  return date.getTime();
};

export const startOfMonth = (time: number): number => {
  const date = new Date(startOfDay(time));

  date.setDate(1);

  return date.getTime();
};

export const startOfYear = (time: number): number => {
  const date = new Date(startOfMonth(time));

  date.setMonth(0);

  return date.getTime();
};

const WEEKDAYS: readonly Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

interface WeekInfo {
  readonly firstDay?: number;
}

type WeekLocale = Intl.Locale & {
  readonly weekInfo?: WeekInfo;
  readonly getWeekInfo?: () => WeekInfo;
};

const languageWeekday = (language: string): number => {
  try {
    const locale: WeekLocale = new Intl.Locale(language);
    const firstDay = (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay;

    return firstDay === undefined ? 1 : firstDay % 7;
  } catch {
    return 1;
  }
};

export const firstWeekday = (locale: HassLocale | undefined): number => {
  const setting = locale?.first_weekday;

  if (setting && setting !== 'language') return WEEKDAYS.indexOf(setting);

  return languageWeekday(locale?.language ?? 'en');
};

export const startOfWeek = (time: number, firstDay = 1): number => {
  const date = new Date(startOfDay(time));
  const shift = (date.getDay() - firstDay + 7) % 7;

  date.setDate(date.getDate() - shift);

  return date.getTime();
};

export const daysInMonth = (time: number): number => {
  const date = new Date(time);

  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const hourOfDay = (time: number): number => new Date(time).getHours();

export const parseClock = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());

  if (!match) return fallback;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 24 || minutes > 59) return fallback;

  return hours * 60 + minutes;
};
