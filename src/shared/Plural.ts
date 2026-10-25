/**
 * Count phrasing for command feedback.
 *
 * The singular is handled in one place because three call sites had already
 * drifted apart: two printed "1 children", and one printed "1 descendants" in the
 * redo path only. Grammar in user-visible output is part of the contract the
 * transcript tests enforce, so it should not be re-derived per call site.
 */
export class Plural {
  /** `1 child`, `2 children`. */
  static child(count: number): string {
    return `${count} ${count === 1 ? "child" : "children"}`;
  }

  /** `1 descendant`, `2 descendants`. */
  static descendant(count: number): string {
    return `${count} ${count === 1 ? "descendant" : "descendants"}`;
  }
}
