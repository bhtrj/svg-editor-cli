/**
 * A resolved SVG element, produced by the domain (`Shape.toSvgElement`) and
 * consumed by the writer. Keeping the tree in the domain avoids a visitor that
 * would have to branch on the shape type again.
 */
export interface SvgElementNode {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  /** Text content, for `<text>`. */
  readonly text?: string;
  readonly children?: readonly SvgElementNode[];
}
