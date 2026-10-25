import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FileGateway } from "../shared/FileGateway.js";

/**
 * `node:fs` adapter for the `FileGateway` port.
 *
 * This class is the only place in the project that touches the file system; the
 * command layer depends on the interface, which is what lets the tests run the
 * whole CLI against an in-memory gateway.
 */
export class NodeFileGateway implements FileGateway {
  constructor(private readonly baseDirectory: string) {}

  readText(path: string, encoding: "utf8"): string {
    return readFileSync(this.resolve(path), encoding);
  }

  writeText(path: string, text: string, encoding: "utf8"): void {
    writeFileSync(this.resolve(path), text, encoding);
  }

  resolve(path: string): string {
    return resolve(this.baseDirectory, path);
  }
}
