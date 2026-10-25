import { EditorError } from "../shared/EditorError.js";
import { Numbers } from "../shared/Numbers.js";
import type { Shape } from "./Shape.js";
import type { ShapeContainer } from "./ShapeContainer.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/** Default canvas, per §3 of the assignment (`init` with no arguments). */
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * The document root — the `svg` element and the root container.
 *
 * It is deliberately *not* a `Group`: the root is not addressable, so no
 * `delete` / `move` / `set` can target it, yet it implements `ShapeContainer`
 * so `create ... in` and `group` treat it like any other parent.
 */
export class SvgDocument implements ShapeContainer {
  readonly #children: Shape[] = [];
  #width: number;
  #height: number;

  constructor(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
    SvgDocument.validateSize(width);
    SvgDocument.validateSize(height);
    this.#width = width;
    this.#height = height;
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  /** Replaces the canvas size; both values must be positive. */
  resize(width: number, height: number): void {
    SvgDocument.validateSize(width);
    SvgDocument.validateSize(height);
    this.#width = width;
    this.#height = height;
  }

  private static validateSize(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new EditorError(`value must be positive: ${value}`);
    }
  }

  get children(): readonly Shape[] {
    return this.#children;
  }

  /** `svg` — how the root appears as a parent in `show` and undo messages. */
  get containerLabel(): string {
    return "svg";
  }

  /** `svg (800x600)` — the `tree` root line and the `init` feedback. */
  get label(): string {
    return `svg (${Numbers.format(this.#width)}x${Numbers.format(this.#height)})`;
  }

  indexOf(shape: Shape): number {
    return this.#children.indexOf(shape);
  }

  insertChildAt(index: number, shape: Shape): void {
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

  contains(shape: Shape): boolean {
    return this.#children.some(
      (child) => child === shape || (child.asContainer()?.contains(shape) ?? false),
    );
  }

  /** Depth-first walk over every shape, in document (z-)order. */
  *walk(): Generator<Shape> {
    const visit = function* (children: readonly Shape[]): Generator<Shape> {
      for (const child of children) {
        yield child;
        if (child.isContainer) {
          yield* visit(child.children);
        }
      }
    };
    yield* visit(this.#children);
  }

  /** Depth-first lookup by id, or `null`. */
  find(id: string): Shape | null {
    for (const shape of this.walk()) {
      if (shape.id === id) {
        return shape;
      }
    }
    return null;
  }

  /** The container holding `shape`, or `null` if `shape` is not in this tree. */
  containerOf(shape: Shape): ShapeContainer | null {
    return shape.parent;
  }

  /** How many `<rect>`, `<circle>`… the document holds — `save` reports it. */
  get elementCount(): number {
    let count = 0;
    for (const _shape of this.walk()) {
      count += 1;
    }
    return count;
  }

  /** Replaces the whole tree; used by `read` and by undo after an edit. */
  replaceChildren(shapes: readonly Shape[]): void {
    this.#children.length = 0;
    for (const shape of shapes) {
      this.insertChildAt(this.#children.length, shape);
    }
  }

  /** Detached deep copy of the tree, for mementos. */
  snapshotChildren(): Shape[] {
    return this.#children.map((child) => child.clone());
  }

  /**
   * Sorts `shapes` into document order (depth-first, z-order within siblings).
   *
   * `group` uses this so members keep their relative order; living on the
   * document keeps the definition of "document order" in one place rather than
   * in a loose helper next to the command.
   */
  sortInDocumentOrder(shapes: readonly Shape[]): Shape[] {
    const index = new Map<Shape, number>();
    let position = 0;
    for (const shape of this.walk()) {
      index.set(shape, position);
      position += 1;
    }
    return [...shapes].sort((left, right) => (index.get(left) ?? 0) - (index.get(right) ?? 0));
  }

  toSvgElement(): SvgElementNode {
    return {
      tag: "svg",
      attributes: {
        xmlns: "http://www.w3.org/2000/svg",
        width: Numbers.format(this.#width),
        height: Numbers.format(this.#height),
        viewBox: `0 0 ${Numbers.format(this.#width)} ${Numbers.format(this.#height)}`,
      },
      children: this.#children.map((child) => child.toSvgElement()),
    };
  }
}
