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
  'ট': 'T',
  'ঠ': 'T',
};

// Cached vocabulary length index for fast candidate filtering
let cachedVocabulary: string[] | null = null;
let vocabularyByLength: Map<number, string[]> = new Map();

function getVocabularyByLength(vocabulary: string[]): Map<number, string[]> {
  if (cachedVocabulary === vocabulary && vocabularyByLength.size > 0) {
    return vocabularyByLength;
  }
  vocabularyByLength = new Map();
  for (const word of vocabulary) {
    const len = word.length;
    let list = vocabularyByLength.get(len);
    if (!list) {
      list = [];
      vocabularyByLength.set(len, list);
    }
    list.push(word);
  }
  cachedVocabulary = vocabulary;
  return vocabularyByLength;
}

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
 * fast length-indexed candidate pooling, edit distance, and phonetic skeleton matching.
 */
export function findSuggestions(
  word: string,
  vocabulary: string[],
  maxResults = 4,
  maxDistance = 2
): string[] {
  const normalizedTarget = normalizeBengali(word.trim());
  if (!normalizedTarget) return [];
  const targetKey = bengaliPhoneticKey(normalizedTarget);
  const targetLength = normalizedTarget.length;

  const lenIndex = getVocabularyByLength(vocabulary);
  const scored: { word: string; distance: number; phoneticBonus: boolean }[] = [];

  // Only examine words within length difference of [-maxDistance..+maxDistance]
  const minLen = Math.max(1, targetLength - maxDistance);
  const maxLen = targetLength + maxDistance;

  for (let len = minLen; len <= maxLen; len++) {
    const candidates = lenIndex.get(len);
    if (!candidates) continue;

    for (let i = 0; i < candidates.length; i++) {
      const candidateNorm = candidates[i];
      if (candidateNorm === normalizedTarget) continue;

      // Fast prefix/character check to avoid running full DP on unrelated words
      const targetFirstPhonetic = targetKey[0];
      const candFirstPhonetic = PHONETIC_GROUPS[candidateNorm[0]] || candidateNorm[0];
      const firstMatches = candidateNorm[0] === normalizedTarget[0] || candFirstPhonetic === targetFirstPhonetic;
      const secondMatches = candidateNorm[1] === normalizedTarget[1];

      if (!firstMatches && !secondMatches && candidateNorm.length > 2) {
        continue;
      }

      const dist = levenshteinDistance(normalizedTarget, candidateNorm);
      const candidateKey = bengaliPhoneticKey(candidateNorm);
      const phoneticBonus = targetKey === candidateKey;

      const threshold = phoneticBonus ? maxDistance + 1 : maxDistance;

      if (dist <= threshold) {
        scored.push({ word: candidateNorm, distance: dist, phoneticBonus });
        if (dist === 1 && phoneticBonus && scored.length >= maxResults * 2) {
          break;
        }
      }
    }
  }

  // Sort by phonetic bonus first, then by lowest edit distance
  scored.sort((a, b) => {
    if (a.phoneticBonus !== b.phoneticBonus) {
      return a.phoneticBonus ? -1 : 1;
    }
    return a.distance - b.distance;
  });

  return Array.from(new Set(scored.map((item) => item.word))).slice(0, maxResults);
}

