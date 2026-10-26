/**
 * Bengali Candidate Spelling & Suggestion Engine
 * Calculates grapheme-aware edit distances and phonetically similar candidates.
 */

import { normalizeBengali } from './normalize';

// Bengali phonetic substitution groups
const PHONETIC_GROUPS: Record<string, string> = {
  'শ': 'S',
  'ষ': 'S',
  'স': 'S',
  'ণ': 'N',
  'ন': 'N',
  'র': 'R',
  'ড়': 'R',
  'ঢ়': 'R',
  'ই': 'I',
  'ঈ': 'I',
  'ি': 'I',
  'ী': 'I',
  'উ': 'U',
  'ঊ': 'U',
  'ু': 'U',
  'ূ': 'U',
  'ং': 'M',
  'ঙ': 'M',
  'ঁ': 'M',
  'জ': 'J',
  'য': 'J',
};

/**
 * Encodes a Bengali word into a rough phonetic skeleton
 * to match orthographically confused pairs (e.g. তৈরি vs তৈরী, পুরষ্কার vs পুরস্কার)
 */
export function bengaliPhoneticKey(word: string): string {
  const norm = normalizeBengali(word);
  let key = '';
  for (const char of norm) {
    key += PHONETIC_GROUPS[char] || char;
  }
  return key;
}

/**
 * Standard Levenshtein Distance for Unicode strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const aNorm = normalizeBengali(a);
  const bNorm = normalizeBengali(b);

  const aChars = Array.from(aNorm);
  const bChars = Array.from(bNorm);

  const dp: number[][] = Array.from({ length: aChars.length + 1 }, () =>
    new Array(bChars.length + 1).fill(0)
  );

  for (let i = 0; i <= aChars.length; i++) dp[i][0] = i;
  for (let j = 0; j <= bChars.length; j++) dp[0][j] = j;

  for (let i = 1; i <= aChars.length; i++) {
    for (let j = 1; j <= bChars.length; j++) {
      const cost = aChars[i - 1] === bChars[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[aChars.length][bChars.length];
}

/**
 * Find candidate suggestions from a target vocabulary list based on
 * edit distance and phonetic skeleton matching.
 */
export function findSuggestions(
  word: string,
  vocabulary: string[],
  maxResults = 4,
  maxDistance = 2
): string[] {
  const normalizedTarget = normalizeBengali(word);
  const targetKey = bengaliPhoneticKey(normalizedTarget);

  const scored: { word: string; distance: number; phoneticBonus: boolean }[] = [];

  for (const candidate of vocabulary) {
    const candidateNorm = normalizeBengali(candidate);
    if (candidateNorm === normalizedTarget) continue;

    const dist = levenshteinDistance(normalizedTarget, candidateNorm);
    const candidateKey = bengaliPhoneticKey(candidateNorm);
    const phoneticBonus = targetKey === candidateKey;

    // Allow slightly higher distance if phonetically identical
    const threshold = phoneticBonus ? maxDistance + 1 : maxDistance;

    if (dist <= threshold) {
      scored.push({ word: candidateNorm, distance: dist, phoneticBonus });
    }
  }

  // Sort by phonetic bonus first, then by lowest edit distance
  scored.sort((a, b) => {
    if (a.phoneticBonus !== b.phoneticBonus) {
      return a.phoneticBonus ? -1 : 1;
    }
    return a.distance - b.distance;
  });

  return scored.slice(0, maxResults).map((item) => item.word);
}
