import { Numbers } from "../shared/Numbers.js";
import { NumericAttribute } from "./NumericAttribute.js";
import { Shape } from "./Shape.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/** `circle` — centre plus radius. */
export class Circle extends Shape {
  override readonly typeName = "circle";

  readonly #cx: NumericAttribute;
  readonly #cy: NumericAttribute;
  readonly #r: NumericAttribute;

  constructor(id: string, cx: number, cy: number, r: number) {
    super(id);
    this.#cx = new NumericAttribute("cx", "cx", "x", cx);
    this.#cy = new NumericAttribute("cy", "cy", "y", cy);
    this.#r = new NumericAttribute("r", "r", "size", r);
  }

  override geometry(): readonly NumericAttribute[] {
    return [this.#cx, this.#cy, this.#r];
  }

  override toSvgElement(): SvgElementNode {
    return {
      tag: "circle",
      attributes: this.elementAttributes({
        cx: Numbers.format(this.#cx.get()),
        cy: Numbers.format(this.#cy.get()),
        r: Numbers.format(this.#r.get()),
      }),
    };
  }

  override clone(): Circle {
    const copy = new Circle(this.id, this.#cx.get(), this.#cy.get(), this.#r.get());
    copy.attributes.copyFrom(this.attributes);
    return copy;
  }
}
