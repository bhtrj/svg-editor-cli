import { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";
import type { CommandRegistry } from "./CommandRegistry.js";

/** How `help` groups commands, mirroring §3 of the assignment. */
const GROUPS: ReadonlyArray<{ readonly title: string; readonly names: readonly string[] }> = [
  { title: "document (undo/redo disabled after these)", names: ["init", "read", "save", "canvas"] },
  {
    title: "editing (undoable)",
    names: ["create", "delete", "move", "scale", "set", "group", "ungroup", "addto", "front", "back"],
  },
  { title: "display (not undoable)", names: ["tree", "show", "help"] },
  { title: "history", names: ["undo", "redo"] },
];

/** `help` — prints every command with its syntax (§3). */
export class HelpCommand implements CliCommand {
  static readonly usage = "help";

  private constructor(
    private readonly registry: CommandRegistry,
    private readonly types: readonly string[],
  ) {}

  static fromArguments(args: Arguments, context: CommandContext): HelpCommand {
    args.expectEnd();
    return new HelpCommand(
      context.registry,
      context.factory.specs.map((spec) => spec.type),
    );
  }

  execute(): readonly string[] {
    const usages = new Map(this.registry.usages());
    const lines: string[] = ["svg-editor — commands:"];
    for (const group of GROUPS) {
      lines.push("", `${group.title}:`);
      for (const name of group.names) {
        lines.push(`  ${usages.get(name) ?? name}`);
      }
    }
    lines.push(
      "",
      "notes:",
      "  '#' at the start of a line is a comment; quote arguments that contain spaces.",
      "  ids are unique and case-sensitive; every shape (including <g>) has one.",
      "  coordinates: origin top-left, x right, y down, unit px (floats allowed).",
      `  create types: ${this.types.join(" ")}`,
    );
    return lines;
  }
}
