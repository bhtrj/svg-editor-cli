import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { TreeRow } from "./TreeRow.js";

/** Spaces between the widest label of a tree and the start of every summary. */
const COLUMN_GAP = 2;

/**
 * Renders the `tree` view (§5.1) — a box-drawing outline with geometry inlined.
 *
 * Alignment uses **one column for the whole tree**: the widest
 * `prefix + label` among the rows that carry a summary, plus two spaces. That is
 * what the assignment's own examples show — in §6 every summary starts at column
 * 19, in the `read other.svg` example likewise (measured, not guessed) — and it
 * still keeps a deep tree readable, because a row whose prefix is long simply has
 * less room left before the column.
 *
 * A per-sibling column was tried first and produced column 16 for the top level
 * of §6, i.e. it did not match the brief's transcript; see doc/README.md §2.7.
 */
export class TreeRenderer {
  render(document: SvgDocument): readonly string[] {
    const rows = this.#collect(document.children, "");
    return [document.label, ...TreeRenderer.#format(rows)];
  }

  /** `tree <id>`: the shape's own row, then its subtree. */
  renderSubtree(shape: Shape): readonly string[] {
    const summary = shape.summary();
    const head = summary === "" ? shape.treeLabel : `${shape.treeLabel}  ${summary}`;
    return [head, ...TreeRenderer.#format(this.#collect(shape.children, ""))];
  }

  /** Depth-first rows in painting order, with box-drawing prefixes. */
  #collect(children: readonly Shape[], indent: string): TreeRow[] {
    const rows: TreeRow[] = [];
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      rows.push(new TreeRow(`${indent}${last ? "└── " : "├── "}`, child.treeLabel, child.summary()));
      if (child.children.length > 0) {
        const childIndent = `${indent}${last ? "    " : "│   "}`;
        rows.push(...this.#collect(child.children, childIndent));
      }
    });
    return rows;
  }

  static #format(rows: readonly TreeRow[]): string[] {
    const summarised = rows.filter((row) => row.summary !== "");
    const column =
      summarised.length === 0
        ? 0
        : Math.max(...summarised.map((row) => row.prefix.length + row.label.length)) + COLUMN_GAP;
    return rows.map((row) => row.format(column));
  }
}
