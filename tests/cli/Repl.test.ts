import { describe, expect, it } from "vitest";
import { Repl } from "../../src/cli/Repl.js";
import type { LineSource } from "../../src/cli/LineSource.js";
import { CommandRegistry } from "../../src/commands/CommandRegistry.js";
import { ShapeFactory } from "../../src/domain/ShapeFactory.js";
import { SvgCodec } from "../../src/io/SvgCodec.js";
import { EditorSession } from "../../src/app/EditorSession.js";
import { CommandRunner } from "../../src/app/CommandRunner.js";
import { FakeFileGateway } from "../support/TestEditor.js";

/** A scripted line source: covers the interactive loop without a terminal. */
class StubLineSource implements LineSource {
  #prompts = 0;

  constructor(private readonly script: readonly string[]) {}

  prompt(): void {
    this.#prompts += 1;
  }

  async *lines(): AsyncIterable<string> {
    for (const line of this.script) {
      yield line;
    }
  }

  get prompts(): number {
    return this.#prompts;
  }
}

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

describe("Repl.start (interactive loop)", () => {
  it("prints the banner, then one prompt before each line and after the last", async () => {
    const { repl, printed } = makeRepl();
    const source = new StubLineSource(["init 10 10", "create rect r1 0 0 1 1", "tree"]);

    await repl.start(source);

    expect(printed).toEqual([
      Repl.BANNER,
      "",
      "canvas 10x10 created",
      "rect#r1 created",
      "svg (10x10)",
      "└── rect#r1  x=0 y=0 w=1 h=1",
    ]);
    expect(source.prompts).toBe(4);
  });

  it("keeps going after a failing line, in a terminal as in a script", async () => {
    const { repl, printed } = makeRepl();
    const source = new StubLineSource(["init", "move r9 1 1", "create rect r1 0 0 1 1", ""]);

    await repl.start(source);

    expect(printed).toContain("error: no such shape: r9");
    expect(printed).toContain("rect#r1 created");
  });

  it("runs a line at a time, so state carries across prompts", async () => {
    const { repl, printed, files } = makeRepl();
    const source = new StubLineSource(["init", "create rect r1 0 0 1 1", "save out.svg"]);

    await repl.start(source);

    expect(files.files.has("out.svg")).toBe(true);
    expect(printed.at(-1)).toBe("saved to out.svg (1 elements)");
  });
});
