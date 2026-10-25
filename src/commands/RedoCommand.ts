import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/** `redo` — replays the last undone edit; cleared by any new edit. */
export class RedoCommand implements CliCommand {
  static readonly usage = "redo";

  private constructor(private readonly context: CommandContext) {}

  static fromArguments(args: Arguments, context: CommandContext): RedoCommand {
    args.expectEnd();
    return new RedoCommand(context);
  }

  execute(): readonly string[] {
    return this.context.history.redo();
  }
}
