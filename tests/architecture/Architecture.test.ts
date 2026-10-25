import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Executable architecture rules.
 *
 * The brief states these as constraints (§2.1): one class per file named after
 * the class, no procedural free functions, string-name dispatch in exactly two
 * places, and a layered dependency direction. Stating them in prose is not
 * enough — each is asserted here so a later change cannot quietly break them.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");

/** Strips block and line comments, so prose cannot satisfy or trip a rule. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Every `.ts` file under `src/`, as `[module, raw path, code]`. */
function sourceFiles(): ReadonlyArray<{ module: string; path: string; text: string }> {
  const files: Array<{ module: string; path: string; text: string }> = [];
  for (const module of readdirSync(SRC)) {
    const directory = join(SRC, module);
    if (!statSync(directory).isDirectory()) {
      continue;
    }
    for (const name of readdirSync(directory)) {
      if (!name.endsWith(".ts")) {
        continue;
      }
      const path = join(directory, name);
      files.push({ module, path, text: readFileSync(path, "utf8") });
    }
  }
  return files;
}

const FILES = sourceFiles();

/** Import specifiers of one file, resolved to a `src/` module when internal. */
function importsOf(text: string): Array<{ specifier: string; module: string | null }> {
  const result: Array<{ specifier: string; module: string | null }> = [];
  const pattern = /import[^;]*?from\s+"([^"]+)"/g;
  for (const match of text.matchAll(pattern)) {
    const specifier = match[1] as string;
    const inner = /\.\.\/([^/]+)\//.exec(specifier);
    result.push({ specifier, module: inner?.[1] ?? null });
  }
  return result;
}

/** A file's own module name (its directory under `src/`). */
function moduleOf(path: string): string {
  return relative(SRC, path).split(/[\\/]/)[0] as string;
}

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop()?.replace(/\.ts$/, "") ?? "";
}

describe("one class per file, named after the file", () => {
  it("declares at most one class per file", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const classes = [...code(file.text).matchAll(/^(?:export )?(?:abstract )?class (\w+)/gm)].map(
        (match) => match[1] as string,
      );
      if (classes.length > 1) {
        offenders.push(`${relative(SRC, file.path)}: ${classes.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("names each file after its class", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const match = /^(?:export )?(?:abstract )?class (\w+)/m.exec(code(file.text));
      if (match === null) {
        continue;
      }
      const className = match[1] as string;
      if (fileNameOf(file.path) !== className) {
        offenders.push(`${relative(SRC, file.path)} declares ${className}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("no procedural free functions", () => {
  it("declares no top-level function outside the process entry point", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      if (fileNameOf(file.path) === "main") {
        continue; // the boot file holds one call, by design
      }
      for (const match of code(file.text).matchAll(/^(?:export )?(?:async )?function (\w+)/gm)) {
        offenders.push(`${relative(SRC, file.path)}: ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("string-name dispatch happens in exactly two places", () => {
  it("switches on a tag/type name only inside ShapeFactory", () => {
    const offenders = FILES.filter(
      (file) => /\bswitch \(/.test(code(file.text)) && fileNameOf(file.path) !== "ShapeFactory",
    ).map((file) => relative(SRC, file.path));
    expect(offenders).toEqual([]);
  });

  it("never asks a shape for its class", () => {
    const offenders = FILES.filter((file) =>
      /\binstanceof (Rect|Circle|Ellipse|Line|Text|Group)\b/.test(code(file.text)),
    ).map((file) => relative(SRC, file.path));
    expect(offenders).toEqual([]);
  });
});

describe("layered dependencies", () => {
  /**
   * Module → the modules it may import. `presentation` sits directly above
   * `domain` (it renders the model), so the command layer may use it; what is
   * forbidden is a module importing something *above* it (a command importing
   * `io`, the domain importing anything, and so on).
   */
  const ALLOWED: Readonly<Record<string, readonly string[]>> = {
    shared: ["shared"],
    domain: ["domain", "shared"],
    presentation: ["presentation", "domain", "shared"],
    io: ["io", "domain", "presentation", "shared"],
    commands: ["commands", "domain", "presentation", "shared"],
    app: ["app", "commands", "domain", "io", "presentation", "shared"],
    cli: ["cli", "app", "commands", "domain", "io", "presentation", "shared"],
  };

  it("every module import points inwards", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const own = moduleOf(file.path);
      const allowed = ALLOWED[own];
      if (allowed === undefined) {
        offenders.push(`unknown module: ${own}`);
        continue;
      }
      for (const dependency of importsOf(file.text)) {
        if (dependency.module === null || allowed.includes(dependency.module)) {
          continue;
        }
        offenders.push(
          `${relative(SRC, file.path)} -> ${dependency.module} (${dependency.specifier})`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps node:fs inside the file gateway adapter", () => {
    const offenders = FILES.filter(
      (file) => /from "node:fs"/.test(file.text) && fileNameOf(file.path) !== "NodeFileGateway",
    ).map((file) => relative(SRC, file.path));
    expect(offenders).toEqual([]);
  });

  it("keeps the domain free of the file system and the terminal", () => {
    const prohibited = /from "node:(fs|readline|process|child_process|tty)"/;
    const offenders = FILES.filter(
      (file) => file.module === "domain" && prohibited.test(file.text),
    ).map((file) => relative(SRC, file.path));
    expect(offenders).toEqual([]);
  });

  it("keeps the model free of command objects", () => {
    const offenders = FILES.filter(
      (file) => file.module === "domain" && /class \w*Command\b/.test(code(file.text)),
    ).map((file) => relative(SRC, file.path));
    expect(offenders).toEqual([]);
  });
});

describe("model discipline", () => {
  it("uses no `any`", () => {
    const offenders = code(FILES.map((file) => file.text).join("\n")).match(/:\s*any\b/g) ?? [];
    expect(offenders).toEqual([]);
  });

  it("keeps geometry in cells rather than loose public fields", () => {
    const shape = FILES.find((file) => fileNameOf(file.path) === "Shape");
    expect(shape?.text).toContain("abstract geometry()");
    expect(shape?.text).toContain("NumericAttribute");
  });
});
