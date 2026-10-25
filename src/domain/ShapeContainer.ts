import type { Shape } from "./Shape.js";

/**
 * One shape that owns the given shape: the document root (`SvgDocument`) or a
 * `Group`. Declaring this as an interface — rather than making the root a
 * `Group` subclass — keeps the root unaddressable: no command can `delete` or
 * `move` `svg` itself, yet both containers share one child-management API.
 */
export interface ShapeContainer {
  /** How this container is printed in feedback (`svg`, `g#markers`). */
  readonly containerLabel: string;
  readonly children: readonly Shape[];
  indexOf(shape: Shape): number;
  insertChildAt(index: number, shape: Shape): void;
  removeChild(shape: Shape): void;
  /** True when `shape` is this container or one of its descendants. */
  contains(shape: Shape): boolean;
}
