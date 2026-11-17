import { VartaBatteriesCard } from './cards/batteries/batteries-card';
import { VartaDevicesCard } from './cards/devices/devices-card';

export interface CardDefinition {
  readonly type: string;
  readonly element: CustomElementConstructor;
  readonly name: string;
  readonly description: string;
}

export const CARDS: readonly CardDefinition[] = [
  {
    type: 'varta-devices-card',
    element: VartaDevicesCard,
    name: 'Varta · Offline devices',
    description:
      'Offline devices grouped by the hub or integration behind them, with ignore until they are back.',
  },
  {
    type: 'varta-batteries-card',
    element: VartaBatteriesCard,
    name: 'Varta · Batteries',
    description:
      'Battery devices by urgency with a replacement forecast, the last replacement and what to buy.',
  },
];
