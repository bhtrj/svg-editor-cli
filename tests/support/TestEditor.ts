import { CommandRegistry } from "../../src/commands/CommandRegistry.js";
import { ShapeFactory } from "../../src/domain/ShapeFactory.js";
import type { ShapeProvider } from "../../src/domain/ShapeProvider.js";
import { SvgCodec } from "../../src/io/SvgCodec.js";
import { EditorSession } from "../../src/app/EditorSession.js";
import { CommandRunner } from "../../src/app/CommandRunner.js";
import { EditorError } from "../../src/shared/EditorError.js";
import type { FileGateway } from "../../src/shared/FileGateway.js";

/** In-memory file system: the tests never touch the disk. */
export class FakeFileGateway implements FileGateway {
  readonly files = new Map<string, string>();

  readText(path: string, _encoding: "utf8"): string {
    const text = this.files.get(path);
    if (text === undefined) {
      throw new Error(`ENOENT: ${path}`);
    }
    return text;
  }

  writeText(path: string, text: string, _encoding: "utf8"): void {
    this.files.set(path, text);
  }

  resolve(path: string): string {
    return path;
  }
}

/** A fully wired CLI without the process: the harness every test drives. */
export class TestEditor {
  readonly session: EditorSession;
  readonly runner: CommandRunner;
  readonly files = new FakeFileGateway();

  constructor(providers: readonly ShapeProvider[] = []) {
    this.session = new EditorSession({
      factory: new ShapeFactory(providers),
      codec: new SvgCodec(),
      files: this.files,
      registry: new CommandRegistry(),
    });
    this.runner = new CommandRunner(this.session);
  }

  /** Runs one line and returns its output lines (errors included, as `error: 鈥). */
  run(line: string): string[] {
    try {
      return [...this.runner.run(line)];
    } catch (error) {
      if (error instanceof EditorError) {
        return [error.outputLine];
      }
      throw error;
    }
  }

  /** Runs a multi-line script; `#` comments and blank lines are ignored. */
  runScript(script: string): string[] {
    const lines: string[] = [];
    for (const line of script.split(/\r?\n/)) {
      lines.push(...this.run(line));
    }
    return lines;
  }

  /** Convenience: the document as the `tree` command would print it. */
  tree(): string[] {
    return this.run("tree");
  }
}

/** Builds an editor with a document already initialised. */
export function editorWithCanvas(
  width = 800,
  height = 600,
  providers: readonly ShapeProvider[] = [],
): TestEditor {
  const editor = new TestEditor(providers);
  editor.run(`init ${width} ${height}`);
  return editor;
}
