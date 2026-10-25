/**
 * Canonical command syntax — one source of truth for `usage:` errors, for
 * `help`, and for the parser.
 *
 * Kept in its own module (rather than in `CommandRegistry`) because command
 * classes need their usage string while the registry needs the classes: a
 * separate leaf module breaks that cycle. It also names, in one table, every
 * command the CLI accepts.
 */
export class CommandSyntax {
  static readonly USAGES: Readonly<Record<string, string>> = {
    init: "init [w] [h]",
    read: "read <file.svg>",
    save: "save [file.svg]",
    canvas: "canvas [w] [h]",
    create: "create <type> <id> [params…] [in <containerId>]",
    delete: "delete <id>",
    move: "move <id> <dx> <dy>",
    scale: "scale <id> <factor>",
    set: "set <id> <attr> <value>",
    group: "group <newGid> <id1> <id2> …",
    ungroup: "ungroup <gid>",
    addto: "addto <gid> <id>",
    front: "front <id>",
    back: "back <id>",
    tree: "tree [id]",
    show: "show <id>",
    undo: "undo",
    redo: "redo",
    help: "help",
  };

  /** Canonical syntax of a command. */
  static usageOf(name: string): string {
    return CommandSyntax.USAGES[name] ?? name;
  }
}
