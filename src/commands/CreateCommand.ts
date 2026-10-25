import { EditorError } from "../shared/EditorError.js";
import type { Arguments } from "../shared/Arguments.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";
import { usageOf } from "./CommandSyntax.js";

/**
 * `create <type> <id> [params…] [in <containerId>]`
 *
 * The command knows *no* shape type: the parameter list comes from the factory's
 * `ShapeTypeSpec`, which is the single sanctioned name-dispatch point. Adding a
 * shape type therefore never touches this class.
 */
export class CreateCommand extends AbstractEditCommand {
  static readonly usage = usageOf("create");

  #label = "";
  #parentLabel = "";
  #containerLabel: string | null = null;

  private constructor(
    context: CommandContext,
    private readonly type: string,
    private readonly values: ReadonlyMap<string, string>,
    private readonly containerId: string | null,
  ) {
    super(context);
  }

  static fromArguments(args: Arguments, context: CommandContext): CreateCommand {
    const type = args.identifier();
    const id = args.identifier();

    const spec = context.factory.spec(type);
    if (spec === null) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }

    const parameters = args.rest();
    const inIndex = findInClause(parameters);
    let containerId: string | null = null;
    let actual = parameters;

    if (inIndex >= 0) {
      const containerToken = parameters[inIndex + 1];
      if (containerToken === undefined || inIndex + 2 !== parameters.length) {
        throw new EditorError(`usage: ${CreateCommand.usage}`);
      }
      containerId = containerToken.text;
      actual = parameters.slice(0, inIndex);
    }

    const values = new Map<string, string>([["id", id]]);
    let cursor = 0;
    for (const param of spec.params) {
      const token = actual[cursor];
      if (token === undefined) {
        if (param.optional === true) {
          continue;
        }
        throw new EditorError(`usage: ${CreateCommand.usage}`);
      }
      values.set(param.name, token.text);
      cursor += 1;
    }
    if (cursor !== actual.length) {
      throw new EditorError(`unexpected argument: ${actual[cursor]?.text ?? ""}`);
    }

    return new CreateCommand(context, type, values, containerId);
  }

  protected apply(): readonly string[] {
    const id = this.values.get("id") ?? "";
    this.context.assertIdAvailable(id);

    const parent =
      this.containerId === null
        ? this.context.requireDocument()
        : this.context.container(this.containerId);

    const shape = this.context.factory.create(this.type, this.values);
    parent.insertChildAt(parent.children.length, shape);

    this.#label = shape.label;
    this.#parentLabel = parent.containerLabel;
    this.#containerLabel = this.containerId === null ? null : parent.containerLabel;
    return [this.createdMessage()];
  }

  protected renderUndo(): readonly string[] {
    return [`${this.#label} creation undone`];
  }

  protected renderRedo(): readonly string[] {
    return [this.createdMessage()];
  }

  private createdMessage(): string {
    return this.#containerLabel === null
      ? `${this.#label} created`
      : `${this.#label} created in ${this.#parentLabel}`;
  }
}

/**
 * Position of an unquoted `in`, or -1.
 * A quoted `"in"` is data (a text content), never the clause (§4.1).
 */
function findInClause(tokens: readonly { readonly text: string; readonly quoted: boolean }[]): number {
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token !== undefined && !token.quoted && token.text === "in") {
      return index;
    }
  }
  return -1;
}
