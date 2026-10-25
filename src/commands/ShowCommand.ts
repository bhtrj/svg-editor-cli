import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";
import { ShowRenderer } from "../presentation/ShowRenderer.js";

/** `show <id>` — attribute detail of one shape (§5.2). */
export class ShowCommand implements CliCommand {
  static readonly usage = "show <id>";

  readonly #renderer = new ShowRenderer();

  private constructor(
    private readonly context: CommandContext,
    private readonly id: string,
  ) {}

  static fromArguments(args: Arguments, context: CommandContext): ShowCommand {
    const id = args.identifier();
    args.expectEnd();
    return new ShowCommand(context, id);
  }

  execute(): readonly string[] {
    return this.#renderer.render(this.context.shape(this.id));
  }
}
