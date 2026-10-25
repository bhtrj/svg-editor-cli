import type { Shape } from "./Shape.js";
import type { ShapeTypeSpec } from "./ShapeTypeSpec.js";

/**
 * A shape type contributed by a plugin — §4.4's `ShapeProvider` slot.
 *
 * The kernel never names a plugin type: `ShapeFactory` looks it up here, which
 * keeps "dispatch by type name" inside the factory, the single place the
 * assignment allows for shapes.
 *
 * A provider may also own a *composite*: a container whose internal structure
 * (its child parts) is the provider's business, not the user's. Such a shape
 * refuses `ungroup` (`cannot ungroup composite shape`, §4.2) and marks its
 * serialised element with `data-kind`, so a reader that has the plugin restores
 * the composite and a reader without it degrades to a plain `<g>` (§4.4).
 */
export interface ShapeProvider {
  /** CLI type name, e.g. `box`. */
  readonly typeName: string;
  /** The `data-kind` marker written on the serialised container. */
  readonly kind: string;
  /** `create` parameters, so `CreateCommand` needs no plugin knowledge. */
  readonly spec: ShapeTypeSpec;

  /** Builds the composite with its provider-supplied parts (CLI `create`). */
  create(id: string, values: ReadonlyMap<string, string>): Shape;

  /**
   * Builds an *empty* composite for a `data-kind`-marked element; the reader
   * then inserts the file's own children, so a round-trip preserves them.
   */
  restore(id: string): Shape;
}
