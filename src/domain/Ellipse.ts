import { Numbers } from "../shared/Numbers.js";
import { NumericAttribute } from "./NumericAttribute.js";
import { Shape } from "./Shape.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/** `ellipse` — centre plus two radii. */
export class Ellipse extends Shape {
  override readonly typeName = "ellipse";

  readonly #cx: NumericAttribute;
  readonly #cy: NumericAttribute;
  readonly #rx: NumericAttribute;
  readonly #ry: NumericAttribute;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.#cx = new NumericAttribute("cx", "cx", "x", cx);
    this.#cy = new NumericAttribute("cy", "cy", "y", cy);
    this.#rx = new NumericAttribute("rx", "rx", "size", rx);
    this.#ry = new NumericAttribute("ry", "ry", "size", ry);
  }

  override geometry(): readonly NumericAttribute[] {
    return [this.#cx, this.#cy, this.#rx, this.#ry];
  }

  override toSvgElement(): SvgElementNode {
    return {
      tag: "ellipse",
      attributes: this.elementAttributes({
        cx: Numbers.format(this.#cx.get()),
        cy: Numbers.format(this.#cy.get()),
        rx: Numbers.format(this.#rx.get()),
        ry: Numbers.format(this.#ry.get()),
      }),
    };
  }

  override clone(): Ellipse {
    const copy = new Ellipse(
      this.id,
      this.#cx.get(),
      this.#cy.get(),
      this.#rx.get(),
      this.#ry.get(),
    );
    copy.attributes.copyFrom(this.attributes);
    return copy;
  }
}
