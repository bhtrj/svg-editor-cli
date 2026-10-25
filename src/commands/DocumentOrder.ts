import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";

/**
 * Depth-first document order of every shape (z-order for siblings).
 *
 * Shared by `group` (to keep relative order) and by `front` / `back` tests, so
 * the notion of "document order" is defined once.
 */
export function documentOrder(document: SvgDocument): Shape[] {
  return [...document.walk()];
}

/** Sorts shapes into document order, ignoring ids that are not present. */
export function sortByDocumentOrder(document: SvgDocument, shapes: readonly Shape[]): Shape[] {
  const order = new Map<Shape, number>();
  documentOrder(document).forEach((shape, index) => {
    order.set(shape, index);
  });
  return [...shapes].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
}
