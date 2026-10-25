import { Numbers } from "../shared/Numbers.js";
import { NumericAttribute } from "./NumericAttribute.js";
import { Shape } from "./Shape.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/**
 * `text` — an anchor point plus the text content.
 *
 * The content is a child text node in SVG (not an attribute), so it is not a
 * `NumericAttribute`; it is a fourth settable attribute (`set t1 text "…"`)
 * exposed through the `setOwnAttribute` hook of `Shape`.
 */
export class Text extends Shape {
  override readonly typeName = "text";

  readonly #x: NumericAttribute;
  readonly #y: NumericAttribute;
  #content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.#x = new NumericAttribute("x", "x", "x", x);
    this.#y = new NumericAttribute("y", "y", "y", y);
    this.#content = content;
  }

  get content(): string {
    return this.#content;
  }

  override geometry(): readonly NumericAttribute[] {
    return [this.#x, this.#y];
  }

  /** `(20,40) "My Diagram"` — text is shown by position and content. */
  override summary(): string {
    return `${this.anchor().label} "${this.#content}"`;
  }

  /** `set t1 text "…"` is the text-specific attribute. */
  protected override setOwnAttribute(name: string, value: string): boolean {
    if (name !== "text") {
      return false;
    }
    this.#content = value;
    return true;
  }

  protected override readOwnAttribute(name: string): string | undefined {
    return name === "text" ? this.#content : undefined;
  }

  protected override ownsOwnAttribute(name: string): boolean {
    return name === "text";
  }

  protected override ownDetailLines(): readonly string[] {
    return [`text="${this.#content}"`];
  }

  override toSvgElement(): SvgElementNode {
    return {
      tag: "text",
      attributes: this.elementAttributes({
        x: Numbers.format(this.#x.get()),
        y: Numbers.format(this.#y.get()),
      }),
      text: this.#content,
    };
  }

  override clone(): Text {
    const copy = new Text(this.id, this.#x.get(), this.#y.get(), this.#content);
    copy.attributes.copyFrom(this.attributes);
    return copy;
  }
}
