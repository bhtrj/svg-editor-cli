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

  #label = "";
  #attribute = "";
  #previous = "";
  #next = "";

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
    this.#label = shape.label;
    this.#attribute = this.attribute;
    this.#previous = shape.readAttribute(this.attribute) ?? "";

    shape.setAttribute(this.attribute, this.value);
    this.#next = shape.readAttribute(this.attribute) ?? this.value;

    return [this.updatedMessage()];
  }

  protected renderUndo(): readonly string[] {
    return [`${this.#label} updated: ${this.#attribute}=${quoteIfText(this.attribute, this.#previous)}`];
  }

  protected renderRedo(): readonly string[] {
    return [this.updatedMessage()];
  }

  private updatedMessage(): string {
    return `${this.#label} updated: ${this.#attribute}=${quoteIfText(this.#attribute, this.#next)}`;
  }
}

/**
 * The transcript quotes text content (`text="My Diagram"`) but not geometry
 * (`text` is the one attribute whose value may contain spaces).
 */
function quoteIfText(attribute: string, value: string): string {
  return attribute === "text" ? `"${value}"` : value;
}
