import type { Arguments } from "../shared/Arguments.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `set <id> <attr> <value>` — one whitelisted attribute.
 *
 * Validation belongs to the shape (`Shape.canSet` / `setAttribute`), so adding an
 * attribute to a new shape type needs no change here. `set` reports both the new
 * value and — on undo — the previous one, matching the transcript in §6.
 */
export class SetAttributeCommand extends AbstractEditCommand {
  static readonly usage = 'set <id> <attr> <value>   (value may be "quoted text")';

  #undoMessage = "";
  #redoMessage = "";

  private constructor(
    context: CommandContext,
    private readonly id: string,
    private readonly attribute: string,
    private readonly value: string,
  ) {
    super(context);
  }

  static fromArguments(args: Arguments, context: CommandContext): SetAttributeCommand {
    const id = args.identifier();
    const attribute = args.identifier();
    const value = args.text();
    args.expectEnd();
    return new SetAttributeCommand(context, id, attribute, value);
  }

  protected apply(): readonly string[] {
    const shape = this.context.shape(this.id);
    const previous = shape.readAttribute(this.attribute) ?? "";

    shape.setAttribute(this.attribute, this.value);
    const next = shape.readAttribute(this.attribute) ?? this.value;

    // The wording belongs to the shape (`box` says "propagated to n1-rect"),
    // and the previous command object may not outlive the undo memento, so both
    // lines are rendered now and kept as strings.
    this.#redoMessage = shape.setFeedback(this.attribute, next);
    this.#undoMessage = shape.setUndoFeedback(this.attribute, previous);
    return [this.#redoMessage];
  }

  protected renderUndo(): readonly string[] {
    return [this.#undoMessage];
  }

  protected renderRedo(): readonly string[] {
    return [this.#redoMessage];
  }
}
