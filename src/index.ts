import { REPOSITORY_URL, VERSION } from './const';
import { CARDS } from './registry';
import { EDITOR_TAG, VartaCardEditor } from './ui/editor';

const define = (tag: string, element: CustomElementConstructor): void => {
  if (customElements.get(tag)) return;

  customElements.define(tag, element);
};

define(EDITOR_TAG, VartaCardEditor);

window.customCards ??= [];

for (const card of CARDS) {
  define(card.type, card.element);

  if (!window.customCards.some((entry) => entry.type === card.type)) {
    window.customCards.push({
      type: card.type,
      name: card.name,
      description: card.description,
      preview: true,
      documentationURL: `${REPOSITORY_URL}#${card.type}`,
    });
  }
}

console.info(
  `%c VARTA %c v${VERSION} `,
  'color: #15181c; background: #4ade9b; font-weight: 700;',
  'color: #4ade9b; background: #15181c; font-weight: 700;',
);
