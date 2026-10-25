#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CommandRegistry } from "../commands/CommandRegistry.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import { SvgCodec } from "../io/SvgCodec.js";
import { NodeFileGateway } from "../io/NodeFileGateway.js";
import { EditorSession } from "../app/EditorSession.js";
import { CommandRunner } from "../app/CommandRunner.js";
import { Repl } from "../cli/Repl.js";
import { readFileSync } from "node:fs";

/**
 * Process entry point — composition root.
 *
 * This is the only file that constructs the concrete adapters (`SvgCodec`,
 * `NodeFileGateway`) and wires them into the session; every other module
 * receives its collaborators. That keeps the dependency arrows pointing
 * inwards and makes the whole CLI testable with in-memory doubles.
 */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const scriptFlag = argv.indexOf("--script");
  const scriptPath = scriptFlag >= 0 ? argv[scriptFlag + 1] : undefined;

  const session = new EditorSession({
    factory: new ShapeFactory(),
    codec: new SvgCodec(),
    files: new NodeFileGateway(process.cwd()),
    registry: new CommandRegistry(),
  });
  const runner = new CommandRunner(session);
  const repl = new Repl(runner, (line) => process.stdout.write(`${line}\n`));

  if (scriptPath !== undefined) {
    let script: string;
    try {
      script = readFileSync(scriptPath, "utf8");
    } catch {
      process.stderr.write(`error: cannot read file: ${scriptPath}\n`);
      return 1;
    }
    for (const line of repl.replay(script)) {
      process.stdout.write(`${line}\n`);
    }
    return 0;
  }

  await repl.start(process.stdin, process.stdout);
  return 0;
}

/** True when this module is the process entry point (not imported by tests). */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  try {
    const self = realpathSync(fileURLToPath(import.meta.url));
    return realpathSync(resolve(entry)) === self;
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  void main().then((code) => {
    process.exitCode = code;
  });
}

/** Exported for the composition test. */
export { dirname };
