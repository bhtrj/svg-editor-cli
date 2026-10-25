import type { Shape } from "./Shape.js";
import type { SvgDocument } from "./SvgDocument.js";

/**
 * Snapshot of the shape tree — the Memento of the undo mechanism.
 *
 * Taking a whole-tree snapshot (instead of a per-command inverse) is a
 * deliberate trade-off: it makes every operation — including `group`
 * re-parenting and `delete` of a subtree — undoable with one uniform mechanism,
 * at the cost of O(n) memory per undo step. At this document size that cost is
 * irrelevant; the alternative (hand-written inverse per command) is exactly
 * where such editors usually break. Recorded in doc/README.md as a trade-off.
 *
 * The **canvas size is deliberately not part of the memento**: `canvas w h` is a
 * document command (§3), so its effect must survive undo/redo. If the size were
 * captured here, undoing an early edit after a resize would silently shrink the
 * canvas back — an edit command changing a document-level property.
 */
export class DocumentMemento {
  private constructor(private readonly children: readonly Shape[]) {}

  static capture(document: SvgDocument): DocumentMemento {
    return new DocumentMemento(document.snapshotChildren());
  }

  /**
   * Restores into the same document instance (so the session's reference stays
   * valid). Children are cloned again, letting one memento be replayed after
   * undo → redo → undo.
   */
  restore(document: SvgDocument): void {
    document.replaceChildren(this.children.map((child) => child.clone()));
  }
}
