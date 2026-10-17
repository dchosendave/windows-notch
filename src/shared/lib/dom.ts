/** True when keyboard input belongs to a field or an open select, so the notch must not auto-collapse. */
export function isEditingElement(element: Element | null) {
  if (element instanceof HTMLInputElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLTextAreaElement) return true;
  const selectPart = element?.closest<HTMLElement>('[data-slot^="select-"]');
  if (!selectPart) return false;
  return selectPart.dataset.slot !== "select-trigger" || selectPart.hasAttribute("data-popup-open");
}
