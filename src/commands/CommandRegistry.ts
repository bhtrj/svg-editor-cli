import { EditorError } from "../shared/EditorError.js";
import { Arguments } from "../shared/Arguments.js";
import type { Token } from "../shared/Tokenizer.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";
import { usageOf } from "./CommandSyntax.js";
import { CreateCommand } from "./CreateCommand.js";
import { DeleteCommand } from "./DeleteCommand.js";
import { MoveCommand } from "./MoveCommand.js";
import { ScaleCommand } from "./ScaleCommand.js";
import { SetAttributeCommand } from "./SetAttributeCommand.js";
import { GroupCommand } from "./GroupCommand.js";
import { UngroupCommand } from "./UngroupCommand.js";
import { AddToCommand } from "./AddToCommand.js";
import { BackCommand, FrontCommand } from "./ZOrderCommands.js";
import { CanvasCommand, InitCommand } from "./DocumentCommands.js";
import { ReadCommand, SaveCommand } from "./FileCommands.js";
import { RedoCommand, ShowCommand, TreeCommand, UndoCommand } from "./DisplayCommands.js";
import { HelpCommand } from "./HelpCommand.js";

/** Parses the tokens that follow a command name into a command object. */
type Builder = (args: Arguments, context: CommandContext) => CliCommand;

/**
 * Command name → implementation. This is one of exactly two places in the code
 * base allowed to dispatch on a string name (the other is `ShapeFactory`); both
 * are flagged for refactoring into a plugin registry in doc/README.md.
 */
export class CommandRegistry {
  static readonly #builders = new Map<string, Builder>([
    ["init", InitCommand.fromArguments],
    ["read", ReadCommand.fromArguments],
    ["save", SaveCommand.fromArguments],
    ["canvas", CanvasCommand.fromArguments],
    ["create", CreateCommand.fromArguments],
    ["delete", DeleteCommand.fromArguments],
    ["move", MoveCommand.fromArguments],
    ["scale", ScaleCommand.fromArguments],
    ["set", SetAttributeCommand.fromArguments],
    ["group", GroupCommand.fromArguments],
    ["ungroup", UngroupCommand.fromArguments],
    ["addto", AddToCommand.fromArguments],
    ["front", FrontCommand.fromArguments],
    ["back", BackCommand.fromArguments],
    ["tree", TreeCommand.fromArguments],
    ["show", ShowCommand.fromArguments],
    ["undo", UndoCommand.fromArguments],
    ["redo", RedoCommand.fromArguments],
    ["help", HelpCommand.fromArguments],
  ]);

  /** Builds a command, or throws `error: unknown command: <name>`. */
  build(name: string, tokens: readonly Token[], context: CommandContext): CliCommand {
    const builder = CommandRegistry.#builders.get(name);
    if (builder === undefined) {
      throw new EditorError(`unknown command: ${name}`);
    }
    return builder(new Arguments(tokens, usageOf(name)), context);
  }

  has(name: string): boolean {
    return CommandRegistry.#builders.has(name);
  }

  names(): readonly string[] {
    return [...CommandRegistry.#builders.keys()];
  }

  /** `[name, usage]` pairs in registration order, for `help`. */
  usages(): ReadonlyArray<readonly [string, string]> {
    return this.names().map((name) => [name, usageOf(name)] as const);
  }
}

/** Re-exported so command modules have a single import for their syntax. */
export { usageOf };
