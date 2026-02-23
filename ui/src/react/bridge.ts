import { createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";

const roots = new WeakMap<HTMLElement, Root>();

export function mountReact<P extends Record<string, unknown>>(
  container: HTMLElement,
  Component: ComponentType<P>,
  props: P,
): void {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(createElement(Component, props));
}

export function unmountReact(container: HTMLElement): void {
  const root = roots.get(container);
  if (root) {
    root.unmount();
    roots.delete(container);
  }
}
