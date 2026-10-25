import { EditorError } from "../shared/EditorError.js";
import { Shape } from "./Shape.js";
import type { ShapeContainer } from "./ShapeContainer.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/**
 * `g` — the composite of the pattern: a shape that is also a container.
 *
 * `Group` adds *no* geometric code. `move`, `scale`, `set` and `delete` are
 * inherited unchanged; the container merely answers `children`, `geometry()`
 * (empty) and recurrence — which is exactly what makes `move node2 0 100`
 * behave identically to `move c1 30 0` from the caller's point of view.
 */
export class Group extends Shape implements ShapeContainer {
  readonly #children: Shape[] = [];

  override readonly typeName = "g";

  constructor(id: string) {
    super(id);
  }

  override get isContainer(): boolean {
    return true;
  }

  override get children(): readonly Shape[] {
    return this.#children;
  }

  /** A container has no geometry of its own: transforms are pushed into children. */
  override geometry(): readonly never[] {
    return [];
  }

  override get containerLabel(): string {
    return this.label;
  }

  override summary(): string {
    return "";
  }

  indexOf(shape: Shape): number {
    return this.#children.indexOf(shape);
  }

  /**
   * Inserts `shape` at `index`.
   *
   * Refuses three ways to create a cycle: the shape is this container, the shape
   * is already inside this container, or the shape is an *ancestor* of this
   * container (which `contains` alone would not catch — it looks down, not up).
   */
  insertChildAt(index: number, shape: Shape): void {
    if (shape === this) {
      throw new EditorError(`cannot add a container to itself: ${shape.id}`);
    }
    if (shape.asContainer()?.contains(this) === true) {
      throw new EditorError(`cannot add a container into its own descendant: ${shape.id}`);
    }
    const bounded = Math.max(0, Math.min(index, this.#children.length));
    this.#children.splice(bounded, 0, shape);
    shape.setParent(this);
  }

  removeChild(shape: Shape): void {
    const index = this.#children.indexOf(shape);
    if (index >= 0) {
      this.#children.splice(index, 1);
    }
  }

  override asContainer(): ShapeContainer {
    return this;
  }

  /** Depth-first: is `shape` this container or one of its descendants? */
  contains(shape: Shape): boolean {
    if (shape === this) {
      return true;
    }
    return this.#children.some(
      (child) => child === shape || (child.asContainer()?.contains(shape) ?? false),
    );
  }

  /** Recursive move: inherited `moveBy` on an empty geometry must propagate. */
  override moveBy(dx: number, dy: number): void {
    for (const child of this.#children) {
      child.moveBy(dx, dy);
    }
  }

  /** Recursive scale: every descendant's coordinates and sizes are multiplied. */
  override scaleBy(factor: number): void {
    for (const child of this.#children) {
      child.scaleBy(factor);
    }
  }

  override toSvgElement(): SvgElementNode {
    const attributes: Record<string, string> = { id: this.id };
    for (const [name, value] of this.attributes.entries()) {
      attributes[name] = value;
    }
    return {
      tag: "g",
      attributes,
      children: this.#children.map((child) => child.toSvgElement()),
    };
  }

  /** Deep copy of the whole subtree, used by undo mementos. */
  override clone(): Group {
    const copy = new Group(this.id);
    copy.attributes.copyFrom(this.attributes);
    for (const child of this.#children) {
      copy.insertChildAt(copy.children.length, child.clone());
    }
    return copy;
  }
}
