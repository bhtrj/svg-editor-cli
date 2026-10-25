import type { Shape } from "./Shape.js";
import type { SvgDocument } from "./SvgDocument.js";

/**
 * Snapshot of a whole document — the Memento of the undo mechanism.
 *
 * Taking the snapshot of the entire tree (instead of a per-command inverse) is a
 * deliberate trade-off: it makes every operation — including `group` re-parenting
 * and `delete` of a subtree — undoable with one uniform mechanism, at the cost of
 * O(n) memory per undo step. At this document size that cost is irrelevant; the
 * alternative (hand-written inverse per command) is exactly where such editors
 * usually break. Recorded in doc/README.md as a known trade-off.
 */
export class DocumentMemento {
  private constructor(
    readonly width: number,
    readonly height: number,
    private readonly children: readonly Shape[],
  ) {}

  static capture(document: SvgDocument): DocumentMemento {
    return new DocumentMemento(
      document.width,
      document.height,
      document.snapshotChildren(),
    );
  }

  /**
   * Restores into the same document instance (so `EditorContext` stays valid).
   * Children are cloned again, letting the same memento be replayed after
   * undo → redo → undo.
   */
  restore(document: SvgDocument): void {
    document.resize(this.width, this.height);
    document.replaceChildren(this.children.map((child) => child.clone()));
  }
}
