import { EditorError } from "../shared/EditorError.js";
import type { Arguments } from "../shared/Arguments.js";
import type { Shape } from "../domain/Shape.js";
import { Group } from "../domain/Group.js";
import { AbstractEditCommand } from "./AbstractEditCommand.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `group <newGid> <id1> <id2>…` — collect existing shapes into a new container.
 *
 * The whole collection is one undo unit (§4.3). Members keep their relative
 * document order, and the new group takes the slot of the first member, so
 * grouping never silently re-orders the drawing.
 *
 * Every precondition is checked *before* the first detach: a rejected command
 * must leave the document byte-identical (§2), and the memento would otherwise
 * have to hide a half-applied edit.
 */
export class GroupCommand extends AbstractEditCommand {
  static readonly usage = "group <newGid> <id1> <id2> …";

  #memberCount = 0;
  #newId = "";

  private constructor(
    context: CommandContext,
    newId: string,
    private readonly memberIds: readonly string[],
  ) {
    super(context);
    this.#newId = newId;
  }

  static fromArguments(args: Arguments, context: CommandContext): GroupCommand {
    const newId = args.identifier();
    const memberIds: string[] = [];
    while (!args.isEmpty) {
      memberIds.push(args.identifier());
    }
    if (memberIds.length === 0) {
      throw new EditorError(`usage: ${GroupCommand.usage}`);
    }
    return new GroupCommand(context, newId, memberIds);
  }

  protected apply(): readonly string[] {
    const document = this.context.requireDocument();
    this.context.assertIdAvailable(this.#newId);

    const members = this.memberIds.map((id) => this.context.shape(id));
    this.#assertNoContainerWithDescendant(members);

    const first = members[0];
    if (first === undefined) {
      throw new EditorError(`usage: ${GroupCommand.usage}`);
    }
    const parent = first.parent;
    if (parent === null) {
      throw new EditorError(`no such shape: ${first.id}`);
    }
    const insertionPoint = parent.indexOf(first);
    const ordered = document.sortInDocumentOrder(members);

    const group = new Group(this.#newId);
    for (const member of ordered) {
      member.parent?.removeChild(member);
    }
    parent.insertChildAt(insertionPoint, group);
    for (const member of ordered) {
      group.insertChildAt(group.children.length, member);
    }

    this.#memberCount = ordered.length;
    return [`g#${this.#newId} created with ${this.#memberCount} children`];
  }

  protected renderUndo(): readonly string[] {
    return [`g#${this.#newId} ungrouped (${this.#memberCount} children restored)`];
  }

  protected renderRedo(): readonly string[] {
    return [`g#${this.#newId} created with ${this.#memberCount} children`];
  }

  /** Rejects `group g c1 markers` when `markers` contains `c1`. */
  #assertNoContainerWithDescendant(members: readonly Shape[]): void {
    for (const member of members) {
      const container = member.asContainer();
      if (container === null) {
        continue;
      }
      const swallowed = members.find((other) => other !== member && container.contains(other));
      if (swallowed !== undefined) {
        throw new EditorError(`cannot group a container into its own descendant: ${member.id}`);
      }
    }
  }
}
