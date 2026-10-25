/**
 * One token of a REPL line.
 *
 * `quoted` records whether the token was written inside double quotes, which is
 * how `create ... in <container>` tells a clause from a text argument that
 * happens to read `"in"`.
 */
export interface Token {
  readonly text: string;
  readonly quoted: boolean;
}
