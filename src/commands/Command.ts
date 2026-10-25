/** A command the REPL can execute; returns the lines it wants printed. */
export interface CliCommand {
  execute(): readonly string[];
}

/** An edit command: undoable, and one instance == one undo unit. */
export interface UndoableCommand extends CliCommand {
  undo(): readonly string[];
  redo(): readonly string[];
}
