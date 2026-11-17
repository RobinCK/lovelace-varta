import type { CustomCardEntry } from './types/ha';

declare global {
  const __VARTA_VERSION__: string;

  interface Window {
    customCards?: CustomCardEntry[];
  }
}

export {};
