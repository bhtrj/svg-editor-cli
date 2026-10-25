import type { Arguments } from "../shared/Arguments.js";
import { Numbers } from "../shared/Numbers.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `move <id> <dx> <dy>` — incremental translation.
 *
 * Works on a leaf and on a container through the same call: `Shape.moveBy` is the
 * polymorphic entry point, and `Group` implements it by delegating to children,
 * so this command contains no container special case — only a difference in how
 * the result is reported (a leaf has a point, a container only has a delta).
 */
export class MoveCommand extends AbstractEditCommand {
  static readonly usage = "move <id> <dx> <dy>";

  #label = "";
  #dx = 0;
  #dy = 0;
  #before = "";
  #after = "";
  #isContainer = false;

  private constructor(
    context: CommandContext,
    private readonly id: string,
    dx: number,
    dy: number,
  ) {
    super(context);
    this.#dx = dx;
    this.#dy = dy;
  }

  static fromArguments(args: Arguments, context: CommandContext): MoveCommand {
    const id = args.identifier();
    const dx = args.number();
    const dy = args.number();
    args.expectEnd();
    return new MoveCommand(context, id, dx, dy);
  }

  protected apply(): readonly string[] {
    const shape = this.context.shape(this.id);
    this.#label = shape.commandLabel;
    this.#isContainer = shape.isContainer;
    if (!this.#isContainer) {
      this.#before = shape.anchor().label;
    }

    shape.moveBy(this.#dx, this.#dy);

    if (!this.#isContainer) {
      this.#after = shape.anchor().label;
    }
    return [this.movedMessage()];
  }

  protected renderUndo(): readonly string[] {
    return [
      this.#isContainer
        ? `${this.#label} moved back by (${Numbers.format(-this.#dx)},${Numbers.format(-this.#dy)})`
        : `${this.#label} moved back to ${this.#before}`,
    ];
  }

  protected renderRedo(): readonly string[] {
    return [this.movedMessage()];
  }

  private movedMessage(): string {
    return this.#isContainer
      ? `${this.#label} moved by (${Numbers.format(this.#dx)},${Numbers.format(this.#dy)})`
      : `${this.#label} moved to ${this.#after}`;
  }
}
