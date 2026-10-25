import { CommandRegistry } from "../commands/CommandRegistry.js";
import { BoxProvider } from "../domain/BoxProvider.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import type { ShapeProvider } from "../domain/ShapeProvider.js";
import { SvgCodec } from "../io/SvgCodec.js";
import { NodeFileGateway } from "../io/NodeFileGateway.js";
import { EditorSession } from "../app/EditorSession.js";
import { CommandRunner } from "../app/CommandRunner.js";
import { EditorError } from "../shared/EditorError.js";
import { ReadlineLineSource } from "./ReadlineLineSource.js";
import { Repl } from "./Repl.js";

/**
 * Composition root: builds the concrete adapters once and wires the CLI together.
 *
 * This is the only class that names `BoxProvider`, `SvgCodec`, `NodeFileGateway`
 * and `ReadlineLineSource`; every other module receives its collaborators through
 * interfaces. Keeping the wiring here (rather than at module scope in `main`)
 * makes it callable from a test and keeps `main.ts` a three-line process entry.
 */
export class CompositionRoot {
  /** Runs the CLI for one process: `--script <file>` or the interactive REPL. */
  static async run(argv: readonly string[]): Promise<number> {
    let providers: readonly ShapeProvider[];
    try {
      providers = CompositionRoot.#providers(argv);
    } catch (error) {
      if (error instanceof EditorError) {
        process.stderr.write(`${error.outputLine}\n`);
        return 1;
      }
      throw error;
    }

    const files = new NodeFileGateway(process.cwd());
    const session = new EditorSession({
      factory: new ShapeFactory(providers),
      codec: new SvgCodec(),
      files,
      registry: new CommandRegistry(),
    });
    const repl = new Repl(new CommandRunner(session), (line) => process.stdout.write(`${line}\n`));

    const scriptPath = CompositionRoot.#scriptPath(argv);
    if (scriptPath === null) {
      await repl.start(new ReadlineLineSource(process.stdin, process.stdout, "svg> "));
      return 0;
    }

    let script: string;
    try {
      // The script goes through the same gateway as `read`, so `node:fs` still
      // appears in exactly one class.
      script = files.readText(scriptPath, "utf8");
    } catch {
      process.stderr.write(`error: cannot read file: ${scriptPath}\n`);
      return 1;
    }
    for (const line of repl.replay(script)) {
      process.stdout.write(`${line}\n`);
    }
    return 0;
  }

  /** Boots the process (called by `main.ts`, the process entry point). */
  static start(): void {
    void CompositionRoot.run(process.argv.slice(2)).then((code) => {
      process.exitCode = code;
    });
  }

  static #scriptPath(argv: readonly string[]): string | null {
    const flag = argv.indexOf("--script");
    if (flag < 0) {
      return null;
    }
    return argv[flag + 1] ?? null;
  }

  /**
   * `--plugin <name>` (repeatable) — the shape plugins this process loads.
   *
   * Empty by default, which is what keeps §3/§4.4's default behaviour exact:
   * without `--plugin box`, `create box` reports `unknown shape type`.
   *
   * @throws EditorError `unknown plugin: <name>`
   */
  static #providers(argv: readonly string[]): readonly ShapeProvider[] {
    const providers: ShapeProvider[] = [];
    for (let index = 0; index < argv.length; index += 1) {
      if (argv[index] !== "--plugin") {
        continue;
      }
      const name = argv[index + 1] ?? "";
      if (name === "box") {
        providers.push(new BoxProvider());
        continue;
      }
      throw new EditorError(`unknown plugin: ${name}`);
    }
    return providers;
  }
}
