/**
 * Declarative description of one shape type's `create` parameters.
 *
 * The factory publishes these specs so `CreateCommand` can pull arguments from
 * the token stream without a per-type `switch`: the type dispatch exists in
 * exactly one place (the factory), as the assignment requires.
 */
export interface ParamSpec {
  /** Attribute name on the shape (`x`) or `content` for a text node. */
  readonly name: string;
  readonly kind: "number" | "positive" | "text" | "paint";
  /** Optional trailing parameter (fill / stroke). */
  readonly optional?: boolean;
}

export interface ShapeTypeSpec {
  readonly type: string;
  readonly params: readonly ParamSpec[];
}
