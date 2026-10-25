import { Numbers } from "../shared/Numbers.js";
import { NumericAttribute } from "./NumericAttribute.js";
import { Point } from "./Point.js";
import { Shape } from "./Shape.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/**
 * `line` — two endpoints.
 *
 * A line has no "size": both endpoints are coordinates, so `scale` multiplies
 * both points and `move` translates both, which is exactly the Composite rule
 * applied to a shape whose geometry happens to be four coordinates.
 */
export class Line extends Shape {
  override readonly typeName = "line";

  readonly #x1: NumericAttribute;
  readonly #y1: NumericAttribute;
  readonly #x2: NumericAttribute;
  readonly #y2: NumericAttribute;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.#x1 = new NumericAttribute("x1", "x1", "x", x1);
    this.#y1 = new NumericAttribute("y1", "y1", "y", y1);
    this.#x2 = new NumericAttribute("x2", "x2", "x", x2);
    this.#y2 = new NumericAttribute("y2", "y2", "y", y2);
  }

  override geometry(): readonly NumericAttribute[] {
    return [this.#x1, this.#y1, this.#x2, this.#y2];
  }

  override anchor(): Point {
    return new Point(this.#x1.get(), this.#y1.get());
  }

  /** The far end, so `tree` can print `(280,130) -> (520,130)`. */
  override oppositeAnchor(): Point {
    return new Point(this.#x2.get(), this.#y2.get());
  }
  /** A line's natural tree summary is the span, not `x1=… y1=…`. */
  override summary(): string {
    const end = this.oppositeAnchor();
    return end === null ? this.anchor().label : Point.span(this.anchor(), end);
  }

  override toSvgElement(): SvgElementNode {
    return {
      tag: "line",
      attributes: this.elementAttributes({
        x1: Numbers.format(this.#x1.get()),
        y1: Numbers.format(this.#y1.get()),
        x2: Numbers.format(this.#x2.get()),
        y2: Numbers.format(this.#y2.get()),
      }),
    };
  }

  override clone(): Line {
    const copy = new Line(
      this.id,
      this.#x1.get(),
      this.#y1.get(),
      this.#x2.get(),
      this.#y2.get(),
    );
    copy.attributes.copyFrom(this.attributes);
    return copy;
  }
}
