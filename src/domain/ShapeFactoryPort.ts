import type { Shape } from "./Shape.js";

/**
 * The minimal factory surface the SVG reader needs to turn a parsed `<rect …>`
 * into a domain object.
 *
 * The reader must not know the concrete shape classes (that knowledge lives in
 * the factory, which is one of the two sanctioned "dispatch by name" points),
 * and the domain must not import the app layer — hence this port.
 */
export interface ShapeFactoryPort {
  /** True when this editor has a shape type for the SVG tag. */
  supports(tag: string): boolean;
  /**
   * Builds a shape from an SVG element's attributes.
   * @throws EditorError when a required attribute is not a number.
   */
  createFromAttributes(tag: string, attributes: ReadonlyMap<string, string>): Shape;
  /**
   * Rebuilds a plugin composite whose element carries `data-kind` (§4.4), with no
   * parts of its own — the reader inserts the file's children afterwards.
   *
   * Returns `null` when no loaded plugin claims the kind, so the element degrades
   * to a plain container.
   */
  restoreComposite(kind: string, id: string): Shape | null;
}
