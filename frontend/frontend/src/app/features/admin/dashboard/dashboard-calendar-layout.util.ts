/** Track an element's height for syncing the upcoming-events panel with the calendar. */
export function observePanelHeight(
  element: HTMLElement | undefined,
  onHeight: (height: number) => void,
): () => void {
  if (!element || typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  const update = () => onHeight(element.offsetHeight);
  const observer = new ResizeObserver(update);
  observer.observe(element);
  update();

  return () => observer.disconnect();
}
