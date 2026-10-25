import { EditorError } from "../shared/EditorError.js";
import { Numbers } from "../shared/Numbers.js";

/**
 * One numeric attribute a shape really owns (`x`, `width`, `cx`, ...).
 *
 * Keeping geometry in these cells — instead of loose number fields — is what
 * lets `Shape.moveBy` / `scaleBy` stay type-agnostic: they iterate the cells a
 * shape reports and never ask "which shape are you?".
 *
 * `axis` drives Composite behaviour: `x`/`y` cells are translated by `move`
 * (line endpoints included), `size` cells are only ever multiplied by `scale`
 * and are the only kind that must stay positive.
 */
export class NumericAttribute {
  #value: number;

  constructor(
    /** SVG attribute name, e.g. `width`. */
    readonly name: string,
    /** Short label used by `tree`, e.g. `w`. */
    readonly alias: string,
    /** How `move` treats the cell; `scale` always multiplies it. */
    readonly axis: "x" | "y" | "size",
    initial: number,
  ) {
    this.#value = initial;
  }

  get isSize(): boolean {
    return this.axis === "size";
  }

  get(): number {
    return this.#value;
  }

  set(value: number): void {
    this.#value = value;
  }

  /** Parses a `set` operand that targets this cell. */
  assign(text: string): void {
    const trimmed = text.trim();
    const numeric = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(numeric)) {
      throw new EditorError(`invalid number: ${text}`);
    }
    if (this.isSize && numeric <= 0) {
      throw new EditorError(`value must be positive: ${text}`);
    }
    this.#value = numeric;
  }

  /** `w=160` — the `tree` fragment for this cell. */
  get summary(): string {
    return `${this.alias}=${Numbers.format(this.#value)}`;
  }

  /** `width=160` — the `show` fragment for this cell. */
  get detail(): string {
    return `${this.name}=${Numbers.format(this.#value)}`;
  }
}
