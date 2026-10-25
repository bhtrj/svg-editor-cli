import type { Arguments } from "../shared/Arguments.js";
import { Numbers } from "../shared/Numbers.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `scale <id> <factor>` — uniform scale applied to every geometry value.
 *
 * Deliberately *not* implemented with an SVG `transform`: `tree` and `show`
 * report real coordinates, so a hidden transform would make the model disagree
 * with what the user reads, and a second `scale` would compound invisibly.
 */
export class ScaleCommand extends AbstractEditCommand {
  static readonly usage = "scale <id> <factor>";

  #label = "";
  #factor = 1;
  #isContainer = false;
  #before = "";
  #after = "";

  private constructor(
    context: CommandContext,
    private readonly id: string,
    factor: number,
  ) {
    super(context);
    this.#factor = factor;
  }

  static fromArguments(args: Arguments, context: CommandContext): ScaleCommand {
    const id = args.identifier();
    const factor = Numbers.parsePositive(args.take().text, "scale factor");
    args.expectEnd();
    return new ScaleCommand(context, id, factor);
  }

  protected apply(): readonly string[] {
    const shape = this.context.shape(this.id);
    this.#label = shape.commandLabel;
    this.#isContainer = shape.isContainer;
    if (!this.#isContainer) {
      this.#before = shape.anchor().label;
    }

    shape.scaleBy(this.#factor);

    if (!this.#isContainer) {
      this.#after = shape.anchor().label;
    }
    return [this.scaledMessage()];
  }

  protected renderUndo(): readonly string[] {
    return [
      this.#isContainer
        ? `${this.#label} scaled back by 1/${Numbers.format(this.#factor)}`
        : `${this.#label} scaled back to ${this.#before}`,
    ];
  }

  protected renderRedo(): readonly string[] {
    return [this.scaledMessage()];
  }

  private scaledMessage(): string {
    return this.#isContainer
      ? `${this.#label} scaled by ${Numbers.format(this.#factor)}`
      : `${this.#label} scaled to ${this.#after} (factor ${Numbers.format(this.#factor)})`;
  }
}
