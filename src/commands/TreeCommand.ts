import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";
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
