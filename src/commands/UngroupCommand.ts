import { EditorError } from "../shared/EditorError.js";
import { Plural } from "../shared/Plural.js";
import type { Arguments } from "../shared/Arguments.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `ungroup <gid>` — dissolve a container, promoting its children in place.
 *
 * Rejected for root-level containers (§4.2): the root level has no sibling slot
 * to promote into, and allowing it would silently flatten a whole diagram.
 */
export class UngroupCommand extends AbstractEditCommand {
  static readonly usage = "ungroup <gid>";

  #childCount = 0;
  #id = "";

  private constructor(
    context: CommandContext,
    id: string,
  ) {
    super(context);
    this.#id = id;
  }

  static fromArguments(args: Arguments, context: CommandContext): UngroupCommand {
    const id = args.identifier();
    args.expectEnd();
    return new UngroupCommand(context, id);
  }

  protected apply(): readonly string[] {
    const document = this.context.requireDocument();
    const group = this.context.shape(this.#id);
    if (!group.isContainer) {
      throw new EditorError(`not a container: ${this.#id}`);
    }
    const parent = group.parent;
    if (parent === null || parent === document) {
      throw new EditorError(`cannot ungroup top-level container: ${this.#id}`);
    }

    const children = [...group.children];
    const insertionPoint = parent.indexOf(group);
    parent.removeChild(group);
    group.setParent(null);
    children.forEach((child, offset) => {
      parent.insertChildAt(insertionPoint + offset, child);
    });

    this.#childCount = children.length;
    return [`g#${this.#id} ungrouped (${Plural.child(this.#childCount)})`];
  }

  protected renderUndo(): readonly string[] {
    return [`g#${this.#id} regrouped (${Plural.child(this.#childCount)})`];
  }

  protected renderRedo(): readonly string[] {
    return [`g#${this.#id} ungrouped (${Plural.child(this.#childCount)})`];
  }
}
