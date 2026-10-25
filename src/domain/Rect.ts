import { Numbers } from "../shared/Numbers.js";
import { NumericAttribute } from "./NumericAttribute.js";
import { Shape } from "./Shape.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/** `rect` — top-left corner plus size. */
export class Rect extends Shape {
  override readonly typeName = "rect";

  readonly #x: NumericAttribute;
  readonly #y: NumericAttribute;
  readonly #width: NumericAttribute;
  readonly #height: NumericAttribute;

  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.#x = new NumericAttribute("x", "x", "x", x);
    this.#y = new NumericAttribute("y", "y", "y", y);
    this.#width = new NumericAttribute("width", "w", "size", width);
    this.#height = new NumericAttribute("height", "h", "size", height);
  }

  override geometry(): readonly NumericAttribute[] {
    return [this.#x, this.#y, this.#width, this.#height];
  }

  override toSvgElement(): SvgElementNode {
    return {
      tag: "rect",
      attributes: this.elementAttributes({
        x: Numbers.format(this.#x.get()),
        y: Numbers.format(this.#y.get()),
        width: Numbers.format(this.#width.get()),
        height: Numbers.format(this.#height.get()),
      }),
    };
  }

  override clone(): Rect {
    const copy = new Rect(this.id, this.#x.get(), this.#y.get(), this.#width.get(), this.#height.get());
    copy.attributes.copyFrom(this.attributes);
    return copy;
  }
}
