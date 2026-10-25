import { EditorError } from "../shared/EditorError.js";
import type { Arguments } from "../shared/Arguments.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `addto <gid> <id>` — move an existing shape into a container, as last child.
 *
 * Distinct from `group` (§4.1): `group` creates a new container around existing
 * shapes, `addto` moves an existing shape between existing containers.
 *
 * The cycle check runs in both directions — self, and "the moved shape is an
 * ancestor of the target" — because either one would detach a subtree from the
 * document and leak it out of the tree.
 */
export class AddToCommand extends AbstractEditCommand {
  static readonly usage = "addto <gid> <id>";

  #label = "";
  #targetLabel = "";

  private constructor(
    context: CommandContext,
    private readonly gid: string,
    private readonly id: string,
  ) {
    super(context);
  }

  static fromArguments(args: Arguments, context: CommandContext): AddToCommand {
    const gid = args.identifier();
    const id = args.identifier();
    args.expectEnd();
    return new AddToCommand(context, gid, id);
  }

  protected apply(): readonly string[] {
    const target = this.context.container(this.gid);
    const targetShape = this.context.shape(this.gid);
    const shape = this.context.shape(this.id);

    if (targetShape === shape) {
      throw new EditorError(`cannot add a container to itself: ${this.id}`);
    }
    const moved = shape.asContainer();
    if (moved !== null && moved.contains(targetShape)) {
      throw new EditorError(`cannot add a container into its own descendant: ${this.id}`);
    }

    shape.parent?.removeChild(shape);
    target.insertChildAt(target.children.length, shape);

    this.#label = shape.label;
    this.#targetLabel = target.containerLabel;
    return [`${this.#label} added to ${this.#targetLabel}`];
  }

  protected renderUndo(): readonly string[] {
    return [`${this.#label} moved back`];
  }

  protected renderRedo(): readonly string[] {
    return [`${this.#label} added to ${this.#targetLabel}`];
  }
}
