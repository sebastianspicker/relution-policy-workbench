/** Recognizes only a closed plist element tree and the fixed public DTD. */
import { isIgnoredXmlToken, isPermittedPlistPrologue, xmlElement } from "./plist-inspection-xml-syntax.js";

export function isPlistDocument(tokens: string[]): boolean {
  const elements: string[] = [];
  let sawRoot = false;
  for (const token of tokens) {
    if (isIgnoredXmlToken(token)) continue;
    if (isPermittedPlistPrologue(token) && !sawRoot && elements.length === 0) continue;
    const element = xmlElement(token);
    if (element === undefined || (elements.length === 0 && element.name !== "plist") || sawRoot) return false;
    if (element.closes) {
      if (elements.pop() !== element.name) return false;
      if (elements.length === 0) sawRoot = true;
      continue;
    }
    if (element.selfClosing) {
      if (elements.length === 0) return false;
      continue;
    }
    elements.push(element.name);
  }
  return sawRoot && elements.length === 0;
}
