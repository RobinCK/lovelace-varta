interface CardHelpers {
  createCardElement(config: Readonly<Record<string, unknown>>): HTMLElement;
}

interface EditableCard extends CustomElementConstructor {
  getConfigElement?: () => unknown;
}

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
  }
}

const SOURCES: Readonly<Record<string, string>> = {
  'ha-form': 'button',
  'ha-entity-picker': 'entities',
  'ha-expansion-panel': 'tile',
};

const loadEditorOf = async (helpers: CardHelpers, type: string): Promise<void> => {
  const tag = `hui-${type}-card`;

  if (!customElements.get(tag)) helpers.createCardElement({ type });

  const card: EditableCard | undefined = customElements.get(tag);

  await card?.getConfigElement?.();
};

export const loadHaComponents = async (): Promise<void> => {
  const missing = Object.entries(SOURCES).filter(([tag]) => !customElements.get(tag));

  if (missing.length === 0) return;

  const helpers = await window.loadCardHelpers?.();

  if (!helpers) return;

  await Promise.all(missing.map(([, type]) => loadEditorOf(helpers, type)));
};
