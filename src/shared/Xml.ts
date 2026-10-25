/** Escapes a string that becomes the text content of an XML element. */
export function escapeXmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes a string that becomes an XML attribute value. */
export function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replace(/"/g, "&quot;");
}
