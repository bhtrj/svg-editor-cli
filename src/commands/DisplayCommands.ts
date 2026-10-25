import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";
import { ShowRenderer } from "../presentation/ShowRenderer.js";
import { TreeRenderer } from "../presentation/TreeRenderer.js";

/** `tree [id]` — the structural tree, or the subtree rooted at `id` (§5.1). */
export class TreeCommand implements CliCommand {
  static readonly usage = "tree [id]";

  readonly #renderer = new TreeRenderer();

  private constructor(
    private readonly context: CommandContext,
    private readonly id: string | null,
  ) {}

  static fromArguments(args: Arguments, context: CommandContext): TreeCommand {
    const id = args.isEmpty ? null : args.identifier();
    args.expectEnd();
    return new TreeCommand(context, id);
  }

  execute(): readonly string[] {
    const document = this.context.requireDocument();
    if (this.id === null) {
      return this.#renderer.render(document);
    }
    return this.#renderer.renderSubtree(this.context.shape(this.id));
  }
}

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
