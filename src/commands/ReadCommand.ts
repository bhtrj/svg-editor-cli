import { EditorError } from "../shared/EditorError.js";
import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `read <file.svg>` — decode a file into the current document.
 *
 * Warnings produced by the decoder (auto-assigned ids, §2) are printed *before*
 * the summary line, exactly as in the §6 transcript.
 */
export class ReadCommand implements CliCommand {
  static readonly usage = "read <file.svg>";

  private constructor(
    private readonly context: CommandContext,
    private readonly path: string,
  ) {}

  static fromArguments(args: Arguments, context: CommandContext): ReadCommand {
    const path = args.identifier();
    args.expectEnd();
    return new ReadCommand(context, path);
  }

  execute(): readonly string[] {
    let text: string;
    try {
      text = this.context.files.readText(this.path, "utf8");
    } catch {
      throw new EditorError(`cannot read file: ${this.path}`);
    }

    const decoded = this.context.codec.decode(text, this.context.factory);
    this.context.installDocument(decoded.document);
    this.context.setSourcePath(this.path);
    this.context.history.lockAfterIo(true);

    return [
      ...decoded.warnings,
      `read ${this.path} (${decoded.document.elementCount} elements)`,
    ];
  }
}
