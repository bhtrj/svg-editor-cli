import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { TreeRow } from "./TreeRow.js";

/**
 * Renders the `tree` view (§5.1) — a box-drawing outline with geometry inlined.
 *
 * Column alignment is computed per sibling group: every child of one parent pads
 * its label to the width of the widest sibling that has a summary. That keeps a
 * group readable without a global column width that would look ragged across
 * deep trees.
 */
export class TreeRenderer {
  render(document: SvgDocument): readonly string[] {
    const lines: string[] = [document.label];
    lines.push(...this.renderChildren(document.children, ""));
    return lines;
  }

  /** `tree <id>`: the shape's own row, then its subtree. */
  renderSubtree(shape: Shape): readonly string[] {
    const summary = shape.summary();
    const head = summary === "" ? shape.label : `${shape.label}  ${summary}`;
    return [head, ...this.renderChildren(shape.children, "")];
  }

  private renderChildren(children: readonly Shape[], indent: string): string[] {
    const rows = children.map((child, index) => {
      const last = index === children.length - 1;
      return new TreeRow(`${indent}${last ? "└── " : "├── "}`, child.label, child.summary());
    });
    const summarised = rows.filter((row) => row.summary !== "");
    const width =
      summarised.length === 0 ? 0 : Math.max(...summarised.map((row) => row.label.length));

    const lines: string[] = [];
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      const row = rows[index] as TreeRow;
      lines.push(row.format(width));
      if (child.children.length > 0) {
        const childIndent = `${indent}${last ? "    " : "│   "}`;
        lines.push(...this.renderChildren(child.children, childIndent));
      }
    });
    return lines;
  }
}
