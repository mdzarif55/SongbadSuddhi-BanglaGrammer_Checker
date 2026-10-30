import { describe, it, expect } from 'vitest';
import {
  normalizeBengali,
  sanitizeZeroWidthChars,
  normalizeTypography,
  tokenizeBengaliWords,
} from '@/lib/dictionary/normalize';
import {
  levenshteinDistance,
  bengaliPhoneticKey,
  findSuggestions,
} from '@/lib/dictionary/suggestions';
import { bengaliDictionary } from '@/lib/dictionary';

describe('Bengali Normalization & Typography', () => {
  it('normalizes decomposed Unicode characters to canonical NFC', () => {
    // Composed 'ড়' vs decomposed 'ড' + nukta
    const decomposed = '\u09A1\u09BC';
    const precomposed = 'ড়';
    expect(normalizeBengali(decomposed)).toBe(precomposed);
  });

  it('cleans isolated zero-width characters', () => {
    const textWithZwsp = 'বাংলাদেশ\u200B ব্যাংক';
    expect(sanitizeZeroWidthChars(textWithZwsp)).toBe('বাংলাদেশ ব্যাংক');
  });

  it('normalizes spaces before Dari and ensures space after Dari', () => {
    const input = 'অনুষ্ঠান সমাপ্ত হয়েছে ।পরবর্তী কার্যক্রম শুরু হবে।';
    const expected = normalizeBengali('অনুষ্ঠান সমাপ্ত হয়েছে। পরবর্তী কার্যক্রম শুরু হবে।');
    expect(normalizeTypography(input)).toBe(expected);
  });

  it('tokenizes Bengali words with character offsets', () => {
    const text = 'সচিবালয়ে বৈঠক হয়েছে।';
    const tokens = tokenizeBengaliWords(text);
    expect(tokens.length).toBe(3);
    expect(tokens[0].word).toBe(normalizeBengali('সচিবালয়ে'));
    expect(tokens[0].start).toBe(0);
    expect(tokens[1].word).toBe(normalizeBengali('বৈঠক'));
  });
});

describe('Bengali Suggestion Engine', () => {
  it('calculates correct Levenshtein distance for Bengali strings', () => {
    expect(levenshteinDistance('তৈরি', 'তৈরী')).toBe(1);
    expect(levenshteinDistance('পুরস্কার', 'পুরষ্কার')).toBe(1);
    expect(levenshteinDistance('বাংলাদেশ', 'বাংলাদেশ')).toBe(0);
  });

  it('matches phonetic keys across shibilants and vowel lengths', () => {
    expect(bengaliPhoneticKey('তৈরি')).toBe(bengaliPhoneticKey('তৈরী'));
    expect(bengaliPhoneticKey('পুরস্কার')).toBe(bengaliPhoneticKey('পুরষ্কার'));
  });

  it('finds phonetic candidate suggestions for misspellings', () => {
    const vocabulary = ['তৈরি', 'সরকারি', 'পুরস্কার', 'দায়িত্ব', 'মুহূর্ত'];
    const suggestions = findSuggestions('তৈরী', vocabulary);
    expect(suggestions).toContain('তৈরি');

    const purashkarSuggestions = findSuggestions('পুরষ্কার', vocabulary);
    expect(purashkarSuggestions).toContain('পুরস্কার');
  });
});

describe('Bengali Dictionary Engine & Rule Checks', () => {
  it('protects prominent Bangladesh entities and constitutional posts', () => {
    expect(bengaliDictionary.isProtectedEntity('বাংলাদেশ')).toBe(true);
    expect(bengaliDictionary.isProtectedEntity('সচিবালয়')).toBe(true);
    expect(bengaliDictionary.isProtectedEntity('হাইকোর্ট')).toBe(true);
  });

  it('correctly flags known journalistic misspellings', () => {
    const tEntry = bengaliDictionary.lookupMisspelling('তৈরী');
    expect(tEntry).not.toBeNull();
    expect(tEntry?.correct).toBe('তৈরি');

    const sEntry = bengaliDictionary.lookupMisspelling('সরকারী');
    expect(sEntry).not.toBeNull();
    expect(sEntry?.correct).toBe('সরকারি');

    const bEntry = bengaliDictionary.lookupMisspelling('ব্যকরণ');
    expect(bEntry?.correct).toBe('ব্যাকরণ');

    const bereEntry = bengaliDictionary.lookupMisspelling('বেরে');
    expect(bereEntry).not.toBeNull();
    expect(bereEntry?.correct).toBe('বেড়ে');
  });

  it('detects double plural redundancy rules', () => {
    const sample = 'সব কর্মকর্তারা বৈঠকে উপস্থিত ছিলেন।';
    const issues = bengaliDictionary.scanTextForRuleIssues(sample);
    const doublePlural = issues.find((i) => i.ruleId === 'double_plural');
    expect(doublePlural).toBeDefined();
    expect(doublePlural?.originalText).toBe('সব কর্মকর্তারা');
  });

  it('detects space before Bengali Dari', () => {
    const sample = 'বৈঠক শেষ হয়েছে ।';
    const issues = bengaliDictionary.scanTextForRuleIssues(sample);
    const spaceIssue = issues.find((i) => i.ruleId === 'space_before_dari');
    expect(spaceIssue).toBeDefined();
  });
});

