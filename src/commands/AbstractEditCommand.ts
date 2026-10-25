import { DocumentMemento } from "../domain/DocumentMemento.js";
import type { UndoableCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * Template Method for edit commands.
 *
 * The base captures a memento before and after `apply()`, so `undo` / `redo`
 * are exact state restorations rather than re-executions: that matters for
 * `delete` (which must come back into its old parent at its old z-index) and
 * keeps redo correct even when a command's inputs were consumed.
 *
 * If `apply()` throws, the "before" snapshot is restored and the error is
 * re-thrown, which is what makes §2's "命令失败不改变任何状态" hold even for
 * commands that validate halfway (`group` finding an ancestor cycle after it
 * already detached a child, for instance).
 *
 * Each command also owns its feedback text (`renderUndo` / `renderRedo`), so the
 * session never formats domain messages.
 */
export abstract class AbstractEditCommand implements UndoableCommand {
  protected readonly context: CommandContext;
  #before: DocumentMemento | null = null;
  #after: DocumentMemento | null = null;

  constructor(context: CommandContext) {
    this.context = context;
  }

  /** Performs the edit; must leave the document consistent on success. */
  protected abstract apply(): readonly string[];

  /** Feedback lines printed when this command is undone. */
  protected abstract renderUndo(): readonly string[];

  /** Feedback lines printed when this command is redone. */
  protected abstract renderRedo(): readonly string[];

  execute(): readonly string[] {
    const document = this.context.requireDocument();
    this.#before = DocumentMemento.capture(document);
    try {
      const lines = this.apply();
      this.#after = DocumentMemento.capture(document);
      return lines;
    } catch (error) {
      this.#before.restore(document);
      this.#after = null;
      throw error;
    }
  }

  undo(): readonly string[] {
    const document = this.context.requireDocument();
    if (this.#before === null) {
      throw new Error("undo before execute");
    }
    this.#before.restore(document);
    return this.renderUndo();
  }

  redo(): readonly string[] {
    const document = this.context.requireDocument();
    if (this.#after === null) {
      throw new Error("redo before execute");
    }
    this.#after.restore(document);
    return this.renderRedo();
  }
}
