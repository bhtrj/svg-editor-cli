import type { Arguments } from "../shared/Arguments.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/** `front <id>` — move the shape to the end of its parent's child list (top of z-order). */
export class FrontCommand extends AbstractEditCommand {
  static readonly usage = "front <id>";

  #label = "";

  private constructor(
    context: CommandContext,
    private readonly id: string,
  ) {
    super(context);
  }

  static fromArguments(args: Arguments, context: CommandContext): FrontCommand {
    const id = args.identifier();
    args.expectEnd();
    return new FrontCommand(context, id);
  }

  protected apply(): readonly string[] {
    const shape = this.context.shape(this.id);
    this.#label = shape.label;
    const parent = shape.parent;
    if (parent !== null) {
      parent.removeChild(shape);
      parent.insertChildAt(parent.children.length, shape);
    }
    return [`${this.#label} brought to front`];
  }

  protected renderUndo(): readonly string[] {
    return [`${this.#label} z-order restored`];
  }

  protected renderRedo(): readonly string[] {
    return [`${this.#label} brought to front`];
  }
}
