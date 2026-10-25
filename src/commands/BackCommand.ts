import type { Arguments } from "../shared/Arguments.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/** `back <id>` — move the shape to the start of its parent's child list (bottom of z-order). */
export class BackCommand extends AbstractEditCommand {
  static readonly usage = "back <id>";

  #label = "";

  private constructor(
    context: CommandContext,
    private readonly id: string,
  ) {
    super(context);
  }

  static fromArguments(args: Arguments, context: CommandContext): BackCommand {
    const id = args.identifier();
    args.expectEnd();
    return new BackCommand(context, id);
  }

  protected apply(): readonly string[] {
    const shape = this.context.shape(this.id);
    this.#label = shape.label;
    const parent = shape.parent;
    if (parent !== null) {
      parent.removeChild(shape);
      parent.insertChildAt(0, shape);
    }
    return [`${this.#label} sent to back`];
  }

  protected renderUndo(): readonly string[] {
    return [`${this.#label} z-order restored`];
  }

  protected renderRedo(): readonly string[] {
    return [`${this.#label} sent to back`];
  }
}
