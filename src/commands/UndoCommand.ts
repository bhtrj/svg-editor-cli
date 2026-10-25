import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/** `undo` — one edit command per call (§4.3). */
export class UndoCommand implements CliCommand {
  static readonly usage = "undo";

  private constructor(private readonly context: CommandContext) {}

  static fromArguments(args: Arguments, context: CommandContext): UndoCommand {
    args.expectEnd();
    return new UndoCommand(context);
  }

  execute(): readonly string[] {
    return this.context.history.undo();
  }
}
