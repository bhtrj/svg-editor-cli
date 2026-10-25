import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompositionRoot } from "../../src/cli/CompositionRoot.js";

/**
 * Covers the `--script` branch of the composition root, which is the only path
 * that ends without an interactive terminal.
 */
describe("CompositionRoot.run --script", () => {
  const temporary: string[] = [];

  function tempDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), "svg-editor-"));
    temporary.push(directory);
    return directory;
  }

  afterEach(() => {
    for (const directory of temporary.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("replays a script file and returns 0", async () => {
    const directory = tempDirectory();
    const script = join(directory, "session.cli");
    writeFileSync(script, "init 100 100\ncreate rect r1 0 0 10 10\ntree\n", "utf8");

    const written: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    try {
      await expect(CompositionRoot.run(["--script", script])).resolves.toBe(0);
    } finally {
      spy.mockRestore();
    }

    const output = written.join("");
    expect(output).toContain("canvas 100x100 created");
    expect(output).toContain("└── rect#r1  x=0 y=0 w=10 h=10");
  });

  it("reports a missing script and returns 1", async () => {
    const missing = join(tempDirectory(), "nope.cli");

    const errors: string[] = [];
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      errors.push(String(chunk));
      return true;
    });
    try {
      await expect(CompositionRoot.run(["--script", missing])).resolves.toBe(1);
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }

    expect(errors.join("")).toBe(`error: cannot read file: ${missing}\n`);
  });

  it("saves through the real gateway when the script says so", async () => {
    const directory = tempDirectory();
    const script = join(directory, "save.cli");
    const target = join(directory, "out.svg");
    writeFileSync(
      script,
      `init 200 100\ncreate circle c1 10 20 5 red\nsave ${target}\n`,
      "utf8",
    );

    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(CompositionRoot.run(["--script", script])).resolves.toBe(0);
    } finally {
      spy.mockRestore();
    }

    const saved = readFileSync(target, "utf8");
    expect(saved).toContain('width="200" height="100"');
    expect(saved).toContain('<circle id="c1" cx="10" cy="20" r="5" fill="red"/>');
  });
});
