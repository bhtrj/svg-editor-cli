import { EditorError } from "../shared/EditorError.js";
import { formatNumber } from "../shared/Numbers.js";
import { AttributeBag } from "./AttributeBag.js";
import type { NumericAttribute } from "./NumericAttribute.js";
import { Point } from "./Point.js";
import type { ShapeContainer } from "./ShapeContainer.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/** Attributes every shape accepts through `set`, whatever its type. */
const PAINT_ATTRIBUTES = ["fill", "stroke", "stroke-width"] as const;

/**
 * Abstract base of the shape tree — the `Component` of the Composite pattern.
 *
 * It owns everything type-independent: identity, paint, the parent link,
 * attributes read from foreign files, the `set` whitelist machinery and the
 * `tree` / `show` rendering. Subclasses contribute geometry cells,
 * serialisation, and — rarely — extra settable attributes (`text` content).
 */
export abstract class Shape {
  readonly id: string;
  readonly attributes = new AttributeBag();
  #parent: ShapeContainer | null = null;

  constructor(id: string) {
    this.id = id;
  }

  /** CLI / SVG type name, e.g. `rect`. */
  abstract readonly typeName: string;

  /** This shape's own geometry cells, in the order `show` prints them. */
  abstract geometry(): readonly NumericAttribute[];

  /** The equivalent SVG element, painted with this shape's attributes. */
  abstract toSvgElement(): SvgElementNode;

  /** Deep copy, used by undo mementos and by `group` re-parenting. */
  abstract clone(): Shape;

  get parent(): ShapeContainer | null {
    return this.#parent;
  }

  setParent(parent: ShapeContainer | null): void {
    this.#parent = parent;
  }

  get isContainer(): boolean {
    return false;
  }

  /** Children of a container; always empty for leaves. */
  get children(): readonly Shape[] {
    return [];
  }

  /** `rect#r1` — the notation every feedback line uses. */
  get label(): string {
    return `${this.typeName}#${this.id}`;
  }

  /** How this shape is named when it acts as a parent (`g#markers`). */
  get containerLabel(): string {
    return this.label;
  }

  /**
   * The container view of this shape, or `null` for leaves.
   *
   * Avoids `instanceof Group` checks outside the domain: callers ask a shape
   * whether it can hold children instead of interrogating its class.
   */
  asContainer(): ShapeContainer | null {
    return null;
  }

  /**
   * The point `move` reports: top-left for rect/text, centre for
   * circle/ellipse, start point for line.
   */
  anchor(): Point {
    const x = this.valueOf("x") ?? this.valueOf("cx") ?? this.valueOf("x1") ?? 0;
    const y = this.valueOf("y") ?? this.valueOf("cy") ?? this.valueOf("y1") ?? 0;
    return new Point(x, y);
  }

  /** Reads a geometry cell by SVG attribute name, if this shape owns it. */
  valueOf(name: string): number | undefined {
    return this.geometry().find((cell) => cell.name === name)?.get();
  }

  /** The far end of a line; `null` for every other shape. */
  oppositeAnchor(): Point | null {
    return null;
  }

  /** Owns this geometry attribute name? */
  ownsGeometry(name: string): boolean {
    return this.geometry().some((cell) => cell.name === name);
  }

  /** True when `name` may be passed to `set` on this shape. */
  canSet(name: string): boolean {
    return (
      (PAINT_ATTRIBUTES as readonly string[]).includes(name) ||
      this.ownsGeometry(name) ||
      this.ownsOwnAttribute(name)
    );
  }

  /**
   * Translates the shape. `move` and its inverse both go through here, so a
   * container can never drift out of sync with its children.
   */
  moveBy(dx: number, dy: number): void {
    for (const cell of this.geometry()) {
      if (cell.axis === "x") {
        cell.set(cell.get() + dx);
      } else if (cell.axis === "y") {
        cell.set(cell.get() + dy);
      }
    }
  }

  /** Multiplies every geometry value — positions *and* sizes — by `factor`. */
  scaleBy(factor: number): void {
    for (const cell of this.geometry()) {
      cell.set(cell.get() * factor);
    }
  }

  /**
   * Applies one `set` request: paint is generic, own geometry comes from
   * `geometry()`, everything else is delegated to the subclass.
   */
  setAttribute(name: string, value: string): void {
    if ((PAINT_ATTRIBUTES as readonly string[]).includes(name)) {
      this.attributes.set(name, value);
      return;
    }
    const cell = this.geometry().find((candidate) => candidate.name === name);
    if (cell !== undefined) {
      const numeric = parseNumeric(value);
      if (cell.isSize && numeric <= 0) {
        throw new EditorError(`value must be positive: ${value}`);
      }
      cell.set(numeric);
      return;
    }
    if (this.setOwnAttribute(name, value)) {
      return;
    }
    throw new EditorError(`unknown attribute: ${name}`);
  }

  /** Reads a settable attribute back, for feedback lines. */
  readAttribute(name: string): string | undefined {
    const own = this.readOwnAttribute(name);
    if (own !== undefined) {
      return own;
    }
    const cell = this.geometry().find((candidate) => candidate.name === name);
    if (cell !== undefined) {
      return formatNumber(cell.get());
    }
    return this.attributes.get(name);
  }

  /** Inline summary for `tree`, e.g. `x=200 y=80 w=60 h=60 fill=#3366ff`. */
  summary(): string {
    const chunks = this.geometry().map((cell) => cell.summary);
    const fill = this.attributes.get("fill");
    if (fill !== undefined) {
      chunks.push(`fill=${fill}`);
    }
    return chunks.join(" ");
  }

  /** Body of `show`: geometry, then paint, then subclass extras. */
  details(): readonly string[] {
    const lines: string[] = [];
    const geometry = this.geometry()
      .map((cell) => cell.detail)
      .join(" ");
    if (geometry !== "") {
      lines.push(geometry);
    }
    for (const [name, value] of this.attributes.entries()) {
      lines.push(`${name}=${value}`);
    }
    lines.push(...this.ownDetailLines());
    return lines;
  }

  /**
   * Serialised element attributes in the canonical order the assignment's
   * examples use: `id`, geometry, then paint.
   */
  protected elementAttributes(geometry: Record<string, string>): Record<string, string> {
    const attributes: Record<string, string> = { id: this.id, ...geometry };
    for (const [name, value] of this.attributes.entries()) {
      attributes[name] = value;
    }
    return attributes;
  }

  /** Subclass hook for attributes that are neither paint nor geometry. */
  protected setOwnAttribute(_name: string, _value: string): boolean {
    return false;
  }

  protected readOwnAttribute(_name: string): string | undefined {
    return undefined;
  }

  protected ownsOwnAttribute(_name: string): boolean {
    return false;
  }

  protected ownDetailLines(): readonly string[] {
    return [];
  }
}

function parseNumeric(value: string): number {
  const trimmed = value.trim();
  const numeric = Number(trimmed);
  if (trimmed === "" || !Number.isFinite(numeric)) {
    throw new EditorError(`invalid number: ${value}`);
  }
  return numeric;
}
