/**
 * XML escaping for the SVG writer.
 *
 * A stateless utility class so that the escaping rules live behind a name
 * (`Xml`) instead of as two loose procedures.
 */
export class Xml {
  /** Escapes a string that becomes the text content of an XML element. */
  static escapeText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** Escapes a string that becomes an XML attribute value. */
  static escapeAttribute(value: string): string {
    return Xml.escapeText(value).replace(/"/g, "&quot;");
  }
}
