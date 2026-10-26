/**
 * Bengali Text & Unicode Normalization Module
 * Adheres to Unicode NFC canonical composition and Bengali newspaper typographic conventions.
 */

// Zero-width characters
const ZWJ = '\u200D';
const ZWNJ = '\u200C';

/**
 * Normalizes Bengali Unicode text into NFC format
 * Ensures decomposed diacritics (like nukta combinations with ড, ঢ, য)
 * are canonicalized to single precomposed characters (ড়, ঢ়, য়).
 */
export function normalizeBengali(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    .replace(/\u09A1\u09BC/g, '\u09DC') // ড + nukta -> ড়
    .replace(/\u09A2\u09BC/g, '\u09DD') // ঢ + nukta -> ঢ়
    .replace(/\u09AF\u09BC/g, '\u09DF'); // য + nukta -> য়
}

/**
 * Cleans isolated zero-width characters often inserted inadvertently by Bengali keyboard layouts,
 * while preserving legitimate conjuncts.
 */
export function sanitizeZeroWidthChars(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u200B+/g, '') // Zero-width space
    .replace(/\uFEFF/g, '') // Zero-width no-break space (BOM)
    .replace(/\u200C{2,}/g, ZWNJ)
    .replace(/\u200D{2,}/g, ZWJ);
}

/**
 * Normalizes punctuation and spacing for standard Bengali news typography.
 * - Replaces space before Dari with no space
 * - Ensures space after Dari when followed by a letter
 * - Preserves line breaks and formatting
 */
export function normalizeTypography(text: string): string {
  if (!text) return '';
  let normalized = normalizeBengali(text);

  // Remove space immediately preceding Bengali Dari (।) or comma (,)
  normalized = normalized.replace(/\s+([।,;!?])/g, '$1');

  // Ensure a space after Dari if immediately followed by a Bengali character
  normalized = normalized.replace(/([।!?])([\u0980-\u09FF])/g, '$1 $2');

  return normalized;
}

/**
 * Extracts distinct Bengali words (tokens) stripping punctuation and symbols.
 */
export function tokenizeBengaliWords(text: string): { word: string; start: number; end: number }[] {
  if (!text) return [];
  const normalized = normalizeBengali(text);
  const regex = /[\u0980-\u09FF]+/g;
  const tokens: { word: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    tokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}
