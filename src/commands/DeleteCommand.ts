import { Plural } from "../shared/Plural.js";
import type { Arguments } from "../shared/Arguments.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `delete <id>` — removes a leaf or a whole subtree.
 *
 * The undo feedback names the container the shape returns to (§6:
 * `rect#box restored into g#markers`), which the memento restores automatically.
 * The parent label is captured during `apply()` because the shape is detached
 * afterwards.
 */
export class DeleteCommand extends AbstractEditCommand {
  static readonly usage = "delete <id>";

  #label = "";
  #parentLabel = "";
  #wasContainer = false;
  #childCount = 0;

  private constructor(
    context: CommandContext,
    private readonly id: string,
  ) {
    super(context);
  }

  static fromArguments(args: Arguments, context: CommandContext): DeleteCommand {
    const id = args.identifier();
    args.expectEnd();
    return new DeleteCommand(context, id);
  }

  protected apply(): readonly string[] {
    const shape = this.context.shape(this.id);
    const parent = shape.parent;
    this.#label = shape.commandLabel;
    this.#wasContainer = shape.isContainer;
    this.#childCount = shape.descendantCount();
    this.#parentLabel = parent?.containerLabel ?? "svg";

    parent?.removeChild(shape);
    shape.setParent(null);

    return [
      this.#wasContainer && this.#childCount > 0
        ? `${this.#label} deleted (with ${Plural.descendant(this.#childCount)})`
        : `${this.#label} deleted`,
    ];
  }

  protected renderUndo(): readonly string[] {
    return [`${this.#label} restored into ${this.#parentLabel}`];
  }

  protected renderRedo(): readonly string[] {
    return [
      this.#wasContainer && this.#childCount > 0
        ? `${this.#label} deleted (with ${Plural.descendant(this.#childCount)})`
        : `${this.#label} deleted`,
    ];
  }
}
