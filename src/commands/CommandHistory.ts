import { EditorError } from "../shared/EditorError.js";
import type { UndoableCommand } from "./Command.js";

/**
 * The undo / redo caretaker.
 *
 * It also owns the io gate of §4.3: after a document command (`init`, `read`,
 * `save`, `canvas` resize) both stacks are unusable until the next edit command
 * runs, which is what produces `error: undo not allowed after io command`.
 */
export class CommandHistory {
  readonly #undoStack: UndoableCommand[] = [];
  readonly #redoStack: UndoableCommand[] = [];
  #lockedByIo = false;

  get canUndo(): boolean {
    return !this.#lockedByIo && this.#undoStack.length > 0;
  }

  get canRedo(): boolean {
    return !this.#lockedByIo && this.#redoStack.length > 0;
  }

  get isLockedByIo(): boolean {
    return this.#lockedByIo;
  }

  get undoDepth(): number {
    return this.#undoStack.length;
  }

  get redoDepth(): number {
    return this.#redoStack.length;
  }

  /**
   * Records a successfully executed edit command.
   * A new edit invalidates the redo branch (§3: "undo 后若有新编辑，redo 栈清空").
   */
  record(command: UndoableCommand): void {
    this.#undoStack.push(command);
    this.#redoStack.length = 0;
    this.#lockedByIo = false;
  }

  undo(): readonly string[] {
    this.#assertUnlocked();
    const command = this.#undoStack.pop();
    if (command === undefined) {
      throw new EditorError("nothing to undo");
    }
    const lines = command.undo();
    this.#redoStack.push(command);
    return lines;
  }

  redo(): readonly string[] {
    this.#assertUnlocked();
    const command = this.#redoStack.pop();
    if (command === undefined) {
      throw new EditorError("nothing to redo");
    }
    const lines = command.redo();
    this.#undoStack.push(command);
    return lines;
  }

  /**
   * Called after a document command.
   * @param discard when the document itself was replaced (`init` / `read`), the
   * stacks must be emptied: their mementos describe the previous document.
   */
  lockAfterIo(discard: boolean): void {
    if (discard) {
      this.#undoStack.length = 0;
      this.#redoStack.length = 0;
    }
    this.#lockedByIo = true;
  }

  #assertUnlocked(): void {
    if (this.#lockedByIo) {
      throw new EditorError("undo not allowed after io command");
    }
  }
}
