export const openMoreInfo = (node: HTMLElement, entityId: string | undefined): void => {
  if (!entityId) return;

  node.dispatchEvent(
    new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true,
    }),
  );
};

export const navigate = (node: HTMLElement, path: string): void => {
  window.history.pushState(null, '', path);
  node.dispatchEvent(
    new CustomEvent('location-changed', {
      detail: { replace: false },
      bubbles: true,
      composed: true,
    }),
  );
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
};
