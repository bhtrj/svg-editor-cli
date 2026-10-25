import { describe, expect, it } from "vitest";
import { Repl } from "../../src/cli/Repl.js";
import { CommandRegistry } from "../../src/commands/CommandRegistry.js";
import { ShapeFactory } from "../../src/domain/ShapeFactory.js";
import { SvgCodec } from "../../src/io/SvgCodec.js";
import { EditorSession } from "../../src/app/EditorSession.js";
import { CommandRunner } from "../../src/app/CommandRunner.js";
import { FakeFileGateway } from "../support/TestEditor.js";

/** Builds the real REPL around an in-memory file system. */
function makeRepl(): { repl: Repl; files: FakeFileGateway; printed: string[] } {
  const files = new FakeFileGateway();
  const session = new EditorSession({
    factory: new ShapeFactory(),
    codec: new SvgCodec(),
    files,
    registry: new CommandRegistry(),
  });
  const printed: string[] = [];
  const repl = new Repl(new CommandRunner(session), (line) => printed.push(line));
  return { repl, files, printed };
}

describe("Repl.replay", () => {
  it("runs a script and returns every output line", () => {
    const { repl } = makeRepl();
    const output = repl.replay("init 100 100\ncreate rect r1 0 0 10 10\ntree\n");
    expect(output).toEqual([
      "canvas 100x100 created",
      "rect#r1 created",
      "svg (100x100)",
      "└── rect#r1  x=0 y=0 w=10 h=10",
    ]);
  });

  it("skips blank lines and comments without printing anything", () => {
    const { repl } = makeRepl();
    expect(repl.replay("# setup\n\ninit\n\n# done\n")).toEqual(["canvas 800x600 created"]);
  });

  it("turns EditorError into a single error: line", () => {
    const { repl } = makeRepl();
    expect(repl.replay("tree")).toEqual(["error: no document. use 'init' or 'read' first"]);
  });

  it("keeps a failing line from stopping the script", () => {
    const { repl } = makeRepl();
    const output = repl.replay("init\nbogus\ncreate rect r1 0 0 1 1\n");
    expect(output).toEqual([
      "canvas 800x600 created",
      "error: unknown command: bogus",
      "rect#r1 created",
    ]);
  });

  it("handles CRLF script files", () => {
    const { repl } = makeRepl();
    expect(repl.replay("init 10 20\r\ncanvas\r\n")).toEqual([
      "canvas 10x20 created",
      "canvas 10x20",
    ]);
  });

  it("writes files through the injected gateway", () => {
    const { repl, files } = makeRepl();
    repl.replay("init\ncreate rect r1 0 0 1 1\nsave out.svg\n");
    expect(files.files.has("out.svg")).toBe(true);
    expect(files.files.get("out.svg")).toContain('<rect id="r1"');
  });
});

describe("banner", () => {
  it("matches the documented start-up line", () => {
    expect(Repl.BANNER).toBe("svg-editor 0.1 — type 'help' for commands");
  });
});
